/**
 * PSI Maps – Full User Journey Test
 *
 * Simulates a real user visiting the app, interacting with the map,
 * navigating between panels, and submitting a search/filter form.
 *
 * Run:
 *   node ./node_modules/.bin/playwright test playwright/tests/user-journey.spec.ts
 *
 * Debug (headed, slowMo, full trace):
 *   DEBUG_MODE=true node ./node_modules/.bin/playwright test playwright/tests/user-journey.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  createSession,
  attachNetworkLogger,
  attachConsoleLogger,
  attachScrollTracker,
  attachInteractionTracker,
  screenshotAction,
  captureSnapshot,
  finalizeSession,
} from '../helpers';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('PSI Maps – Full User Journey', () => {
  test('Homepage loads, map renders, sidebar interacts', async ({ page }) => {
    const session = createSession();
    attachNetworkLogger(page, session);
    attachConsoleLogger(page, session);

    // ── 1. Navigate to app ─────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await attachScrollTracker(page);
    await attachInteractionTracker(page);

    await screenshotAction(page, session, '01-homepage-load');
    await captureSnapshot(page, session, '01-homepage-load');

    // ── 2. Wait for map canvas ─────────────────────────────────
    const mapCanvas = page.locator('canvas').first();
    await expect(mapCanvas).toBeVisible({ timeout: 20_000 });
    console.log('[CHECK] Map canvas is visible');
    await screenshotAction(page, session, '02-map-canvas-visible');

    // ── 3. Check for blocking overlays ────────────────────────
    const overlayCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { blocked: true, reason: 'No canvas found' };
      const rect = canvas.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const topEl = document.elementFromPoint(center.x, center.y);
      const isCanvas = topEl === canvas || canvas.contains(topEl);
      return {
        blocked: !isCanvas,
        topElement: topEl?.tagName + '#' + (topEl as HTMLElement)?.id,
      };
    });
    console.log('[OVERLAY CHECK]', JSON.stringify(overlayCheck));

    // ── 4. Scroll the page ─────────────────────────────────────
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -300);

    // ── 5. Try clicking sidebar / panel elements ──────────────
    const sidebarBtns = page.locator('[class*="sidebar"], [class*="panel"], [class*="filter"]').first();
    const hasSidebar = await sidebarBtns.count() > 0;
    if (hasSidebar) {
      await sidebarBtns.click({ force: true });
      await page.waitForTimeout(600);
      await screenshotAction(page, session, '03-sidebar-clicked');
    }

    // ── 6. Search / filter form interaction ──────────────────
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    const hasSearch = await searchInput.count() > 0;
    if (hasSearch) {
      await searchInput.click();
      await searchInput.fill('Dubai Marina');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await screenshotAction(page, session, '04-search-result');
    }

    // ── 7. Validate no JS errors ──────────────────────────────
    const errors = session.consoleLog.filter(e => e.type === 'pageerror' || e.type === 'error');
    if (errors.length > 0) {
      console.warn(`[WARN] ${errors.length} browser error(s) detected:`);
      errors.forEach(e => console.warn(' •', e.text.split('\n')[0]));
    }

    // ── 8. Finalize session ───────────────────────────────────
    const report = await finalizeSession(page, session, 'user-journey');
    console.log('\n═══ SESSION SUMMARY ═══');
    console.log(`Performance (FCP): ${report.performance?.firstContentfulPaint?.toFixed(0)}ms`);
    console.log(`Performance (TTFB): ${report.performance?.ttfb?.toFixed(0)}ms`);
    console.log(`Network requests: ${report.networkTotal}`);
    console.log(`Network failures: ${report.networkFailed.length}`);
    console.log(`Console errors: ${report.consoleErrors.length}`);
    console.log(`Screenshots: ${report.screenshots.length}`);
    console.log('═══════════════════════\n');

    // ── Soft assertions (don't fail run, just warn) ──────────
    expect(report.consoleErrors.length).toBeLessThan(5);
  });
});
