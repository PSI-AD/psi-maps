/**
 * PSI Maps – UI Validation Test
 *
 * Detects:
 *  - Non-clickable elements (pointer-events: none)
 *  - Elements blocked by overlays / z-index stacking
 *  - Missing ARIA labels on interactive elements
 *  - Broken images / 404 resources
 *
 * Run:
 *   node ./node_modules/.bin/playwright test playwright/tests/ui-validation.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  createSession,
  attachNetworkLogger,
  attachConsoleLogger,
  screenshotAction,
} from '../helpers';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('PSI Maps – UI Validation', () => {
  test('Detect blocked elements and overlay issues', async ({ page }) => {
    const session = createSession();
    attachNetworkLogger(page, session);
    attachConsoleLogger(page, session);

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // let map tiles settle

    // ── 1. Detect non-clickable interactive elements ──────────
    const blockedElements = await page.evaluate(() => {
      const interactives = Array.from(
        document.querySelectorAll<HTMLElement>('button, a, [role="button"], input, select, textarea')
      );
      return interactives
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.pointerEvents === 'none' || style.visibility === 'hidden' || style.display === 'none';
        })
        .map(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className?.toString().slice(0, 60),
          text: el.textContent?.trim().slice(0, 40),
          issue: window.getComputedStyle(el).pointerEvents === 'none'
            ? 'pointer-events: none'
            : window.getComputedStyle(el).visibility === 'hidden'
              ? 'visibility: hidden'
              : 'display: none',
        }));
    });

    console.log(`\n[UI VALIDATION] Non-clickable interactive elements: ${blockedElements.length}`);
    blockedElements.forEach(el => {
      console.log(`  • ${el.tag}${el.id ? '#' + el.id : ''} — ${el.issue} — "${el.text}"`);
    });

    // ── 2. Detect z-index overlay conflicts ──────────────────
    const overlayConflicts = await page.evaluate(() => {
      const results: { x: number; y: number; expected: string; actual: string }[] = [];
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]')).slice(0, 20);
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(cx, cy) as HTMLElement;
        if (topEl && !btn.contains(topEl) && !topEl.contains(btn)) {
          results.push({
            x: Math.round(cx), y: Math.round(cy),
            expected: btn.tagName + (btn.id ? '#' + btn.id : ''),
            actual: topEl.tagName + (topEl.id ? '#' + topEl.id : ''),
          });
        }
      });
      return results;
    });

    console.log(`\n[UI VALIDATION] Overlay conflicts: ${overlayConflicts.length}`);
    overlayConflicts.forEach(c => {
      console.log(`  • (${c.x},${c.y}) expected ${c.expected} but got ${c.actual}`);
    });

    // ── 3. Detect missing ARIA labels ─────────────────────────
    const missingAria = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], input'))
        .filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.textContent?.trim())
        .map(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className?.toString().slice(0, 40),
        }));
    });

    console.log(`\n[UI VALIDATION] Interactive elements missing ARIA label + text: ${missingAria.length}`);

    // ── 4. Check for 404 / failed resources ──────────────────
    const failed = session.networkLog.filter(e => e.type === 'failed');
    const notFound = session.networkLog.filter(e => e.type === 'response' && e.status === 404);

    console.log(`\n[UI VALIDATION] Failed network requests: ${failed.length}`);
    failed.forEach(e => console.log(`  • FAIL ${e.url}`));
    console.log(`[UI VALIDATION] 404 responses: ${notFound.length}`);
    notFound.forEach(e => console.log(`  • 404 ${e.url}`));

    await screenshotAction(page, session, 'ui-validation-final');

    // ── Assertions ────────────────────────────────────────────
    expect(overlayConflicts.length, 'Overlay conflicts found').toBeLessThan(3);
    expect(notFound.length, '404 resources found').toBeLessThan(5);
  });
});
