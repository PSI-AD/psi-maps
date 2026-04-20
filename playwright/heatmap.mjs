/**
 * PSI Maps — Click Heatmap Analyzer
 * ════════════════════════════════════════════════════════════
 *
 * Divides the viewport into a configurable grid, probes each cell with:
 *   • elementFromPoint  → which element sits on top
 *   • pointer-events    → 'none' / normal
 *   • z-index stack     → all elements at that point (top-3)
 *   • click simulation  → does the browser fire a click event?
 *   • blocking check    → is a transparent / invisible layer intercepting?
 *
 * Outputs:
 *   1. playwright-results/heatmap/heatmap-report-<ts>.json
 *   2. playwright-results/heatmap/heatmap-overlay-<ts>.png  (screenshot + colored grid overlay drawn via CDP/canvas)
 *   3. playwright-results/heatmap/heatmap-viewer-<ts>.html  (interactive viewer)
 *
 * Usage:
 *   node playwright/heatmap.mjs [options]
 *
 * Options:
 *   --url <url>          Base URL            (default: http://localhost:3000)
 *   --path <route>       Route to append     (e.g. /map  →  navigates to BASE_URL/map)
 *   --cols <n>           Grid columns        (default: 20)
 *   --rows <n>           Grid rows           (default: 20)
 *   --viewport <WxH>     Viewport size       (default: 1440x900)
 *   --wait <ms>          Wait after load     (default: 4000)
 *   --wait-for <sel>     Wait for CSS selector to appear before scanning
 *                        (e.g. --wait-for canvas  --wait-for .mapboxgl-canvas)
 *   --close-overlays     Try to dismiss any open modal / panel before scanning
 *   --pause              Pause 8 s after load so you can manually set the page state
 *   --headed             Run in headed mode (default: headless)
 *   --mobile             Simulate iPhone 13 Pro (390×844)
 *   --debug              Verbose per-cell logging
 *
 * Examples:
 *   # Scan the map page and wait for canvas
 *   node playwright/heatmap.mjs --path / --wait-for canvas --close-overlays
 *
 *   # Scan admin dashboard
 *   node playwright/heatmap.mjs --url http://localhost:3000 --path /admin
 *
 *   # Mobile with manual setup
 *   node playwright/heatmap.mjs --mobile --headed --pause
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── CLI parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag  = (name)        => args.includes(name);
const param = (name, def)   => { const i = args.indexOf(name); return i !== -1 && args[i+1] ? args[i+1] : def; };

const BASE_URL        = param('--url',          process.env.BASE_URL ?? 'http://localhost:3000');
const ROUTE_PATH      = param('--path',         '/');
const GRID_COLS       = parseInt(param('--cols',    '20'), 10);
const GRID_ROWS       = parseInt(param('--rows',    '20'), 10);
const WAIT_MS         = parseInt(param('--wait',    '4000'), 10);
const WAIT_FOR_SEL    = param('--wait-for',     '');
const CLOSE_OVERLAYS  = flag('--close-overlays');
const RESET_STATE     = flag('--reset-state');   // wipe localStorage before load (prevents restored admin/panel state)
const PAUSE_MODE      = flag('--pause');
const IS_HEADED       = flag('--headed') || process.env.DEBUG_MODE === 'true';
const IS_MOBILE       = flag('--mobile');
const IS_DEBUG        = flag('--debug');
const VIEWPORT_STR    = param('--viewport', IS_MOBILE ? '390x844' : '1440x900');
const [VP_W, VP_H]    = VIEWPORT_STR.split('x').map(Number);

// Build the full target URL (strip trailing slash from base, ensure leading slash on path)
const normalizedBase = BASE_URL.replace(/\/$/, '');
const normalizedPath = ROUTE_PATH.startsWith('/') ? ROUTE_PATH : '/' + ROUTE_PATH;
const TARGET_URL     = normalizedPath === '/' ? normalizedBase + '/' : normalizedBase + normalizedPath;

// ─── Dirs ─────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const OUT_DIR   = path.join(ROOT, 'playwright-results', 'heatmap');
fs.mkdirSync(OUT_DIR, { recursive: true });

const TS         = Date.now();
const JSON_PATH  = path.join(OUT_DIR, `heatmap-report-${TS}.json`);
const PNG_PATH   = path.join(OUT_DIR, `heatmap-overlay-${TS}.png`);
const HTML_PATH  = path.join(OUT_DIR, `heatmap-viewer-${TS}.html`);

// ─── Banner ───────────────────────────────────────────────────────────────────
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║       PSI MAPS — CLICK HEATMAP ANALYZER                  ║');
console.log(`║  URL:  ${TARGET_URL.padEnd(52)}║`);
console.log(`║  Grid: ${String(GRID_COLS + '×' + GRID_ROWS).padEnd(10)}  Viewport: ${String(VP_W + '×' + VP_H).padEnd(34)}║`);
if (WAIT_FOR_SEL)   console.log(`║  ⏳ Wait for: ${WAIT_FOR_SEL.padEnd(47)}║`);
if (CLOSE_OVERLAYS) console.log('║  🧹 Auto-close overlays: ON                               ║');
if (RESET_STATE)    console.log('║  🔄 Reset localStorage: ON (fresh session)                ║');
if (PAUSE_MODE)     console.log('║  ⏸  Pause mode: 8s manual setup window                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// ─── Launch ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: !IS_HEADED,
  args: ['--disable-web-security', '--no-sandbox', '--disable-features=VizDisplayCompositor'],
});

const context = await browser.newContext({
  viewport:    { width: VP_W, height: VP_H },
  userAgent:   IS_MOBILE
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    : undefined,
});

const page = await context.newPage();

// ─── Navigate ─────────────────────────────────────────────────────────────────

// ── Optional: reset all localStorage state before load ──────────────────────
// This prevents the app restoring last-session state (e.g. admin panel open)
if (RESET_STATE) {
  console.log('🔄 Wiping localStorage before navigation (--reset-state)…');
  // Navigate to origin first so we can call localStorage.clear()
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('[heatmap] localStorage/sessionStorage cleared for fresh session');
  });
  console.log('  ✅ Storage cleared — reloading page on clean state');
}

console.log(`⏳ Navigating to: ${TARGET_URL}`);
await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

// ── Wait for dynamic content ─────
console.log(`⏳ Waiting ${WAIT_MS}ms for dynamic content…`);
await page.waitForTimeout(WAIT_MS);

// ── Wait for specific selector ───
if (WAIT_FOR_SEL) {
  console.log(`⏳ Waiting for selector: "${WAIT_FOR_SEL}"…`);
  try {
    await page.waitForSelector(WAIT_FOR_SEL, { state: 'visible', timeout: 20_000 });
    console.log(`  ✅ Selector "${WAIT_FOR_SEL}" is visible`);
  } catch {
    console.warn(`  ⚠️  Selector "${WAIT_FOR_SEL}" did not appear within 20s — continuing anyway`);
  }
}

// ── Close overlays / modals ──────
if (CLOSE_OVERLAYS) {
  console.log('🧹 Attempting to close overlays…');

  // Step 1: Use Playwright's keyboard API to press Escape (works for React event handlers)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); // twice to handle nested modals
  await page.waitForTimeout(400);

  // Step 2: Target visually obvious X / close buttons via DOM
  const dismissed = await page.evaluate(() => {
    const closeSelectors = [
      // SVG line-based X buttons (like the Admin Dashboard close)
      'button:has(svg line[x1="18"])',
      'button:has(svg line[x1="6"])',
      // Lucide icon X buttons
      'button:has(svg[data-lucide="x"])',
      'button:has(svg[data-lucide="X"])',
      // Generic aria-label patterns
      'button[aria-label*="close" i]',
      'button[aria-label*="dismiss" i]',
      'button[title*="close" i]',
      '[data-dismiss]',
      '[data-close]',
      // Common class patterns
      '.modal-close', '.close-btn', '.btn-close',
      '[class*="CloseBtn"]', '[class*="close-btn"]', '[class*="closeBtn"]',
    ];
    let count = 0;
    for (const sel of closeSelectors) {
      try {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0) {
            el.click();
            count++;
          }
        });
      } catch { /* ignore bad selectors */ }
    }
    return count;
  });
  console.log(`  ✅ Pressed Escape ×2 + clicked ${dismissed} close button(s)`);
  await page.waitForTimeout(1000); // let React re-render & animations finish

  // Step 3: Verify canvas is now the top element at center — if Admin is still showing, warn
  const centerCheck = await page.evaluate(() => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const top = document.elementFromPoint(cx, cy);
    return { tag: top?.tagName, cls: (top?.className?.toString() || '').slice(0, 60) };
  });
  console.log(`  🔍 Center element after close: <${centerCheck.tag}> ${centerCheck.cls.split(' ')[0] || ''}`);
  if (centerCheck.tag && !['CANVAS', 'BODY', 'HTML'].includes(centerCheck.tag)) {
    console.warn('  ⚠️  Non-canvas element still at viewport center — try --reset-state to clear persisted UI');
  }
}

