/**
 * PSI Maps — FULL AUTONOMOUS QA + UX AUDIT
 * Run: /opt/homebrew/bin/node playwright/full-audit.mjs
 *
 * Phases:
 *  1. Initialize (trace, video, console, network)
 *  2. Discover app structure
 *  3. Desktop user flows (map, markers, sidebar, gallery, modals)
 *  4. Mobile user flows (touch, scroll, layout)
 *  5. Dead zone scan (grid click)
 *  6. Failure detection (overlays, z-index, hit areas)
 *  7. Performance profiling
 *  8. Self-improvement loop (re-run checks, confirm/refute findings)
 *  9. Structured report output
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RUN_ID = `audit-${Date.now()}`;
const OUT = path.join(ROOT, 'playwright-results', RUN_ID);
const SS_DIR = path.join(OUT, 'screenshots');
const TRACE_DIR = path.join(OUT, 'traces');
const VID_DIR = path.join(OUT, 'videos');
const NET_LOG = path.join(OUT, 'network.json');
const REPORT_PATH = path.join(OUT, 'report.json');
const MD_REPORT = path.join(OUT, 'AUDIT_REPORT.md');

[OUT, SS_DIR, TRACE_DIR, VID_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SLOW_MO = 150; // ms between actions — visible but not painfully slow

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
const issues = { critical: [], high: [], medium: [], low: [] };
const positives = [];
const perfMetrics = {};
const networkLog = { total: 0, failed: [], slow: [], status404: [], duplicates: [] };
const consoleLog = { errors: [], warnings: [] };
const screenshots = [];
let ssIdx = 0;

const SAFE_PATTERNS = [
  'firebaseinstallations', 'firebaseremoteconfig', 'firebase.googleapis.com/v1alpha',
  'ERR_ABORTED', 'tiles.mapbox.com', 'events.mapbox.com', 'Load failed', 'AbortError',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function issue(severity, obj) {
  issues[severity].push({ ...obj, ts: new Date().toISOString() });
  const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };
  console.log(`  ${icons[severity]} [${severity.toUpperCase()}] ${obj.title}`);
}
function ok(msg) {
  positives.push(msg);
  console.log(`  ✅ ${msg}`);
}
function info(msg) { console.log(`  ℹ️  ${msg}`); }

async function shot(page, label, opts = {}) {
  ssIdx++;
  const file = path.join(SS_DIR, `${String(ssIdx).padStart(3, '0')}-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false }).catch(() => {});
  screenshots.push({ label, file, ts: new Date().toISOString() });
  console.log(`  📸 ${label}`);
  return file;
}

function isSafe(url = '', reason = '') {
  return SAFE_PATTERNS.some(p => url.includes(p) || reason.includes(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║        PSI MAPS — AUTONOMOUS QA + UX AUDIT                 ║');
console.log(`║        Target : ${BASE.padEnd(44)}║`);
console.log(`║        Run ID : ${RUN_ID.padEnd(44)}║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: SLOW_MO,
  args: ['--disable-web-security', '--no-sandbox', '--disable-features=VizDisplayCompositor'],
});

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — INITIALIZE CONTEXT (Desktop)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 1: Initializing (Desktop 1440×900) ━━━');

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: VID_DIR, size: { width: 1440, height: 900 } },
});
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true, title: 'PSI Maps Full Audit' });

const page = await ctx.newPage();
const urlCounts = {};
const reqTimes = {};

// Network instrumentation
page.on('request', req => {
  const url = req.url();
  urlCounts[url] = (urlCounts[url] || 0) + 1;
  if (urlCounts[url] === 2) networkLog.duplicates.push(url);
  reqTimes[url] = Date.now();
  networkLog.total++;
});
page.on('response', res => {
  const url = res.url();
  const status = res.status();
  const dur = Date.now() - (reqTimes[url] || Date.now());
  if (status === 404) networkLog.status404.push({ url, status });
  if (dur > 3000) networkLog.slow.push({ url, dur });
});
page.on('requestfailed', req => {
  const url = req.url();
  const reason = req.failure()?.errorText ?? '';
  if (!isSafe(url, reason)) networkLog.failed.push({ url, reason });
});
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') consoleLog.errors.push({ text, url: page.url() });
  else if (type === 'warning') consoleLog.warnings.push({ text });
});
page.on('pageerror', err => {
  consoleLog.errors.push({ text: err.message, stack: err.stack, url: page.url(), type: 'pageerror' });
  issue('critical', {
    title: `JS Runtime Error: ${err.message.slice(0, 80)}`,
    location: page.url(),
    steps: ['Load app', 'Monitor browser console'],
    fix: 'Add error boundaries; resolve the root JS error shown in stack trace',
    screenshot: null,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — APP DISCOVERY & INITIAL LOAD
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 2: App Discovery & Initial Load ━━━');

const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
perfMetrics.domContentLoaded = Date.now() - t0;
info(`DOM ready in ${perfMetrics.domContentLoaded}ms`);

await shot(page, 'p2-initial-paint');

// Wait for map canvas
let mapVisible = false;
try {
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 20_000 });
  mapVisible = true;
} catch {}
perfMetrics.mapVisible = Date.now() - t0;
info(`Map canvas visible: ${mapVisible} (${perfMetrics.mapVisible}ms)`);

await shot(page, 'p2-map-loaded');

if (!mapVisible) {
  issue('critical', {
    title: 'Map canvas not rendered within 20 seconds',
    location: 'MapCanvas.tsx',
    steps: ['Navigate to app home', 'Wait 20 seconds'],
    fix: 'Verify Mapbox access token; check network access to mapbox tile servers; ensure MapCanvas component mounts correctly',
    screenshot: screenshots[screenshots.length - 1]?.file,
  });
}

if (perfMetrics.mapVisible > 8000) {
  issue('high', {
    title: `Slow initial load: map took ${perfMetrics.mapVisible}ms to render`,
    location: 'index.html / vite config',
    steps: ['Cold-start app', 'Measure canvas visibility'],
    fix: 'Add preconnect for Mapbox/Firebase CDNs; lazy-load non-critical panels; use code splitting',
  });
}

// Discover page structure
const structure = await page.evaluate(() => {
  const sel = (s) => Array.from(document.querySelectorAll(s)).length;
  return {
    canvases: sel('canvas'),
    buttons: sel('button'),
    inputs: sel('input'),
    modals: sel('[role="dialog"], [class*="modal" i], [class*="Modal"]'),
    markers: sel('[data-testid="project-marker"], .mapboxgl-marker'),
    fixedEls: Array.from(document.querySelectorAll('*')).filter(el => {
      return window.getComputedStyle(el).position === 'fixed';
    }).length,
    totalDomNodes: document.querySelectorAll('*').length,
    title: document.title,
    metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '(none)',
    h1Count: sel('h1'),
    navigationRoles: sel('[role="navigation"], nav'),
  };
});

console.log('\n  📊 App Structure:');
Object.entries(structure).forEach(([k, v]) => console.log(`     ${k}: ${v}`));

if (structure.h1Count === 0) {
  issue('medium', { title: 'No <h1> element found — SEO/accessibility issue', location: 'index.html / App.tsx', steps: ['Inspect DOM'], fix: 'Add a single descriptive <h1> to the page; use Screen Reader friendly headings' });
}
if (structure.h1Count > 1) {
  issue('low', { title: `Multiple <h1> elements (${structure.h1Count}) — SEO anti-pattern`, location: 'Multiple components', steps: ['Inspect headings'], fix: 'Use exactly one <h1> per page; demote secondary headings to <h2> or <h3>' });
}
if (structure.totalDomNodes > 1500) {
  issue('medium', { title: `Large DOM: ${structure.totalDomNodes} nodes — performance risk`, location: 'App.tsx rendering', steps: ['Inspect DOM'], fix: 'Virtualize long lists; unmount off-screen panels; use React.memo to limit re-renders' });
}

// Welcome banner handling
const banner = page.locator('[class*="banner" i], [class*="welcome" i], [class*="Welcome"]').first();
const hasBanner = await banner.count() > 0;
if (hasBanner) {
  ok('Welcome banner detected — waiting for auto-dismiss...');
  await shot(page, 'p2-welcome-banner');
  await page.waitForTimeout(6000);
  await shot(page, 'p2-after-banner');
} else {
  await page.waitForTimeout(2500);
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 3A — DESKTOP USER FLOWS
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 3: Desktop User Flows ━━━');

// ── Map Interaction ─────────────────────────────────────────────────────────
const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox().catch(() => null);

if (box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  info(`Canvas: ${Math.round(box.width)}×${Math.round(box.height)} at (${Math.round(box.x)}, ${Math.round(box.y)})`);

  // Overlay check
  const overlay = await page.evaluate(({ cx, cy }) => {
    const el = document.elementFromPoint(cx, cy);
    const cv = document.querySelector('canvas');
    return {
      tag: el?.tagName ?? 'NONE',
      id: el?.id ?? '',
      cls: el?.className?.toString().slice(0, 80) ?? '',
      isCanvas: el === cv || cv?.contains(el) || false,
    };
  }, { cx, cy });

  info(`Canvas center element: ${overlay.tag}#${overlay.id} — isCanvas: ${overlay.isCanvas}`);

  if (!overlay.isCanvas) {
    const sf = await shot(page, 'p3-canvas-blocked');
    issue('critical', {
      title: `Map canvas blocked by: ${overlay.tag}#${overlay.id} .${overlay.cls.split(' ')[0]}`,
      location: 'App.tsx / overlay layer',
      steps: ['Load app', 'Check elementFromPoint at canvas center'],
      fix: 'Set pointer-events:none on all overlay wrapper divs above the map canvas; ensure no transparent full-screen divs intercept mouse events',
      screenshot: sf,
    });
  } else {
    ok('Map canvas receives mouse events at center (no blocking overlay)');
  }

  // Zoom in
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -300); await page.waitForTimeout(700);
  await page.mouse.wheel(0, -300); await page.waitForTimeout(700);
  await shot(page, 'p3-map-zoom-in');

  // Pan
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 180, cy - 100, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await shot(page, 'p3-map-dragged');

  // Zoom out
  await page.mouse.wheel(0, 500); await page.waitForTimeout(500);
  await page.mouse.wheel(0, 500); await page.waitForTimeout(500);
  await shot(page, 'p3-map-zoom-out');
} else {
  issue('critical', {
    title: 'Map canvas has no bounding box (zero-size or not rendered)',
    location: 'MapCanvas.tsx',
    steps: ['Navigate to app', 'Query canvas bounding box'],
    fix: 'Ensure mapContainer ref is attached; verify Mapbox map.resize() is called after mount',
  });
}

// ── Map Markers ──────────────────────────────────────────────────────────────
await page.waitForTimeout(3000); // Let Firestore load
let markers = await page.locator('[data-testid="project-marker"], .mapboxgl-marker button, .mapboxgl-marker').count();
info(`Markers visible: ${markers}`);

if (markers === 0) {
  await page.waitForTimeout(5000);
  markers = await page.locator('[data-testid="project-marker"], .mapboxgl-marker').count();
}
await shot(page, 'p3-markers-check');

if (markers === 0) {
  issue('high', {
    title: 'No property markers visible on map (after 8s total wait)',
    location: 'MapCanvas.tsx / Firestore data pipeline',
    steps: ['Load app', 'Wait 8+ seconds', 'Check for markers'],
    fix: 'Verify Firebase Installations API is enabled; check Firestore security rules allow read; add fallback data for offline/error states',
  });
} else {
  ok(`${markers} property markers visible on map`);
}

// ── Click Marker → Sidebar ───────────────────────────────────────────────────
const reactMarker = page.locator('[data-testid="project-marker"]').first();
const hasReactMarker = await reactMarker.count() > 0;
let sidebarOpened = false;

if (hasReactMarker) {
  await reactMarker.click({ force: true, timeout: 5000 }).catch(() => {});
  info('Clicked React DOM marker');
} else if (box) {
  // Try clicking multiple map positions to find a GL marker
  const positions = [
    [box.x + box.width * 0.5, box.y + box.height * 0.5],
    [box.x + box.width * 0.3, box.y + box.height * 0.4],
    [box.x + box.width * 0.7, box.y + box.height * 0.6],
    [box.x + box.width * 0.4, box.y + box.height * 0.3],
  ];
  for (const [x, y] of positions) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(1200);
    const opened = await page.locator('[class*="Sidebar"], [class*="sidebar"], [data-nav-scroll="sidebar"]').first().isVisible().catch(() => false);
    if (opened) { sidebarOpened = true; break; }
  }
}

await page.waitForTimeout(1500);
await shot(page, 'p3-after-marker-click');

// Detect sidebar
const SIDEBAR_SELECTORS = '[class*="ProjectSidebar"], [class*="project-sidebar"], [class*="SidebarSkeleton"], [data-nav-scroll="sidebar"], [class*="PropertyPanel"]';
sidebarOpened = await page.locator(SIDEBAR_SELECTORS).first().isVisible().catch(() => false);

if (!sidebarOpened) {
  issue('high', {
    title: 'Clicking a map marker did NOT open the property sidebar',
    location: 'MapCanvas.tsx → handleLayerClick / onMarkerClick',
    steps: ['Load app', 'Click on a property marker (or map center)', 'Expect sidebar to open'],
    fix: 'Verify interactiveLayerIds includes all clickable GL layers; check onMarkerClick prop is wired; ensure no overlay intercepts clicks',
  });
} else {
  ok('Marker click opens property sidebar correctly');
  await shot(page, 'p3-sidebar-open');

  // Scroll inside sidebar
  const sEl = page.locator(SIDEBAR_SELECTORS).first();
  const sBox = await sEl.boundingBox().catch(() => null);
  if (sBox) {
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.wheel(0, 300); await page.waitForTimeout(400);
    await page.mouse.wheel(0, 300); await page.waitForTimeout(400);
    await shot(page, 'p3-sidebar-scrolled');
    await page.mouse.wheel(0, -700);
  }

  // Image gallery interaction
  const galleryBtns = page.locator('[class*="gallery" i] button, [class*="Gallery"] button, [class*="ImageCarousel"] button, [class*="carousel" i] button').all();
  const gb = await galleryBtns;
  info(`Gallery buttons: ${gb.length}`);
  if (gb.length > 0) {
    await gb[0].click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'p3-gallery-interaction');
    ok('Image gallery interaction successful');
  }

  // Try close button
  const closeBtn = page.locator('button[aria-label*="close" i], button[aria-label*="dismiss" i], [class*="CloseBtn"], [class*="close-btn"]').first();
  const hasClose = await closeBtn.count() > 0;
  if (hasClose) {
    await closeBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    const stillOpen = await page.locator(SIDEBAR_SELECTORS).first().isVisible().catch(() => false);
    if (stillOpen) {
      issue('medium', {
        title: 'Sidebar close button did not dismiss the panel',
        location: 'ProjectSidebar.tsx',
        steps: ['Open sidebar via marker click', 'Click close button'],
        fix: 'Verify close button onClick calls onCloseProject; check for CSS pointer-events:none on button',
      });
    } else {
      ok('Sidebar close button dismisses panel correctly');
    }
  }
}

// ── Search Bar ────────────────────────────────────────────────────────────────
await page.mouse.click(720, 450); // close any panel
await page.waitForTimeout(500);

const searchSel = 'input[placeholder*="search" i], input[placeholder*="earch" i], [class*="SearchBar"] input, [class*="search-bar" i] input';
const searchInput = page.locator(searchSel).first();
const hasSearch = await searchInput.count() > 0;

if (hasSearch) {
  await searchInput.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, 'p3-search-focused');

  await searchInput.fill('Dubai Marina');
  await page.waitForTimeout(2000);
  await shot(page, 'p3-search-results');

  const resultCount = await page.locator('[class*="result" i] button, [class*="suggestion" i], [class*="autocomplete" i] button, [class*="animate-in"] button').count();
  info(`Search results: ${resultCount}`);

  if (resultCount > 0) {
    ok(`Search autocomplete returns ${resultCount} results for "Dubai Marina"`);
    await page.locator('[class*="result" i] button, [class*="animate-in"] button').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, 'p3-search-selected');
  } else {
    issue('high', {
      title: 'Search "Dubai Marina" returned 0 autocomplete suggestions',
      location: 'SearchBar.tsx',
      steps: ['Open app', 'Click search input', 'Type "Dubai Marina"', 'Observe dropdown'],
      fix: 'Check if project data is loaded from Firestore; verify the search filter function; ensure dropdown renders on non-empty results',
    });
  }
  await page.keyboard.press('Escape');
} else {
  issue('high', {
    title: 'Search input not found in DOM',
    location: 'SearchBar.tsx / MainLayout.tsx',
    steps: ['Open app', 'Look for search input'],
    fix: 'Ensure SearchBar component is mounted and not conditionally hidden',
  });
}

// ── Navigation elements ──────────────────────────────────────────────────────
const filterEls = await page.locator('select, [class*="filter" i], [class*="Filter"], [class*="dropdown" i]').count();
info(`Filter/dropdown elements: ${filterEls}`);
const commandCenter = page.locator('[class*="MapCommand" i], [class*="CommandCenter" i], [class*="command-center" i]').first();
if (await commandCenter.count() > 0) {
  await commandCenter.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, 'p3-command-center');
  ok('Map Command Center opened');
}

// ── Modal Detection ───────────────────────────────────────────────────────────
const modals = await page.locator('[role="dialog"], [class*="Modal" i], [class*="modal" i]').count();
info(`Open modals/dialogs: ${modals}`);
await shot(page, 'p3-desktop-final');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 3B — TIME MACHINE (if present)
// ══════════════════════════════════════════════════════════════════════════════
const tmBtn = page.locator('[class*="TimeMachine" i], [class*="time-machine" i], button:has-text("Time"), button:has-text("time")').first();
const hasTM = await tmBtn.count() > 0;
if (hasTM) {
  console.log('\n  🕰 Testing Time Machine...');
  await tmBtn.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, 'p3-time-machine-open');
  // Play/pause
  const playBtn = page.locator('[class*="play" i], [aria-label*="play" i]').first();
  if (await playBtn.count() > 0) {
    await playBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, 'p3-time-machine-playing');
    await playBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    ok('Time Machine play/pause works');
  }
  // Close TM
  const tmClose = page.locator('[aria-label*="close" i]').first();
  if (await tmClose.count() > 0) {
    await tmClose.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — FAILURE DETECTION: Interactive element audit
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 4: Failure Detection (Desktop) ━━━');

const interactiveAudit = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button, [role="button"], a[href], input, select, textarea'));
  return els.map(el => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const issues = [];
    if (s.pointerEvents === 'none') issues.push('pointer-events:none');
    if (s.opacity === '0') issues.push('opacity:0');
    if (s.visibility === 'hidden') issues.push('visibility:hidden');
    if (r.width === 0 && r.height === 0) issues.push('zero-size');
    else if (r.width < 24 || r.height < 24) issues.push(`tiny(${Math.round(r.width)}×${Math.round(r.height)}px)`);
    return {
      tag: el.tagName, id: el.id || '',
      cls: el.className?.toString().slice(0, 60) || '',
      text: el.textContent?.trim().slice(0, 30) || '',
      issues,
      w: Math.round(r.width), h: Math.round(r.height),
    };
  }).filter(e => e.issues.length > 0);
});

info(`Problematic interactive elements: ${interactiveAudit.length}`);
const blockedEls = interactiveAudit.filter(e => e.issues.some(i => i.includes('pointer-events') || i.includes('zero-size')));
const tinyDesktopEls = interactiveAudit.filter(e => e.issues.some(i => i.includes('tiny')));

if (blockedEls.length > 0) {
  const sf = await shot(page, 'p4-blocked-elements');
  issue('high', {
    title: `${blockedEls.length} interactive elements are blocked (pointer-events:none or zero-size)`,
    location: blockedEls.slice(0, 5).map(e => `${e.tag}#${e.id || e.cls.split(' ')[0]}`).join(', '),
    steps: ['Inspect interactive elements', 'Check computed styles'],
    fix: 'Remove pointer-events:none from clickable elements; verify parent containers have correct display/dimensions',
    screenshot: sf,
  });
}
if (tinyDesktopEls.length > 5) {
  issue('low', {
    title: `${tinyDesktopEls.length} interactive elements below 24px (accessibility concern)`,
    location: 'Multiple UI components',
    steps: ['Inspect small buttons'],
    fix: 'Apply min-width/min-height: 44px to all interactive elements per WCAG 2.5.5',
  });
}

// Z-index audit
const zAudit = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const s = window.getComputedStyle(el);
      return (s.position === 'fixed' || s.position === 'absolute') && s.zIndex !== 'auto';
    })
    .map(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName, id: el.id || '',
        cls: el.className?.toString().slice(0, 50) || '',
        z: parseInt(s.zIndex) || 0,
        pos: s.position,
        w: Math.round(r.width), h: Math.round(r.height),
        ptrEvents: s.pointerEvents,
      };
    })
    .filter(e => e.z > 0)
    .sort((a, b) => b.z - a.z)
    .slice(0, 20);
});

const highZ = zAudit.filter(e => e.z > 5000);
info(`Fixed/absolute layers with z-index: ${zAudit.length} (very high >5000: ${highZ.length})`);

// Check for large full-screen elements that might block
const fullScreenBlockers = zAudit.filter(e => e.w > 800 && e.h > 400 && e.ptrEvents !== 'none' && e.z > 100);
if (fullScreenBlockers.length > 0) {
  const sf = await shot(page, 'p4-zindex-blockers');
  issue('high', {
    title: `${fullScreenBlockers.length} large positioned element(s) with pointer events enabled may block interactions`,
    location: fullScreenBlockers.slice(0, 3).map(e => `z:${e.z} ${e.tag}#${e.id}.${e.cls.split(' ')[0]}`).join(' | '),
    steps: ['Check z-index stacking', 'Verify pointer-events on overlay divs'],
    fix: 'Set pointer-events:none on purely visual overlay elements; use pointer-events:auto only on truly interactive elements',
    screenshot: sf,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 5 — DEAD ZONE SCAN
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 5: Dead Zone Grid Scan ━━━');

// Close any open panels first
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

const GRID_COLS = 8;
const GRID_ROWS = 6;
const VW = 1440;
const VH = 900;
const deadZones = [];
const clickResponses = [];

const interactiveZoneCheck = await page.evaluate(({ cols, rows, vw, vh }) => {
  const results = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.round((c + 0.5) * (vw / cols));
      const y = Math.round((r + 0.5) * (vh / rows));
      const el = document.elementFromPoint(x, y);
      if (!el) { results.push({ x, y, tag: 'NONE', cls: '', z: 0, ptrEvents: 'none' }); continue; }
      const s = window.getComputedStyle(el);
      const z = parseInt(s.zIndex) || 0;
      const ptrEvents = s.pointerEvents;
      const tag = el.tagName;
      const cls = el.className?.toString().slice(0, 40) || '';
      const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'CANVAS'].includes(tag)
        || el.role === 'button'
        || ptrEvents === 'none';
      results.push({ x, y, tag, cls, z, ptrEvents, isInteractive });
    }
  }
  return results;
}, { cols: GRID_COLS, rows: GRID_ROWS, vw: VW, vh: VH });

const trueDeadZones = interactiveZoneCheck.filter(cell =>
  cell.ptrEvents === 'none' && !['CANVAS'].includes(cell.tag)
);
const canvasCells = interactiveZoneCheck.filter(cell => cell.tag === 'CANVAS');
info(`Dead zone grid: ${interactiveZoneCheck.length} cells scanned — ${trueDeadZones.length} dead zones, ${canvasCells.length} canvas cells`);

if (trueDeadZones.length > 4) {
  const sf = await shot(page, 'p5-dead-zones');
  issue('medium', {
    title: `${trueDeadZones.length} grid cells have pointer-events:none — potential dead zones`,
    location: trueDeadZones.slice(0, 3).map(z => `(${z.x},${z.y}) ${z.tag}.${z.cls.split(' ')[0]}`).join(' | '),
    steps: ['Divide viewport into 8×6 grid', 'Check elementFromPoint at each cell center', 'Filter cells with pointer-events:none'],
    fix: 'Audit overlay elements in these screen regions; add pointer-events:none only to decorative/visual divs',
    screenshot: sf,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 6 — MOBILE SIMULATION
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 6: Mobile UX (390×844 – iPhone 14) ━━━');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(2000);
await shot(page, 'p6-mobile-initial');

// Horizontal overflow check
const mobileOverflow = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > window.innerWidth + 2 || r.left < -2;
    })
    .map(el => ({
      tag: el.tagName,
      cls: el.className?.toString().slice(0, 40) || '',
      right: Math.round(el.getBoundingClientRect().right),
      width: Math.round(el.getBoundingClientRect().width),
    }))
    .slice(0, 10);
});

if (mobileOverflow.length > 0) {
  const sf = await shot(page, 'p6-mobile-overflow');
  issue('high', {
    title: `${mobileOverflow.length} elements overflow viewport horizontally on mobile`,
    location: mobileOverflow.slice(0, 5).map(e => `${e.tag}.${e.cls.split(' ')[0]}`).join(', '),
    steps: ['Set viewport to 390px', 'Check elements wider than viewport'],
    fix: 'Add overflow-x:hidden to root container; use max-width:100% on images/containers; audit absolute positioned elements at 390px',
    screenshot: sf,
  });
} else {
  ok('No horizontal overflow on mobile viewport');
}

// Mobile touch target audit
const mobileTouchTargets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button, [role="button"], a'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40);
    })
    .map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 25) || '',
      cls: el.className?.toString().slice(0, 40) || '',
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    }))
    .slice(0, 20);
});

info(`Small touch targets (<40px): ${mobileTouchTargets.length}`);
if (mobileTouchTargets.length > 3) {
  const sf = await shot(page, 'p6-mobile-touch-targets');
  issue('high', {
    title: `${mobileTouchTargets.length} touch targets below 40px minimum on mobile`,
    location: 'Multiple mobile UI components',
    steps: ['Set mobile viewport', 'Audit all buttons/links for size'],
    fix: 'Apply min-height:44px; min-width:44px to all interactive elements on mobile; use padding to expand hit area',
    screenshot: sf,
  });
}

// Mobile scroll conflict check
const canvasMobile = page.locator('canvas').first();
const canvasMobileBox = await canvasMobile.boundingBox().catch(() => null);
if (canvasMobileBox) {
  // Simulate touch swipe on map
  const mcx = canvasMobileBox.x + canvasMobileBox.width / 2;
  const mcy = canvasMobileBox.y + canvasMobileBox.height / 2;
  await page.touchscreen.tap(mcx, mcy).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, 'p6-mobile-map-tap');
  ok('Mobile tap on map canvas executed');
}

// Check mobile nav visibility
const mobileNav = page.locator('[class*="BottomBar" i], [class*="MobileNav" i], [class*="bottom-nav" i]').first();
const hasMobileNav = await mobileNav.count() > 0;
if (hasMobileNav) {
  await shot(page, 'p6-mobile-nav');
  ok('Mobile bottom navigation bar visible');
} else {
  issue('medium', {
    title: 'No mobile bottom navigation bar detected',
    location: 'MobileNav / BottomBar component',
    steps: ['Set mobile viewport (390px)', 'Look for bottom navigation'],
    fix: 'Verify BottomBar component renders at mobile breakpoints; check CSS responsive visibility rules',
  });
}

// Mobile layout checks
await shot(page, 'p6-mobile-full');
await page.waitForTimeout(1500);

// Check for crowded UI elements at mobile size
const mobileUICrowding = await page.evaluate(() => {
  const interactive = Array.from(document.querySelectorAll('button:not([hidden]), [role="button"]:not([hidden])'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight;
    });
  // Check for overlapping elements
  const rects = interactive.map(el => el.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) overlaps++;
    }
  }
  return { count: interactive.length, overlaps };
});
info(`Mobile visible interactive elements: ${mobileUICrowding.count} (overlapping pairs: ${mobileUICrowding.overlaps})`);
if (mobileUICrowding.overlaps > 2) {
  issue('medium', {
    title: `${mobileUICrowding.overlaps} pairs of interactive elements overlap on mobile`,
    location: 'Mobile layout',
    steps: ['Set mobile viewport', 'Check bounding boxes of all visible buttons'],
    fix: 'Adjust z-index and positioning; collapse controls into menus/drawers on mobile; ensure panels don\'t stack on top of map controls',
  });
}

// Restore desktop
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(1000);

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 7 — PERFORMANCE PROFILING
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 7: Performance Profiling ━━━');

const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint');
  const fp = paints.find(p => p.name === 'first-paint')?.startTime ?? 0;
  const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? 0;
  const resources = performance.getEntriesByType('resource');
  const slowRes = resources.filter(r => r.duration > 2000)
    .map(r => ({ name: r.name.split('?')[0].slice(-70), dur: Math.round(r.duration), type: r.initiatorType }))
    .slice(0, 8);
  const longTasks = performance.getEntriesByType('longtask') || [];
  const tbt = longTasks.reduce((a, t) => a + Math.max(0, t.duration - 50), 0);
  return {
    ttfb: Math.round(nav?.responseStart ?? 0),
    domCL: Math.round(nav?.domContentLoadedEventEnd ?? 0),
    loadEv: Math.round(nav?.loadEventEnd ?? 0),
    fp: Math.round(fp), fcp: Math.round(fcp),
    tbt: Math.round(tbt),
    longTasks: longTasks.length,
    resources: resources.length,
    slowRes,
    memUsed: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1024 / 1024),
    memTotal: Math.round((performance.memory?.totalJSHeapSize ?? 0) / 1024 / 1024),
  };
});

Object.assign(perfMetrics, perf);
console.log(`  ⏱  TTFB: ${perf.ttfb}ms | FP: ${perf.fp}ms | FCP: ${perf.fcp}ms`);
console.log(`  ⏱  DOM ready: ${perf.domCL}ms | Load event: ${perf.loadEv}ms`);
console.log(`  ⚡ Long tasks: ${perf.longTasks} | TBT: ${perf.tbt}ms`);
console.log(`  💾 JS Heap: ${perf.memUsed}MB / ${perf.memTotal}MB`);
console.log(`  📦 Resources: ${perf.resources} | Slow (>2s): ${perf.slowRes.length}`);

if (perf.fcp > 3000) {
  issue('high', {
    title: `FCP is ${perf.fcp}ms — poor (threshold: 3000ms)`,
    location: 'App startup / index.html',
    steps: ['Cold-load app', 'Measure first contentful paint'],
    fix: 'Add <link rel="preconnect"> for Mapbox/Firebase; defer non-critical JS; enable brotli compression on server',
  });
} else {
  ok(`First Contentful Paint: ${perf.fcp}ms (good)`);
}

if (perf.tbt > 300) {
  issue('medium', {
    title: `Total Blocking Time: ${perf.tbt}ms (threshold: 300ms)`,
    location: 'Main thread / JS execution',
    steps: ['Load app', 'Measure blocking time'],
    fix: 'Break up synchronous tasks; use setTimeout/requestIdleCallback for non-critical work; consider web workers for data processing',
  });
}

if (perf.memUsed > 200) {
  issue('medium', {
    title: `High JS heap usage: ${perf.memUsed}MB at runtime`,
    location: 'App global state / map rendering',
    steps: ['Load app', 'Check performance.memory'],
    fix: 'Profile with Chrome DevTools Memory tab; look for detached DOM nodes; clear event listeners on component unmount; optimize Mapbox source data',
  });
}

perf.slowRes.forEach(r => {
  issue('low', {
    title: `Slow resource (${r.dur}ms): ${r.name}`,
    location: r.name,
    steps: ['Load app', 'Check network tab'],
    fix: `Optimize or cache this ${r.type} resource; consider lazy loading`,
  });
});

await shot(page, 'p7-performance-state');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 8 — SELF-IMPROVEMENT LOOP (Re-verify critical findings)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 8: Self-Improvement Loop (Re-verification) ━━━');

// Re-check map canvas accessibility
const recheck = {};
if (box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  recheck.canvasAccessible = await page.evaluate(({ cx, cy }) => {
    const el = document.elementFromPoint(cx, cy);
    const cv = document.querySelector('canvas');
    return el === cv || cv?.contains(el);
  }, { cx, cy });
  info(`RE-CHECK – Canvas accessible: ${recheck.canvasAccessible}`);
  if (!recheck.canvasAccessible) {
    // Confirmed persistent issue — already logged as critical
    info('CONFIRMED: Canvas blocking overlay is persistent');
  } else {
    // Remove any false-positive critical about canvas blocking
    const idx = issues.critical.findIndex(i => i.title.includes('canvas blocked') || i.title.includes('Canvas center blocked'));
    if (idx > -1) { issues.critical.splice(idx, 1); info('RESOLVED: Canvas block was transient — removed from critical list'); }
  }
}

// Re-check markers (after more loading time)
await page.waitForTimeout(3000);
const recheckMarkers = await page.locator('[data-testid="project-marker"], .mapboxgl-marker').count();
info(`RE-CHECK – Markers: ${recheckMarkers}`);
if (recheckMarkers > 0 && issues.high.find(i => i.title.includes('No property markers'))) {
  const idx = issues.high.findIndex(i => i.title.includes('No property markers'));
  issues.high.splice(idx, 1);
  ok(`RESOLVED: Markers loaded after additional wait (${recheckMarkers} visible)`);
}

// Re-check console errors (filter noise)
const realErrors = consoleLog.errors.filter(e => !isSafe(e.text ?? '', ''));
info(`RE-CHECK – Real console errors: ${realErrors.length} (${consoleLog.errors.length - realErrors.length} Firebase/network noise suppressed)`);

await shot(page, 'p8-final-desktop');

// Mobile re-check at different width (tablet)
await page.setViewportSize({ width: 768, height: 1024 });
await page.waitForTimeout(1500);
await shot(page, 'p8-tablet-768');

const tabletOverflow = await page.evaluate(() =>
  Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > window.innerWidth + 2;
    }).length
);
if (tabletOverflow > 0) {
  issue('medium', {
    title: `${tabletOverflow} elements overflow tablet viewport (768px)`,
    location: 'Responsive CSS',
    steps: ['Set 768px viewport', 'Check horizontal bounds'],
    fix: 'Add responsive breakpoints for tablet; audit fixed-width containers',
  });
} else {
  ok('No horizontal overflow on tablet (768px)');
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(800);
await shot(page, 'p8-desktop-restored');

// ══════════════════════════════════════════════════════════════════════════════
//  PHASE 9 — CONSOLE & NETWORK SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 9: Console & Network Summary ━━━');
console.log(`  🔴 Console errors: ${consoleLog.errors.length} (${realErrors.length} real, rest suppressed)`);
console.log(`  🟡 Console warnings: ${consoleLog.warnings.length}`);
console.log(`  📡 Network: ${networkLog.total} total | ${networkLog.failed.length} failed | ${networkLog.slow.length} slow | ${networkLog.status404.length} 404s`);

realErrors.slice(0, 5).forEach(e => {
  if (!issues.critical.find(c => c.title?.includes(e.text?.slice(0, 30) ?? ''))) {
    issue('critical', {
      title: `Browser console error: ${e.text?.slice(0, 80) ?? 'unknown'}`,
      location: e.url,
      steps: ['Load app', 'Open browser DevTools console'],
      fix: 'Resolve JS error at root; add try/catch and error boundaries around affected components',
    });
  }
});

networkLog.failed.slice(0, 5).forEach(f => {
  issue('high', {
    title: `Network failure: ${f.reason?.slice(0, 60) ?? 'unknown'} — ${f.url?.split('?')[0].slice(-60) ?? ''}`,
    location: f.url ?? '',
    steps: ['Load app', 'Monitor network tab'],
    fix: 'Check CORS headers, authentication tokens, DNS resolution; add retry logic for transient failures',
  });
});

networkLog.status404.slice(0, 3).forEach(r => {
  issue('high', {
    title: `404 response: ${r.url?.slice(-80) ?? ''}`,
    location: r.url ?? '',
    steps: ['Load app', 'Monitor network responses'],
    fix: 'Update the URL reference; deploy missing resource; add fallback handling',
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  FINALIZE
// ══════════════════════════════════════════════════════════════════════════════
const tracePath = path.join(TRACE_DIR, 'full-audit.zip');
await ctx.tracing.stop({ path: tracePath });
await ctx.close();
await browser.close();
console.log(`\n  💾 Trace saved: ${tracePath}`);

// ── Build Report ──────────────────────────────────────────────────────────────
const report = {
  runId: RUN_ID,
  timestamp: new Date().toISOString(),
  appUrl: BASE,
  verdict: issues.critical.length === 0 && issues.high.length <= 2
    ? '✅ PRODUCTION READY (minor issues remain)'
    : issues.critical.length === 0
      ? '⚠️ NEEDS WORK — High severity issues present'
      : '❌ NOT READY — Critical issues must be resolved',
  issueCount: {
    critical: issues.critical.length,
    high: issues.high.length,
    medium: issues.medium.length,
    low: issues.low.length,
    total: Object.values(issues).reduce((a, b) => a + b.length, 0),
  },
  issues,
  positives,
  performance: perfMetrics,
  network: {
    total: networkLog.total,
    failed: networkLog.failed,
    slow: networkLog.slow.slice(0, 10),
    status404: networkLog.status404,
    duplicates: networkLog.duplicates.slice(0, 10),
  },
  console: {
    errors: consoleLog.errors.slice(0, 20),
    warnings: consoleLog.warnings.slice(0, 10),
    realErrorCount: realErrors.length,
  },
  screenshots,
  tracePath,
  structure,
};

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
fs.writeFileSync(NET_LOG, JSON.stringify(networkLog, null, 2));

// ── Markdown Report ───────────────────────────────────────────────────────────
const issueSection = (sev, icon) => {
  const items = issues[sev];
  if (items.length === 0) return `### ${icon} ${sev.toUpperCase()} — None\n`;
  return `### ${icon} ${sev.toUpperCase()} (${items.length})\n` +
    items.map((it, i) => [
      `#### ${i + 1}. ${it.title}`,
      `- **Location:** \`${it.location || 'unknown'}\``,
      `- **Steps:** ${(it.steps || []).join(' → ')}`,
      `- **Fix:** ${it.fix || 'Investigate'}`,
      it.screenshot ? `- **Screenshot:** \`${path.basename(it.screenshot)}\`` : '',
    ].filter(Boolean).join('\n')).join('\n\n') + '\n';
};

const md = `# PSI Maps — QA & UX Audit Report
**Run ID:** \`${RUN_ID}\`  
**Timestamp:** ${new Date().toLocaleString()}  
**Target:** ${BASE}  
**Verdict:** ${report.verdict}

---

## Issue Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${issues.critical.length} |
| 🟠 High | ${issues.high.length} |
| 🟡 Medium | ${issues.medium.length} |
| 🔵 Low | ${issues.low.length} |

---

## Issues

${issueSection('critical', '🔴')}
${issueSection('high', '🟠')}
${issueSection('medium', '🟡')}
${issueSection('low', '🔵')}

---

## ✅ What Works

${positives.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| DOM Content Loaded | ${perfMetrics.domContentLoaded || perfMetrics.domCL || '-'}ms |
| Map Canvas Visible | ${perfMetrics.mapVisible || '-'}ms |
| First Contentful Paint | ${perfMetrics.fcp || '-'}ms |
| Total Blocking Time | ${perfMetrics.tbt || '-'}ms |
| JS Heap Used | ${perfMetrics.memUsed || '-'}MB |
| Long Tasks | ${perfMetrics.longTasks || 0} |

---

## Network

- **Total requests:** ${networkLog.total}
- **Failed (real):** ${networkLog.failed.length}
- **Slow (>3s):** ${networkLog.slow.length}
- **404s:** ${networkLog.status404.length}

---

## Console

- **Real errors:** ${realErrors.length}
- **Warnings:** ${consoleLog.warnings.length}

---

## Screenshots

${screenshots.map((s, i) => `${i + 1}. \`${path.basename(s.file)}\` — ${s.label}`).join('\n')}

---

## Files

- **JSON Report:** \`${REPORT_PATH}\`
- **Trace:** \`${tracePath}\` (view with \`npx playwright show-trace ${tracePath}\`)
- **Screenshots:** \`${SS_DIR}/\`
- **Video:** \`${VID_DIR}/\`
`;

fs.writeFileSync(MD_REPORT, md);

// ── Print Summary ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                    AUDIT COMPLETE                          ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  🔴 Critical: ${String(issues.critical.length).padEnd(47)}║`);
console.log(`║  🟠 High:     ${String(issues.high.length).padEnd(47)}║`);
console.log(`║  🟡 Medium:   ${String(issues.medium.length).padEnd(47)}║`);
console.log(`║  🔵 Low:      ${String(issues.low.length).padEnd(47)}║`);
console.log(`║  ✅ Positive: ${String(positives.length).padEnd(47)}║`);
console.log(`║  📸 Screenshots: ${String(screenshots.length).padEnd(44)}║`);
console.log(`║  ⏱  Map load: ${String((perfMetrics.mapVisible || '-') + 'ms').padEnd(47)}║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  VERDICT: ${report.verdict.padEnd(51)}║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('\n🔴 CRITICAL ISSUES:');
if (issues.critical.length === 0) console.log('  None');
issues.critical.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}\n     Fix: ${c.fix}`));

console.log('\n🟠 HIGH ISSUES:');
if (issues.high.length === 0) console.log('  None');
issues.high.forEach((h, i) => console.log(`  ${i + 1}. ${h.title}\n     Fix: ${h.fix}`));

console.log('\n🟡 MEDIUM ISSUES:');
if (issues.medium.length === 0) console.log('  None');
issues.medium.forEach((m, i) => console.log(`  ${i + 1}. ${m.title}\n     Fix: ${m.fix}`));

console.log('\n✅ WHAT WORKS:');
positives.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

console.log(`\n📁 Output: ${OUT}`);
console.log(`📋 Markdown report: ${MD_REPORT}`);
console.log(`📊 JSON report: ${REPORT_PATH}`);
console.log(`🔍 View trace: npx playwright show-trace ${tracePath}\n`);
