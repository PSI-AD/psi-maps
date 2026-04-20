/**
 * PSI Maps – Debug Session Script
 *
 * Runs a single, manual debug session with:
 *  - Headed Chromium (visible browser)
 *  - SlowMo (600ms between actions)
 *  - Full tracing (trace + video + screenshots)
 *  - Step-by-step console feedback
 *
 * Usage:
 *   node ./node_modules/.bin/playwright test playwright/tests/debug-session.spec.ts --headed
 *   -- or --
 *   DEBUG_MODE=true node ./node_modules/.bin/playwright test playwright/tests/debug-session.spec.ts
 *
 * After running, view trace:
 *   node ./node_modules/.bin/playwright show-trace playwright-results/traces/trace-debug-<timestamp>.zip
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import {
  createSession,
  attachNetworkLogger,
  attachConsoleLogger,
  attachScrollTracker,
  attachInteractionTracker,
  screenshotAction,
  captureSnapshot,
  getScrollLog,
  getInteractionLog,
  finalizeSession,
} from '../helpers';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const TRACE_DIR = path.resolve('./playwright-results/traces');

test.describe('PSI Maps – Debug Session', () => {
  test('Step-by-step debug walkthrough', async ({ browser }) => {
    // Launch with full debug config
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: path.resolve('./playwright-results/videos'), size: { width: 1440, height: 900 } },
    });

    // Start trace
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
      title: 'PSI Maps Debug Session',
    });

    const page = await context.newPage();
    const session = createSession();

    attachNetworkLogger(page, session);
    attachConsoleLogger(page, session);

    // ── STEP 1: Load app ──────────────────────────────────────
    console.log('\n━━━ STEP 1: Loading app ━━━');
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await attachScrollTracker(page);
    await attachInteractionTracker(page);
    await screenshotAction(page, session, 'step-01-load');
    await page.waitForTimeout(1000);

    // ── STEP 2: Wait for map ─────────────────────────────────
    console.log('\n━━━ STEP 2: Waiting for map canvas ━━━');
    try {
      await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 15_000 });
      console.log('[✓] Map canvas detected');
    } catch {
      console.warn('[✗] Map canvas not found within 15s');
    }
    await screenshotAction(page, session, 'step-02-map');

    // ── STEP 3: Scroll exploration ───────────────────────────
    console.log('\n━━━ STEP 3: Scroll exploration ━━━');
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(500);
    const scrollLog = await getScrollLog(page);
    console.log(`[SCROLL] Events captured: ${scrollLog.length}`);
    await screenshotAction(page, session, 'step-03-after-scroll');

    // ── STEP 4: Click interactive elements ───────────────────
    console.log('\n━━━ STEP 4: Clicking interactive elements ━━━');
    const clickTargets = [
      'button',
      '[class*="btn"]',
      '[class*="icon"]',
      '[role="button"]',
    ];
    for (const selector of clickTargets) {
      const els = await page.locator(selector).all();
      if (els.length > 0) {
        try {
          await els[0].click({ force: true, timeout: 3000 });
          await page.waitForTimeout(600);
          console.log(`[CLICK] ${selector} — OK`);
        } catch {
          console.log(`[CLICK] ${selector} — skipped`);
        }
      }
    }
    await screenshotAction(page, session, 'step-04-after-clicks');

    // ── STEP 5: Form interaction ─────────────────────────────
    console.log('\n━━━ STEP 5: Form / input interaction ━━━');
    const inputs = await page.locator('input').all();
    console.log(`[FORMS] Found ${inputs.length} input(s)`);
    if (inputs.length > 0) {
      try {
        await inputs[0].click({ timeout: 3000 });
        await inputs[0].fill('test query');
        await page.waitForTimeout(500);
        await page.keyboard.press('Escape');
        console.log('[FORMS] Input interaction OK');
      } catch {
        console.log('[FORMS] Input interaction skipped');
      }
    }
    await screenshotAction(page, session, 'step-05-forms');

    // ── STEP 6: Capture interaction log ─────────────────────
    const interactionLog = await getInteractionLog(page);
    console.log(`\n[INTERACTIONS] Total events: ${interactionLog.length}`);

    // ── STEP 7: Final DOM snapshot ───────────────────────────
    console.log('\n━━━ STEP 7: DOM snapshot ━━━');
    await captureSnapshot(page, session, 'final-state');

    // ── STEP 8: Finalize ─────────────────────────────────────
    const report = await finalizeSession(page, session, 'debug-session');
    console.log('\n═══ DEBUG REPORT ═══');
    console.log(JSON.stringify(report, null, 2));

    // ── Save trace ────────────────────────────────────────────
    const tracePath = path.join(TRACE_DIR, `trace-debug-${Date.now()}.zip`);
    await context.tracing.stop({ path: tracePath });
    console.log(`\n[TRACE] Saved to: ${tracePath}`);
    console.log(`[TRACE] View with: node ./node_modules/.bin/playwright show-trace ${tracePath}`);

    await context.close();
  });
});