// ── Optional pause for manual setup ─
if (PAUSE_MODE) {
  console.log('\n⏸  PAUSE MODE — You have 8 seconds to set the page to the desired state…\n');
  for (let i = 8; i > 0; i--) {
    process.stdout.write(`\r   Starting scan in ${i}s… `);
    await page.waitForTimeout(1000);
  }
  console.log('\n');
}

console.log('✅ Page ready — starting heatmap scan\n');

// ─── Take baseline screenshot ─────────────────────────────────────────────────
const baseScreenshot = await page.screenshot({ fullPage: false });

// ─── Probe function injected into page ───────────────────────────────────────
/**
 * Runs inside the browser for a single (x, y) coordinate.
 * Returns everything we want to know about that point.
 */
const probePoint = async (x, y) => {
  return await page.evaluate(({ px, py }) => {
    // ── 1. elementFromPoint ──────────────────────────────────────
    const top = document.elementFromPoint(px, py);
    if (!top) return { x: px, y: py, status: 'outside', topEl: null, stack: [], blocked: false, pointerEvents: 'none', zIndex: 0, invisible: false, reason: 'outside viewport or no element' };

    const topStyle  = window.getComputedStyle(top);
    const topRect   = top.getBoundingClientRect();

    // ── 2. Stack of elements at this point ──────────────────────
    const stackEls = document.elementsFromPoint(px, py);
    const stack = stackEls.slice(0, 5).map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag:           el.tagName,
        id:            el.id || null,
        cls:           (el.className?.toString() || '').slice(0, 60),
        pointerEvents: s.pointerEvents,
        zIndex:        s.zIndex === 'auto' ? 'auto' : parseInt(s.zIndex),
        opacity:       parseFloat(s.opacity),
        visibility:    s.visibility,
        display:       s.display,
        width:         Math.round(r.width),
        height:        Math.round(r.height),
        isInteractive: ['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName)
                       || el.getAttribute('role') === 'button'
                       || el.getAttribute('tabindex') != null,
      };
    });

    // ── 3. Classify the top element ──────────────────────────────
    const pe         = topStyle.pointerEvents;
    const opacity    = parseFloat(topStyle.opacity);
    const visibility = topStyle.visibility;
    const display    = topStyle.display;
    const zIndex     = topStyle.zIndex === 'auto' ? 'auto' : parseInt(topStyle.zIndex);
    const isInteractive = ['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(top.tagName)
                          || top.getAttribute('role') === 'button'
                          || top.getAttribute('tabindex') != null;

    // Invisible layer: high z-index, full-cover, non-interactive, non-transparent
    const isInvisibleOverlay = (
      pe !== 'none'
      && opacity > 0.01
      && visibility !== 'hidden'
      && display !== 'none'
      && !isInteractive
      && topRect.width  >= window.innerWidth  * 0.3
      && topRect.height >= window.innerHeight * 0.3
      && !['CANVAS','SVG','IMG','VIDEO'].includes(top.tagName)
      && !['BODY','HTML'].includes(top.tagName)
    );

    // Check if underneath there is a canvas / interactive map layer
    const hasCanvasUnderneath = stackEls.slice(1).some(el => el.tagName === 'CANVAS');

    // Determine status
    let status = 'clickable';
    let reason  = 'Top element is interactive or pointer-events are present';
    let blocked = false;

    if (pe === 'none') {
      // pointer-events:none means clicks pass through — check what's underneath
      const clickable = stackEls.find(el => {
        const s = window.getComputedStyle(el);
        return s.pointerEvents !== 'none' && s.visibility !== 'hidden' && s.display !== 'none';
      });
      if (clickable) {
        status = 'clickable';
        reason = `pointer-events:none on top (${top.tagName}), click reaches: ${clickable.tagName}`;
      } else {
        status = 'dead';
        reason = 'All elements at this point have pointer-events:none';
        blocked = true;
      }
    } else if (visibility === 'hidden' || display === 'none') {
      status = 'dead';
      reason = `Top element is ${visibility === 'hidden' ? 'visibility:hidden' : 'display:none'}`;
      blocked = true;
    } else if (opacity < 0.01) {
      status = 'blocked';
      reason = 'Top element is nearly transparent (opacity<0.01) but captures pointer events';
      blocked = true;
    } else if (isInvisibleOverlay && hasCanvasUnderneath) {
      status = 'blocked';
      reason = `Oversized container (${top.tagName}.${(top.className?.toString()||'').split(' ')[0]}) sits above canvas`;
      blocked = true;
    } else if (isInvisibleOverlay) {
      status = 'blocked';
      reason = `Invisible overlay (${top.tagName}) intercepts clicks`;
      blocked = true;
    } else if (isInteractive) {
      status = 'clickable';
      reason = `Interactive element: ${top.tagName}`;
    } else if (top.tagName === 'CANVAS') {
      status = 'clickable';
      reason = 'Canvas element (map / WebGL)';
    } else {
      // Generic non-interactive element — still receives click but may not respond
      status = 'clickable';
      reason = `Non-interactive ${top.tagName} — click reaches element`;
    }

    // ── 4. Z-index conflict check ────────────────────────────────
    const zValues = stack.map(s => (typeof s.zIndex === 'number' ? s.zIndex : 0));
    const maxZ = Math.max(...zValues);
    const hasZConflict = maxZ > 5000 && !isInteractive;

    return {
      x:          px,
      y:          py,
      status,   // 'clickable' | 'blocked' | 'dead'
      blocked,
      reason,
      pointerEvents: pe,
      zIndex,
      maxStackZ: maxZ,
      hasZConflict,
      invisible:  isInvisibleOverlay,
      topEl: {
        tag:   top.tagName,
        id:    top.id || null,
        cls:   (top.className?.toString() || '').slice(0, 80),
        isInteractive,
      },
      stack,
    };
  }, { px: x, py: y });
};

// ─── Build grid points ────────────────────────────────────────────────────────
const cellW = VP_W / GRID_COLS;
const cellH = VP_H / GRID_ROWS;
const points = [];

for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    points.push({
      col, row,
      x: Math.round(cellW * col + cellW / 2),
      y: Math.round(cellH * row + cellH / 2),
    });
  }
}

// ─── Click-event listener injection ──────────────────────────────────────────
// We inject a global listener BEFORE probing so we can check if clicks fire.
// We also inject a GUARD that swallows clicks on interactive non-canvas elements
// so probe clicks don't re-open panels (admin dashboard, modals, etc.) mid-scan.
await page.evaluate(() => {
  window.__heatmapClickLog = {};

  // ── 1. Heatmap click logger ──
  window.__heatmapClickListener = (e) => {
    const key = `${Math.round(e.clientX)},${Math.round(e.clientY)}`;
    window.__heatmapClickLog[key] = (window.__heatmapClickLog[key] || 0) + 1;
  };
  document.addEventListener('click', window.__heatmapClickListener, { capture: true, passive: true });

  // ── 2. Click guard — prevent scan clicks from triggering UI state changes ──
  // Strategy: intercept clicks on BUTTON / A / [role=button] elements that are
  // NOT part of the Mapbox canvas. This lets us measure clickability without
  // actually triggering navigation or opening modals.
  window.__heatmapGuard = (e) => {
    const t = e.target;
    if (!t) return;
    const tag = t.tagName;
    const isCanvas = tag === 'CANVAS';
    const isInteractiveHost = ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(tag)
      || t.getAttribute('role') === 'button'
      || t.getAttribute('tabindex') != null;
    // Only suppress if it's a concrete interactive element (not canvas / body)
    if (isInteractiveHost && !isCanvas) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };
  document.addEventListener('click', window.__heatmapGuard, { capture: true });
  document.addEventListener('mousedown', window.__heatmapGuard, { capture: true });
  document.addEventListener('mouseup',   window.__heatmapGuard, { capture: true });
});

// ─── Probe each grid cell ─────────────────────────────────────────────────────
console.log(`🔬 Probing ${points.length} grid cells (${GRID_COLS}×${GRID_ROWS})…\n`);
const results = [];
let clickable = 0, blocked = 0, dead = 0, zConflicts = 0;

for (const pt of points) {
  const result = await probePoint(pt.x, pt.y);

  // Simulate actual click and check if event fired
  await page.mouse.click(pt.x, pt.y, { delay: 20 }).catch(() => {});
  await page.waitForTimeout(30); // brief settle

  const clickFired = await page.evaluate(({ cx, cy }) => {
    const key = `${cx},${cy}`;
    return (window.__heatmapClickLog[key] || 0) > 0;
  }, { cx: pt.x, cy: pt.y });

  result.clickEventFired = clickFired;
  result.col = pt.col;
  result.row = pt.row;

  // Tally
  if (result.status === 'clickable') clickable++;
  else if (result.status === 'blocked') blocked++;
  else dead++;
  if (result.hasZConflict) zConflicts++;

  if (IS_DEBUG) {
    const icon = result.status === 'clickable' ? '🟢' : result.status === 'blocked' ? '🟡' : '🔴';
    console.log(`  ${icon} (${String(pt.col).padStart(2)},${String(pt.row).padStart(2)}) [${pt.x},${pt.y}] ${result.status.padEnd(10)} ${result.topEl?.tag || '?'}#${result.topEl?.id || ''} — ${result.reason?.slice(0,60)}`);
  } else {
    // Progress bar
    const done  = results.length + 1;
    const total = points.length;
    if (done % 20 === 0 || done === total) {
      const pct   = Math.round(done / total * 100);
      const bar   = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      process.stdout.write(`\r  [${bar}] ${pct}% (${done}/${total}) — 🟢${clickable} 🟡${blocked} 🔴${dead}`);
    }
  }

  results.push(result);
}

console.log('\n\n✅ Probing complete\n');

// ─── Build JSON report ────────────────────────────────────────────────────────
const summary = {
  timestamp:   new Date(TS).toISOString(),
  url:         BASE_URL,
  viewport:    { width: VP_W, height: VP_H },
  grid:        { cols: GRID_COLS, rows: GRID_ROWS, cellW: Math.round(cellW), cellH: Math.round(cellH) },
  totals: {
    cells:     points.length,
    clickable,
    blocked,
    dead,
    zConflicts,
    clickablePercent: Math.round(clickable / points.length * 100),
    blockedPercent:   Math.round(blocked   / points.length * 100),
    deadPercent:      Math.round(dead      / points.length * 100),
  },
  // Unique blocking elements (deduplicated)
  blockingElements: Object.values(
    results
      .filter(r => r.status !== 'clickable')
      .reduce((acc, r) => {
        const key = `${r.topEl?.tag}#${r.topEl?.id || ''}.${(r.topEl?.cls||'').split(' ')[0]}`;
        if (!acc[key]) acc[key] = { element: key, count: 0, status: r.status, reason: r.reason, sampleCoords: [] };
        acc[key].count++;
        if (acc[key].sampleCoords.length < 3) acc[key].sampleCoords.push({ x: r.x, y: r.y });
        return acc;
      }, {})
  ).sort((a, b) => b.count - a.count),
  // Z-index conflicts
  zIndexConflicts: results
    .filter(r => r.hasZConflict)
    .map(r => ({ x: r.x, y: r.y, maxZ: r.maxStackZ, topEl: r.topEl }))
    .slice(0, 20),
  cells: results,
};

fs.writeFileSync(JSON_PATH, JSON.stringify(summary, null, 2));
console.log(`📋 JSON report saved: ${JSON_PATH}`);

// ─── Draw visual overlay via Canvas CDP ──────────────────────────────────────
// We inject an overlay canvas on top of the page, draw the heatmap, then screenshot.
await page.evaluate(({ data, cw, ch, vw, vh }) => {
  // Remove any existing overlay
  document.getElementById('__heatmap_overlay__')?.remove();

  const canvas = document.createElement('canvas');
  canvas.id        = '__heatmap_overlay__';
  canvas.width     = vw;
  canvas.height    = vh;
  canvas.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    `width:${vw}px`, `height:${vh}px`,
    'z-index:2147483647',
    'pointer-events:none',
    'opacity:0.72',
  ].join(';');
  document.documentElement.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Color map
  const COLOR = {
    clickable: 'rgba(34,197,94,0.55)',    // green
    blocked:   'rgba(250,204,21,0.65)',   // yellow
    dead:      'rgba(239,68,68,0.70)',    // red
  };
  const BORDER = {
    clickable: 'rgba(22,163,74,0.9)',
    blocked:   'rgba(202,138,4,0.9)',
    dead:      'rgba(185,28,28,0.9)',
  };

  for (const cell of data) {
    const x = cell.x - cw / 2;
    const y = cell.y - ch / 2;
    ctx.fillStyle   = COLOR[cell.status]  || 'rgba(107,114,128,0.4)';
    ctx.strokeStyle = BORDER[cell.status] || 'rgba(107,114,128,0.8)';
    ctx.lineWidth   = 1;
    ctx.fillRect(x, y, cw, ch);
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);

    // Z-conflict dot
    if (cell.hasZConflict) {
      ctx.fillStyle = 'rgba(168,85,247,0.9)';
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Legend
  const LX = 12, LY = vh - 100;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.roundRect?.(LX - 8, LY - 8, 200, 88, 8);
  ctx.fill?.();

  [
    ['#22c55e', '🟢 Clickable'],
    ['#facc15', '🟡 Blocked by overlay'],
    ['#ef4444', '🔴 Dead zone'],
    ['#a855f7', '🟣 Z-index conflict'],
  ].forEach(([color, label], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(LX, LY + i * 20, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(label, LX + 20, LY + i * 20 + 11);
  });
}, { data: results, cw: Math.round(cellW), ch: Math.round(cellH), vw: VP_W, vh: VP_H });

// Take the overlaid screenshot
const overlayScreenshot = await page.screenshot({ fullPage: false });
fs.writeFileSync(PNG_PATH, overlayScreenshot);
console.log(`🖼  Overlay screenshot saved: ${PNG_PATH}`);

// Remove overlay so we can close cleanly
await page.evaluate(() => document.getElementById('__heatmap_overlay__')?.remove());

await context.close();
await browser.close();

// ─── Generate interactive HTML viewer ────────────────────────────────────────
const html = generateHTMLViewer(summary, baseScreenshot, overlayScreenshot, VP_W, VP_H, cellW, cellH);
fs.writeFileSync(HTML_PATH, html);
console.log(`🌐 Interactive viewer: ${HTML_PATH}\n`);

// ─── Print CLI summary ────────────────────────────────────────────────────────
const { totals } = summary;
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║              HEATMAP ANALYSIS SUMMARY                    ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║  🟢 Clickable:   ${String(totals.clickable   + ' cells (' + totals.clickablePercent + '%)').padEnd(43)}║`);
console.log(`║  🟡 Blocked:     ${String(totals.blocked     + ' cells (' + totals.blockedPercent   + '%)').padEnd(43)}║`);
console.log(`║  🔴 Dead zones:  ${String(totals.dead        + ' cells (' + totals.deadPercent      + '%)').padEnd(43)}║`);
console.log(`║  🟣 Z conflicts: ${String(totals.zConflicts  + ' cells').padEnd(43)}║`);
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║  📋 Report:  ${JSON_PATH.slice(-46).padEnd(47)}║`);
console.log(`║  🖼  Overlay: ${PNG_PATH.slice(-46).padEnd(47)}║`);
console.log(`║  🌐 Viewer:  ${HTML_PATH.slice(-46).padEnd(47)}║`);
console.log('╚═══════════════════════════════════════════════════════════╝\n');

if (summary.blockingElements.length > 0) {
  console.log('🚫 TOP BLOCKING ELEMENTS:');
  summary.blockingElements.slice(0, 8).forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.element} — ${b.count} cells blocked (${b.status}) — ${b.reason?.slice(0, 60)}`);
  });
  console.log('');
}
if (summary.zIndexConflicts.length > 0) {
  console.log(`🔮 Z-INDEX CONFLICTS: ${summary.zIndexConflicts.length} cells with z-index > 5000`);
  const uniqueZEls = [...new Set(summary.zIndexConflicts.map(z => `${z.topEl?.tag}.${(z.topEl?.cls||'').split(' ')[0]} (z:${z.maxZ})`))];
  uniqueZEls.slice(0, 5).forEach(z => console.log(`  • ${z}`));
}

// ─── HTML Viewer Generator ────────────────────────────────────────────────────
function generateHTMLViewer(report, baseImg, overlayImg, vw, vh, cw, ch) {
  const baseB64    = Buffer.from(baseImg).toString('base64');
  const overlayB64 = Buffer.from(overlayImg).toString('base64');
  const cellsJson  = JSON.stringify(report.cells);
  const summaryJson = JSON.stringify(report.totals);
  const blockersJson = JSON.stringify(report.blockingElements.slice(0, 20));
  const zConflictsJson = JSON.stringify(report.zIndexConflicts.slice(0, 20));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Click Heatmap — ${report.url}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0a0a0f;
      --surface:   #12121a;
      --surface2:  #1a1a28;
      --border:    #2a2a3d;
      --text:      #e2e2f0;
      --muted:     #7070a0;
      --green:     #22c55e;
      --yellow:    #facc15;
      --red:       #ef4444;
      --purple:    #a855f7;
      --blue:      #3b82f6;
      --accent:    #6366f1;
    }

    html { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

    /* ── Layout ── */
    .app { display: grid; grid-template-columns: 340px 1fr; grid-template-rows: auto 1fr; height: 100vh; overflow: hidden; }
    .header { grid-column: 1/-1; background: var(--surface); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .sidebar { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
    .main { overflow: hidden; display: flex; flex-direction: column; }

    /* ── Header ── */
    .logo { font-size: 15px; font-weight: 700; color: var(--accent); letter-spacing: -0.3px; white-space: nowrap; }
    .url-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; }
    .legend { display: flex; gap: 20px; margin-left: auto; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    
    /* ── Stat cards ── */
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: border-color .2s; }
    .stat-card:hover { border-color: var(--accent); }
    .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .stat-sub   { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .stat-card.green .stat-value { color: var(--green); }
    .stat-card.yellow .stat-value { color: var(--yellow); }
    .stat-card.red .stat-value { color: var(--red); }
    .stat-card.purple .stat-value { color: var(--purple); }

    /* ── Section headers ── */
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 8px; }

    /* ── Blockers list ── */
    .blocker-list { display: flex; flex-direction: column; gap: 6px; }
    .blocker-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 11px; }
    .blocker-item.blocked { border-color: rgba(250,204,21,0.35); }
    .blocker-item.dead    { border-color: rgba(239,68,68,0.35); }
    .blocker-el   { font-family: 'JetBrains Mono', monospace; color: var(--yellow); font-size: 11px; font-weight: 500; word-break: break-all; }
    .blocker-el.dead { color: var(--red); }
    .blocker-count{ font-size: 10px; color: var(--muted); margin-top: 3px; }
    .blocker-reason{ font-size: 10px; color: var(--muted); margin-top: 2px; font-style: italic; word-break: break-word; }

    /* z-index conflicts */
    .z-item { background: var(--surface2); border: 1px solid rgba(168,85,247,0.4); border-radius: 8px; padding: 8px 10px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--purple); word-break: break-all; }

    /* ── Canvas viewer ── */
    .viewer-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
    .tab { flex: 1; padding: 10px 16px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; color: var(--muted); border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; transition: all .2s; }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab:hover:not(.active) { color: var(--text); }
    
    .canvas-wrap { flex: 1; position: relative; overflow: auto; display: flex; align-items: flex-start; justify-content: flex-start; background: #06060a; }
    .viewer-canvas { display: block; image-rendering: auto; }
    .tooltip { position: fixed; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 11px; line-height: 1.6; pointer-events: none; display: none; z-index: 9999; max-width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); }
    .tooltip .tt-title { font-weight: 700; font-size: 12px; margin-bottom: 4px; }
    .tooltip .tt-status.clickable { color: var(--green); }
    .tooltip .tt-status.blocked   { color: var(--yellow); }
    .tooltip .tt-status.dead      { color: var(--red); }
    .tooltip kbd { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 1px 4px; font-size: 10px; font-family: 'JetBrains Mono', monospace; }

    .controls { padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; font-size: 12px; }
    .controls label { color: var(--muted); }
    .filter-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 5px 12px; font-size: 11px; font-weight: 600; cursor: pointer; color: var(--muted); transition: all .2s; }
    .filter-btn.active { color: var(--text); border-color: var(--accent); background: rgba(99,102,241,0.15); }
    .filter-btn:hover { color: var(--text); }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>

<div class="app">

  <!-- Header -->
  <header class="header">
    <div class="logo">🔬 Click Heatmap Analyzer</div>
    <div class="url-badge">${report.url}</div>
    <div style="font-size:11px; color:var(--muted);">${new Date(report.timestamp).toLocaleString()} • ${report.grid.cols}×${report.grid.rows} grid • ${report.viewport.width}×${report.viewport.height}px</div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div> Clickable</div>
      <div class="legend-item"><div class="legend-dot" style="background:#facc15"></div> Blocked</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div> Dead zone</div>
      <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div> Z-conflict</div>
    </div>
  </header>

  <!-- Sidebar -->
  <aside class="sidebar">
    <!-- Stats -->
    <div>
      <div class="section-title">Summary</div>
      <div class="stat-grid">
        <div class="stat-card green">
          <div class="stat-label">Clickable</div>
          <div class="stat-value" id="s-clickable">–</div>
          <div class="stat-sub" id="s-clickable-pct">–</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-label">Blocked</div>
          <div class="stat-value" id="s-blocked">–</div>
          <div class="stat-sub" id="s-blocked-pct">–</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Dead zones</div>
          <div class="stat-value" id="s-dead">–</div>
          <div class="stat-sub" id="s-dead-pct">–</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-label">Z-conflicts</div>
          <div class="stat-value" id="s-zconflict">–</div>
          <div class="stat-sub">high z-index</div>
        </div>
      </div>
    </div>

    <!-- Blocking elements -->
    <div>
      <div class="section-title">Blocking Elements</div>
      <div class="blocker-list" id="blocker-list">
        <div style="color:var(--muted); font-size:11px;">Loading…</div>
      </div>
    </div>

    <!-- Z-index conflicts -->
    <div>
      <div class="section-title">Z-Index Conflicts</div>
      <div id="z-list" style="display:flex;flex-direction:column;gap:6px;">
        <div style="color:var(--muted); font-size:11px;">Loading…</div>
      </div>
    </div>

    <!-- Export -->
    <div style="margin-top:auto;">
      <button onclick="exportJSON()" style="width:100%;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
        ⬇ Download JSON Report
      </button>
    </div>
  </aside>

  <!-- Main viewer -->
  <main class="main">
    <div class="viewer-tabs">
      <button class="tab active" id="tab-overlay" onclick="switchTab('overlay')">🎯 Heatmap Overlay</button>
      <button class="tab" id="tab-base" onclick="switchTab('base')">📸 Original Page</button>
      <button class="tab" id="tab-grid" onclick="switchTab('grid')">⚡ Interactive Grid</button>
    </div>
    <div class="controls">
      <span style="color:var(--muted);">Filter:</span>
      <button class="filter-btn active" id="f-all"       onclick="setFilter('all')">All</button>
      <button class="filter-btn"        id="f-clickable" onclick="setFilter('clickable')">🟢 Clickable</button>
      <button class="filter-btn"        id="f-blocked"   onclick="setFilter('blocked')">🟡 Blocked</button>
      <button class="filter-btn"        id="f-dead"      onclick="setFilter('dead')">🔴 Dead</button>
      <button class="filter-btn"        id="f-zconflict" onclick="setFilter('zconflict')">🟣 Z-conflict</button>
      <span style="margin-left:auto; color:var(--muted); font-size:11px;">Hover cells to inspect</span>
    </div>
    <div class="canvas-wrap" id="canvas-wrap">
      <canvas id="viewer-canvas" class="viewer-canvas"></canvas>
    </div>
  </main>

</div>

<!-- Tooltip -->
<div class="tooltip" id="tooltip"></div>

<script>
// ── Data ──────────────────────────────────────────────────────────────────────
const CELLS      = ${cellsJson};
const SUMMARY    = ${summaryJson};
const BLOCKERS   = ${blockersJson};
const Z_CONFLICTS= ${zConflictsJson};
const VW = ${vw}, VH = ${vh};
const CW = ${Math.round(cellW)}, CH = ${Math.round(cellH)};
const COLS = ${GRID_COLS}, ROWS = ${GRID_ROWS};

const BASE64_BASE    = '${baseB64}';
const BASE64_OVERLAY = '${overlayB64}';

// ── State ─────────────────────────────────────────────────────────────────────
let activeTab    = 'overlay';
let activeFilter = 'all';
let scale        = 1;

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  // Stat cards
  document.getElementById('s-clickable').textContent     = SUMMARY.clickable;
  document.getElementById('s-clickable-pct').textContent = SUMMARY.clickablePercent + '% of grid';
  document.getElementById('s-blocked').textContent        = SUMMARY.blocked;
  document.getElementById('s-blocked-pct').textContent    = SUMMARY.blockedPercent + '% of grid';
  document.getElementById('s-dead').textContent           = SUMMARY.dead;
  document.getElementById('s-dead-pct').textContent       = SUMMARY.deadPercent + '% of grid';
  document.getElementById('s-zconflict').textContent      = SUMMARY.zConflicts;

  // Blockers
  const bl = document.getElementById('blocker-list');
  if (BLOCKERS.length === 0) {
    bl.innerHTML = '<div style="color:var(--green);font-size:11px;">✅ No blocking elements detected</div>';
  } else {
    bl.innerHTML = BLOCKERS.slice(0, 12).map(b => \`
      <div class="blocker-item \${b.status}">
        <div class="blocker-el \${b.status === 'dead' ? 'dead' : ''}">\${b.element}</div>
        <div class="blocker-count">\${b.count} cells • \${b.status}</div>
        <div class="blocker-reason">\${b.reason || ''}</div>
      </div>\`).join('');
  }

  // Z-index
  const zl = document.getElementById('z-list');
  if (Z_CONFLICTS.length === 0) {
    zl.innerHTML = '<div style="color:var(--muted);font-size:11px;">No z-index conflicts detected</div>';
  } else {
    const unique = [...new Set(Z_CONFLICTS.map(z => \`\${z.topEl?.tag || '?'} z:\${z.maxZ}\`))].slice(0, 8);
    zl.innerHTML = unique.map(s => \`<div class="z-item">\${s}</div>\`).join('');
  }

  drawCanvas();
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────
const canvas  = document.getElementById('viewer-canvas');
const ctx     = canvas.getContext('2d');
let bgImg = null, overlayImg = null;

function loadImages(cb) {
  let loaded = 0;
  bgImg = new Image(); bgImg.onload = () => { if (++loaded === 2) cb(); }; bgImg.src = 'data:image/png;base64,' + BASE64_BASE;
  overlayImg = new Image(); overlayImg.onload = () => { if (++loaded === 2) cb(); }; overlayImg.src = 'data:image/png;base64,' + BASE64_OVERLAY;
}

function drawCanvas() {
  const wrap   = document.getElementById('canvas-wrap');
  const maxW   = wrap.clientWidth  || VW;
  const maxH   = wrap.clientHeight || VH;
  scale = Math.min(maxW / VW, maxH / VH, 1);
  const W = Math.round(VW * scale), H = Math.round(VH * scale);
  canvas.width = W; canvas.height = H;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

  if (activeTab === 'overlay') {
    if (overlayImg?.complete) { ctx.drawImage(overlayImg, 0, 0, W, H); applyFilter(); }
    else loadImages(() => { ctx.drawImage(overlayImg, 0, 0, W, H); applyFilter(); });
  } else if (activeTab === 'base') {
    if (bgImg?.complete) ctx.drawImage(bgImg, 0, 0, W, H);
    else loadImages(() => ctx.drawImage(bgImg, 0, 0, W, H));
  } else {
    // Interactive grid tab: draw bg then overlay cells
    if (bgImg?.complete) { ctx.drawImage(bgImg, 0, 0, W, H); drawGrid(); }
    else loadImages(() => { ctx.drawImage(bgImg, 0, 0, W, H); drawGrid(); });
  }
}

function drawGrid() {
  const COLOR = { clickable: 'rgba(34,197,94,0.45)', blocked: 'rgba(250,204,21,0.55)', dead: 'rgba(239,68,68,0.65)' };
  const BORDER = { clickable: 'rgba(22,163,74,0.8)', blocked: 'rgba(202,138,4,0.8)', dead: 'rgba(185,28,28,0.8)' };
  for (const cell of CELLS) {
    if (activeFilter !== 'all' && activeFilter !== 'zconflict') {
      if (cell.status !== activeFilter) continue;
    }
    if (activeFilter === 'zconflict' && !cell.hasZConflict) continue;
    const x = (cell.x - CW / 2) * scale, y = (cell.y - CH / 2) * scale;
    const w = CW * scale, h = CH * scale;
    ctx.fillStyle   = COLOR[cell.status]  || 'rgba(107,114,128,0.3)';
    ctx.strokeStyle = BORDER[cell.status] || '#888';
    ctx.lineWidth   = 0.5;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (cell.hasZConflict) {
      ctx.fillStyle = 'rgba(168,85,247,0.9)';
      ctx.beginPath();
      ctx.arc(cell.x * scale, cell.y * scale, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function applyFilter() {
  if (activeFilter === 'all') return; // overlay already shows all
  // Re-draw with filter
  ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
  // Dim non-matching cells
  for (const cell of CELLS) {
    let matches = false;
    if (activeFilter === 'zconflict') matches = cell.hasZConflict;
    else matches = (cell.status === activeFilter);
    if (!matches) {
      const x = (cell.x - CW / 2) * scale, y = (cell.y - CH / 2) * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, CW * scale, CH * scale);
    }
  }
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
const tt = document.getElementById('tooltip');
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / scale;
  const my = (e.clientY - rect.top)  / scale;
  const col = Math.floor(mx / CW);
  const row = Math.floor(my / CH);
  const cell = CELLS.find(c => c.col === col && c.row === row);
  if (!cell) { tt.style.display = 'none'; return; }

  const statusIcon = { clickable: '🟢', blocked: '🟡', dead: '🔴' }[cell.status] || '⚪';
  tt.innerHTML = \`
    <div class="tt-title">\${statusIcon} (\${cell.x}, \${cell.y}) — Col \${cell.col}, Row \${cell.row}</div>
    <div class="tt-status \${cell.status}">\${cell.status.toUpperCase()}</div>
    <div style="color:var(--muted);margin-top:6px;font-size:10px;">
      <div><kbd>Element</kbd> \${cell.topEl?.tag || '?'}\${cell.topEl?.id ? '#'+cell.topEl.id : ''}</div>
      <div style="word-break:break-all;margin-top:2px;">\${(cell.topEl?.cls || '').slice(0, 60)}</div>
      <div style="margin-top:4px;"><kbd>pointer-events</kbd> \${cell.pointerEvents}</div>
      <div><kbd>z-index</kbd> \${cell.zIndex}</div>
      \${cell.hasZConflict ? '<div style="color:var(--purple);">⚠ max z-index in stack: ' + cell.maxStackZ + '</div>' : ''}
      <div style="margin-top:4px;font-style:italic;">\${(cell.reason || '').slice(0, 80)}</div>
      <div style="margin-top:4px;">Click event fired: \${cell.clickEventFired ? '✅ yes' : '❌ no'}</div>
    </div>
  \`;
  tt.style.display = 'block';
  tt.style.left    = (e.clientX + 14) + 'px';
  tt.style.top     = (e.clientY - 10) + 'px';
  // keep on screen
  const ttr = tt.getBoundingClientRect();
  if (ttr.right > window.innerWidth - 10) tt.style.left = (e.clientX - ttr.width - 14) + 'px';
  if (ttr.bottom > window.innerHeight - 10) tt.style.top = (e.clientY - ttr.height + 10) + 'px';
});
canvas.addEventListener('mouseleave', () => { tt.style.display = 'none'; });

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  ['overlay','base','grid'].forEach(t => {
    document.getElementById('tab-'+t).classList.toggle('active', t === tab);
  });
  drawCanvas();
}

// ── Filter ────────────────────────────────────────────────────────────────────
function setFilter(f) {
  activeFilter = f;
  ['all','clickable','blocked','dead','zconflict'].forEach(t => {
    document.getElementById('f-'+t).classList.toggle('active', t === f);
  });
  drawCanvas();
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportJSON() {
  const data = JSON.stringify({ summary: SUMMARY, blockers: BLOCKERS, zConflicts: Z_CONFLICTS, cells: CELLS }, null, 2);
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = 'heatmap-report.json';
  a.click();
}

// ── Resize ────────────────────────────────────────────────────────────────────
new ResizeObserver(() => drawCanvas()).observe(document.getElementById('canvas-wrap'));

loadImages(() => init());
</script>
</body>
</html>`;
}
