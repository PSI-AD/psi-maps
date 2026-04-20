/**
 * PSI Maps — Full Production Audit Script
 * Run with: /opt/homebrew/bin/node playwright/audit.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'playwright-results');
const SS_DIR = path.join(OUT, 'screenshots');
const TRACE_DIR = path.join(OUT, 'traces');
const SNAP_DIR = path.join(OUT, 'snapshots');
const NET_DIR = path.join(OUT, 'network');
const VID_DIR = path.join(OUT, 'videos');

// Create all output dirs
[OUT, SS_DIR, TRACE_DIR, SNAP_DIR, NET_DIR, VID_DIR].forEach(d =>
  fs.mkdirSync(d, { recursive: true })
);

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const IS_DEBUG = process.env.DEBUG_MODE === 'true';

// ─── Audit state ──────────────────────────────────────────────────────────────
const auditLog = {
  critical: [],
  major: [],
  minor: [],
  performance: [],
  visual: [],
  positive: [],
  network: { total: 0, failed: [], slow: [], status404: [], duplicates: [] },
  console: { errors: [], warnings: [], info: [] },
  screenshots: [],
  timeline: [],
};

let ssCounter = 0;
async function shot(page, label) {
  ssCounter++;
  const fname = `${String(ssCounter).padStart(3, '0')}-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
  const fpath = path.join(SS_DIR, fname);
  await page.screenshot({ path: fpath, fullPage: false });
  auditLog.screenshots.push({ label, file: fpath });
  auditLog.timeline.push({ t: new Date().toISOString(), event: `screenshot: ${label}` });
  console.log(`  📸 ${label}`);
  return fpath;
}

function log(level, obj) {
  auditLog[level].push(obj);
  const emoji = { critical: '🔴', major: '🟠', minor: '🟡', performance: '⚡', visual: '🎨', positive: '✅' }[level] || '•';
  console.log(`  ${emoji} [${level.toUpperCase()}] ${obj.title || obj.metric || obj.description}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║     PSI MAPS — FULL PRODUCTION AUDIT                ║');
console.log(`║     Target: ${BASE.padEnd(40)}║`);
console.log('╚══════════════════════════════════════════════════════╝\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: IS_DEBUG ? 600 : 120,
  args: ['--disable-web-security', '--no-sandbox', '--disable-features=VizDisplayCompositor'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: VID_DIR, size: { width: 1440, height: 900 } },
});

await context.tracing.start({ screenshots: true, snapshots: true, sources: true, title: 'PSI Maps Audit' });

const page = await context.newPage();
const urlCounts = {};
const reqTimes = {};

// ─── Network instrumentation ──────────────────────────────────────────────────
page.on('request', req => {
  const url = req.url();
  urlCounts[url] = (urlCounts[url] || 0) + 1;
  if (urlCounts[url] === 2) auditLog.network.duplicates.push(url);
  reqTimes[url] = Date.now();
  auditLog.network.total++;
});

page.on('response', async res => {
  const url = res.url();
  const status = res.status();
  const duration = Date.now() - (reqTimes[url] || Date.now());
  if (status === 404) auditLog.network.status404.push({ url, status });
  if (duration > 3000) auditLog.network.slow.push({ url, duration });
});

page.on('requestfailed', req => {
  auditLog.network.failed.push({ url: req.url(), reason: req.failure()?.errorText });
});

page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') auditLog.console.errors.push({ text, url: page.url() });
  else if (type === 'warning') auditLog.console.warnings.push({ text });
  else auditLog.console.info.push({ text });
});

page.on('pageerror', err => {
  auditLog.console.errors.push({ text: err.message, stack: err.stack, url: page.url(), type: 'pageerror' });
  log('critical', { title: `Page Error: ${err.message.slice(0, 80)}`, location: page.url(), fix: 'Investigate stack trace and resolve JS runtime error' });
});

// ════════════════════════════════════════════════════════════
// PHASE 1: Initial Load
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 1: Initial Load ━━━');
const t0 = Date.now();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
const ttDomReady = Date.now() - t0;
await shot(page, 'initial-paint');
console.log(`  ⏱  DOM ready: ${ttDomReady}ms`);

// Wait for the map canvas
let mapVisible = false;
try {
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 20_000 });
  mapVisible = true;
} catch { /* noop */ }

const ttFull = Date.now() - t0;
await shot(page, 'after-load');
console.log(`  ⏱  Full load (map visible): ${ttFull}ms`);

if (ttFull > 8000) {
  log('performance', { metric: 'Initial load time', observed: `${ttFull}ms`, threshold: '8000ms', fix: 'Lazy-load non-critical components; preconnect to Mapbox and Firebase CDNs' });
}
if (!mapVisible) {
  log('critical', { title: 'Map canvas not rendered within 20s', location: 'MapCanvas.tsx', fix: 'Verify Mapbox token, check network access to Mapbox tile servers, debug MapCanvas render cycle' });
}

// Welcome banner check
const banner = await page.locator('[class*="banner"], [class*="welcome"], [class*="Welcome"]').first();
const hasBanner = await banner.count() > 0;
if (hasBanner) {
  log('positive', { description: 'Welcome banner present and visible' });
  await shot(page, 'welcome-banner');
  // Wait for banner to dismiss
  await page.waitForTimeout(6000);
  await shot(page, 'after-banner-dismiss');
} else {
  await page.waitForTimeout(3000);
}

// ════════════════════════════════════════════════════════════
// PHASE 2: Map Interaction
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 2: Map Interaction ━━━');

// Get map canvas bounds
const canvas = page.locator('canvas').first();
const canvasBox = await canvas.boundingBox().catch(() => null);
if (canvasBox) {
  const cx = canvasBox.x + canvasBox.width / 2;
  const cy = canvasBox.y + canvasBox.height / 2;
  console.log(`  📐 Canvas: ${Math.round(canvasBox.width)}×${Math.round(canvasBox.height)} at (${Math.round(canvasBox.x)},${Math.round(canvasBox.y)})`);

  // Check for overlay blocking canvas
  const overlayCheck = await page.evaluate(({ cx, cy }) => {
    const topEl = document.elementFromPoint(cx, cy);
    const canvas = document.querySelector('canvas');
    return {
      topTag: topEl?.tagName,
      topId: (topEl as HTMLElement)?.id || '',
      topClass: (topEl as HTMLElement)?.className?.toString().slice(0, 60) || '',
      isCanvas: topEl === canvas || canvas?.contains(topEl),
    };
  }, { cx, cy });

  console.log(`  🔍 Element at canvas center: ${overlayCheck.topTag}#${overlayCheck.topId} (isCanvas: ${overlayCheck.isCanvas})`);

  if (!overlayCheck.isCanvas) {
    log('critical', {
      title: `Canvas center blocked by: ${overlayCheck.topTag}#${overlayCheck.topId} .${overlayCheck.topClass}`,
      location: 'MapCanvas.tsx / App.tsx overlay layer',
      fix: 'Set pointer-events: none on overlay wrappers that sit above the map canvas; ensure transparent layers do not capture mouse events'
    });
  } else {
    log('positive', { description: 'Map canvas receives clicks at center (no overlay blocking)' });
  }

  // Zoom in
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -300); await page.waitForTimeout(800);
  await page.mouse.wheel(0, -300); await page.waitForTimeout(800);
  await shot(page, 'map-zoomed-in');

  // Drag
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 150, cy - 80, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await shot(page, 'map-after-drag');

  // Zoom back out
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, 400); await page.waitForTimeout(500);
  await page.mouse.wheel(0, 400); await page.waitForTimeout(500);
  await shot(page, 'map-zoomed-out');
} else {
  log('critical', { title: 'Map canvas bounding box not found', location: 'MapCanvas.tsx', fix: 'Ensure canvas element renders with non-zero dimensions' });
}

// Check for markers
const markerCount = await page.locator('[class*="mapboxgl-marker"], [class*="marker"]').count();
console.log(`  📍 Markers found: ${markerCount}`);
if (markerCount === 0) {
  log('major', { title: 'No property markers detected on map', location: 'MapCanvas / ProjectMarker.tsx', fix: 'Check Firestore data loading; verify marker render conditions; ensure markers are within current viewport bounds' });
} else {
  log('positive', { description: `${markerCount} map markers visible` });
}
await shot(page, 'map-with-markers');

// Try clicking first visible marker
if (markerCount > 0) {
  const firstMarker = page.locator('[class*="mapboxgl-marker"]').first();
  const markerBox = await firstMarker.boundingBox().catch(() => null);
  if (markerBox) {
    const tClick = Date.now();
    await firstMarker.click({ force: true, timeout: 5000 }).catch(() => {});
    const tSidebar = Date.now();
    await page.waitForTimeout(1500);
    await shot(page, 'after-marker-click');

    const sidebarOpen = await page.locator('[class*="sidebar"], [class*="Sidebar"], [class*="ProjectSidebar"], [class*="analysis"]').first().count() > 0;
    if (!sidebarOpen) {
      log('major', { title: 'Clicking a map marker did not open property sidebar', location: 'ProjectMarker.tsx → handleMarkerClick', fix: 'Verify onClick handler chain: ProjectMarker → handleMarkerClick → setIsAnalysisOpen; check z-index and pointer-events on marker element' });
    } else {
      log('positive', { description: 'Marker click opens property sidebar correctly' });
      await shot(page, 'sidebar-open');
      console.log(`  ⏱  Sidebar open latency: ${tSidebar - tClick}ms`);
      if (tSidebar - tClick > 1000) {
        log('performance', { metric: 'Sidebar open latency', observed: `${tSidebar - tClick}ms`, threshold: '500ms', fix: 'Pre-mount sidebar in DOM; avoid re-fetch on open if data is already in state' });
      }
    }
  }
}

// ════════════════════════════════════════════════════════════
// PHASE 3: UI Element Inspection
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 3: UI Element Audit ━━━');

// Detect non-clickable interactive elements
const blockedEls = await page.evaluate(() => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a[href], input, select'));
  return targets.map(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const issues = [];
    if (style.pointerEvents === 'none') issues.push('pointer-events:none');
    if (style.opacity === '0') issues.push('opacity:0');
    if (style.visibility === 'hidden') issues.push('visibility:hidden');
    if (rect.width < 24 || rect.height < 24) issues.push(`tiny(${Math.round(rect.width)}×${Math.round(rect.height)})`);
    if (rect.width === 0 || rect.height === 0) issues.push('zero-size');
    return {
      tag: el.tagName,
      id: el.id,
      cls: el.className?.toString().slice(0, 50),
      text: el.textContent?.trim().slice(0, 30),
      issues,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    };
  }).filter(el => el.issues.length > 0);
});

console.log(`  🔎 Problematic interactive elements: ${blockedEls.length}`);
blockedEls.slice(0, 15).forEach(el => {
  const issues = el.issues.join(', ');
  if (issues.includes('pointer-events') || issues.includes('zero-size')) {
    log('major', { title: `${el.tag}#${el.id || ''}.${el.cls?.split(' ')[0]} — ${issues}`, location: 'UI Layer (see class)', fix: `Remove pointer-events:none from interactive ${el.tag}; ensure element has non-zero dimensions` });
  } else if (issues.includes('tiny')) {
    log('minor', { title: `Small touch target: ${el.tag} "${el.text}" (${el.w}×${el.h}px)`, location: 'UI Layer', fix: 'Increase to minimum 44×44px touch target per WCAG 2.5.5' });
  }
});

// Search bar test
console.log('\n  Testing search bar...');
const searchInput = page.locator('input[placeholder*="earch" i], input[type="search"], [class*="SearchBar"] input').first();
const hasSearch = await searchInput.count() > 0;
if (hasSearch) {
  await searchInput.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, 'searchbar-focused');
  await searchInput.fill('Marina');
  await page.waitForTimeout(1500);
  await shot(page, 'searchbar-with-results');
  const results = await page.locator('[class*="result"], [class*="Result"], [class*="dropdown"], [class*="suggestion"]').count();
  console.log(`  🔍 Search results shown: ${results}`);
  if (results === 0) {
    log('major', { title: 'Search "Marina" returned no visible dropdown results', location: 'SearchBar.tsx', fix: 'Verify Firestore project data contains "Marina"; check if input change handler fires; confirm dropdown render condition' });
  } else {
    log('positive', { description: `Search autocomplete works — ${results} suggestions shown for "Marina"` });
    // click first result
    await page.locator('[class*="result"], [class*="Result"], [class*="dropdown"] li, [class*="suggestion"]').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await shot(page, 'search-result-selected');
  }
  await page.keyboard.press('Escape');
} else {
  log('major', { title: 'Search input not found on page', location: 'SearchBar.tsx / MainLayout.tsx', fix: 'Ensure SearchBar component mounts and input is not conditionally hidden' });
}

// ════════════════════════════════════════════════════════════
// PHASE 4: Sidebar Detail Flow
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 4: Sidebar/Property Detail ━━━');
await shot(page, 'phase4-start');

// Check if sidebar is already open from phase 2
let sidebarEl = page.locator('[class*="ProjectSidebar"], [class*="project-sidebar"], [class*="BottomControlBar"], [class*="analysis"]').first();
let sidebarVisible = await sidebarEl.count() > 0;
console.log(`  Sidebar visible: ${sidebarVisible}`);

if (sidebarVisible) {
  const sidebarBox = await sidebarEl.boundingBox().catch(() => null);
  if (sidebarBox) {
    // Scroll inside sidebar
    await page.mouse.move(sidebarBox.x + sidebarBox.width / 2, sidebarBox.y + sidebarBox.height / 2);
    await page.mouse.wheel(0, 300); await page.waitForTimeout(400);
    await page.mouse.wheel(0, 300); await page.waitForTimeout(400);
    await shot(page, 'sidebar-scrolled');
    await page.mouse.wheel(0, -600); await page.waitForTimeout(300);
  }

  // Look for close button
  const closeBtns = await page.locator('button[aria-label*="close" i], button[title*="close" i], [class*="close"]:not(style), button svg').all();
  console.log(`  🔘 Potential close buttons: ${closeBtns.length}`);

  // Try clicking X / close
  const xBtn = page.locator('button:has(svg line), button:has([data-close]), [class*="close-btn"], [class*="CloseBtn"]').first();
  if (await xBtn.count() > 0) {
    await xBtn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(800);
    const stillOpen = await sidebarEl.count() > 0;
    if (stillOpen) {
      log('major', { title: 'Sidebar close button exists but did not close the panel', location: 'ProjectSidebar.tsx', fix: 'Verify close button onClick calls onCloseProject; check z-index of button vs overlay elements' });
    } else {
      log('positive', { description: 'Sidebar close button works correctly' });
    }
    await shot(page, 'after-sidebar-close');
  }
}

// Click map to dismiss any open panel
await page.mouse.click(720, 450).catch(() => {});
await page.waitForTimeout(500);

// ════════════════════════════════════════════════════════════
// PHASE 5: Navigation & Filters
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 5: Filters & Navigation ━━━');

// Try filter dropdowns
const filterBtns = await page.locator('select, [class*="filter"], [class*="Filter"], [class*="dropdown"]').all();
console.log(`  Filter/dropdown elements: ${filterBtns.length}`);

// Bottom navigation bar (mobile view toggle)
const bottomNav = page.locator('[class*="BottomBar"], [class*="bottom-bar"], [class*="MobileNav"], footer').first();
const hasBottomNav = await bottomNav.count() > 0;
if (hasBottomNav) {
  await shot(page, 'bottom-nav');
  log('positive', { description: 'Bottom navigation bar is present' });
}

// Map command center
const commandCenter = page.locator('[class*="MapCommand"], [class*="command-center"], [class*="CommandCenter"]').first();
const hasCC = await commandCenter.count() > 0;
if (hasCC) {
  await commandCenter.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'command-center-open');
  log('positive', { description: 'Map Command Center is present and clickable' });
}

// ════════════════════════════════════════════════════════════
// PHASE 6: Mobile Simulation
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 6: Mobile UX Simulation ━━━');

// Resize to iPhone 13 Pro
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1500);
await shot(page, 'mobile-390-viewport');

// Check for layout breaks
const layoutCheck = await page.evaluate(() => {
  const overflows = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.right > window.innerWidth + 2 || r.left < -2;
  }).map(el => ({
    tag: el.tagName,
    cls: el.className?.toString().slice(0, 40),
    width: Math.round(el.getBoundingClientRect().width),
    right: Math.round(el.getBoundingClientRect().right),
  })).slice(0, 10);
  return overflows;
});

console.log(`  📱 Horizontal overflow elements: ${layoutCheck.length}`);
if (layoutCheck.length > 0) {
  log('major', { title: `Horizontal overflow on mobile: ${layoutCheck.length} element(s) exceed viewport`, location: layoutCheck.map(e => `${e.tag}.${e.cls}`).join(', ').slice(0, 100), fix: 'Add overflow-x:hidden to root containers; use max-width:100% on images and flex children; audit all absolute/fixed positioned elements at 390px width' });
  layoutCheck.forEach(e => console.log(`    • ${e.tag}.${e.cls?.slice(0, 35)} — right: ${e.right}px (viewport: 390)`));
}

// Touch target audit on mobile
const tinyTargets = await page.evaluate(() => {
  return Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 36);
    })
    .map(el => ({ tag: el.tag, txt: el.textContent?.trim().slice(0, 20), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))
    .slice(0, 15);
});
console.log(`  👆 Small touch targets (<36px): ${tinyTargets.length}`);
if (tinyTargets.length > 3) {
  log('major', { title: `${tinyTargets.length} touch targets are below 36px minimum on mobile`, location: 'Multiple components', fix: 'Apply min-height: 44px; min-width: 44px to all interactive elements; use padding to expand touch area without changing visual size' });
}

await shot(page, 'mobile-touch-targets');

// Restore desktop viewport
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(1000);
await shot(page, 'desktop-restored');

// ════════════════════════════════════════════════════════════
// PHASE 7: Performance Deep Dive
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 7: Performance ━━━');

const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paints = performance.getEntriesByType('paint');
  const fp = paints.find(p => p.name === 'first-paint')?.startTime ?? 0;
  const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? 0;

  // Long tasks
  const longTasks = performance.getEntriesByType('longtask' as any);
  const totalBlockingTime = longTasks.reduce((acc, t) => acc + Math.max(0, t.duration - 50), 0);

  // Resources
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const slowResources = resources
    .filter(r => r.duration > 2000)
    .map(r => ({ name: r.name.split('?')[0].slice(-60), duration: Math.round(r.duration), type: r.initiatorType }));

  return {
    ttfb: Math.round(nav?.responseStart ?? 0),
    domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
    loadEvent: Math.round(nav?.loadEventEnd ?? 0),
    fp: Math.round(fp),
    fcp: Math.round(fcp),
    totalBlockingTime: Math.round(totalBlockingTime),
    longTaskCount: longTasks.length,
    resourceCount: resources.length,
    slowResources: slowResources.slice(0, 5),
  };
});

console.log(`  ⏱  TTFB: ${perf.ttfb}ms | FP: ${perf.fp}ms | FCP: ${perf.fcp}ms`);
console.log(`  ⏱  DOM ready: ${perf.domContentLoaded}ms | Load: ${perf.loadEvent}ms`);
console.log(`  ⚡ Long tasks: ${perf.longTaskCount} | TBT: ${perf.totalBlockingTime}ms`);
console.log(`  📦 Resources: ${perf.resourceCount} | Slow (>2s): ${perf.slowResources.length}`);

if (perf.fcp > 3000) log('performance', { metric: 'First Contentful Paint', observed: `${perf.fcp}ms`, threshold: '3000ms', fix: 'Add preconnect hints for Mapbox/Firebase; defer non-critical JS; enable gzip/brotli compression' });
if (perf.totalBlockingTime > 300) log('performance', { metric: 'Total Blocking Time', observed: `${perf.totalBlockingTime}ms`, threshold: '300ms', fix: 'Break up long synchronous tasks; use setTimeout/requestIdleCallback for non-critical work; consider web workers for data processing' });
if (perf.slowResources.length > 0) {
  perf.slowResources.forEach(r => {
    log('performance', { metric: `Slow resource (${r.type})`, observed: `${r.duration}ms`, threshold: '2000ms', fix: `Optimize: ${r.name}` });
  });
}

// Visual check after full interaction
await shot(page, 'phase7-final-state');

// ════════════════════════════════════════════════════════════
// PHASE 8: Visual / Z-index audit
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 8: Visual & Z-index Audit ━━━');

const zAudit = await page.evaluate(() => {
  const fixed = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
    const s = window.getComputedStyle(el);
    return (s.position === 'fixed' || s.position === 'sticky') && s.zIndex !== 'auto';
  }).map(el => ({
    tag: el.tagName,
    id: el.id,
    cls: el.className?.toString().slice(0, 40),
    z: parseInt(window.getComputedStyle(el).zIndex) || 0,
    pos: window.getComputedStyle(el).position,
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
  })).sort((a, b) => b.z - a.z).slice(0, 15);
  return fixed;
});

console.log(`  🏗  Fixed/sticky layers: ${zAudit.length}`);
const highZ = zAudit.filter(e => e.z > 5000);
if (highZ.length > 0) {
  console.log(`  ⚠️  Very high z-index values detected (>5000):`);
  highZ.forEach(e => console.log(`     • z:${e.z} — ${e.tag}#${e.id}.${e.cls?.split(' ')[0]}`));
  if (highZ.length > 3) {
    log('minor', { title: `${highZ.length} elements with z-index > 5000 — z-index inflation risk`, location: 'Global CSS / styled components', fix: 'Establish a z-index scale (e.g., 100–1000 range); avoid arbitrary high values; use CSS custom properties like --z-modal, --z-tooltip' });
  }
}

// ════════════════════════════════════════════════════════════
// PHASE 9: Error Summary
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 9: Console Error Summary ━━━');
console.log(`  🔴 Console errors: ${auditLog.console.errors.length}`);
console.log(`  🟡 Console warnings: ${auditLog.console.warnings.length}`);

auditLog.console.errors.slice(0, 10).forEach(e => {
  console.log(`     • ${e.text?.slice(0, 120)}`);
  if (!auditLog.critical.find(c => c.title?.includes(e.text?.slice(0, 40)))) {
    const isFirebase = e.text?.includes('firebase') || e.text?.includes('firestore');
    const level = isFirebase ? 'major' : 'critical';
    log(level, { title: `Browser Error: ${e.text?.slice(0, 80)}`, location: e.url, fix: 'Resolve the console error at root cause; add error boundaries around affected components' });
  }
});

// ════════════════════════════════════════════════════════════
// PHASE 10: Final Screenshot & Network Summary
// ════════════════════════════════════════════════════════════
console.log('\n━━━ PHASE 10: Final State ━━━');
await shot(page, 'final-state-desktop');

console.log(`\n  📡 Total requests: ${auditLog.network.total}`);
console.log(`  ❌ Failed requests: ${auditLog.network.failed.length}`);
console.log(`  🐢 Slow requests (>3s): ${auditLog.network.slow.length}`);
console.log(`  🔁 Duplicate requests: ${auditLog.network.duplicates.length}`);
console.log(`  404 responses: ${auditLog.network.status404.length}`);

auditLog.network.failed.slice(0, 5).forEach(f => {
  log('major', { title: `Network failure: ${f.reason}`, location: f.url?.slice(-80), fix: 'Check CORS, DNS, authentication for this endpoint; add retry logic for transient failures' });
});

// ─── Save trace ───────────────────────────────────────────────────────────────
const tracePath = path.join(TRACE_DIR, `audit-${Date.now()}.zip`);
await context.tracing.stop({ path: tracePath });
console.log(`\n  💾 Trace saved: ${tracePath}`);
console.log(`  🔍 View: /opt/homebrew/bin/node ./node_modules/.bin/playwright show-trace ${tracePath}`);

await context.close();
await browser.close();

// ─── Report ───────────────────────────────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  appUrl: BASE,
  loadTime: ttFull,
  performance: perf,
  issues: {
    critical: auditLog.critical,
    major: auditLog.major,
    minor: auditLog.minor,
    performance: auditLog.performance,
    visual: auditLog.visual,
  },
  positive: auditLog.positive,
  network: {
    total: auditLog.network.total,
    failed: auditLog.network.failed.length,
    slow: auditLog.network.slow.slice(0, 10),
    status404: auditLog.network.status404,
    duplicates: auditLog.network.duplicates.slice(0, 10),
  },
  console: {
    errorCount: auditLog.console.errors.length,
    warningCount: auditLog.console.warnings.length,
    errors: auditLog.console.errors.slice(0, 20),
    warnings: auditLog.console.warnings.slice(0, 20),
  },
  screenshots: auditLog.screenshots,
  traceFile: tracePath,
};

const reportPath = path.join(NET_DIR, `audit-report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n  📋 Full JSON report: ${reportPath}`);

// ─── Print summary ─────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║                AUDIT SUMMARY                        ║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log(`║  🔴 Critical: ${String(auditLog.critical.length).padEnd(37)}║`);
console.log(`║  🟠 Major:    ${String(auditLog.major.length).padEnd(37)}║`);
console.log(`║  🟡 Minor:    ${String(auditLog.minor.length).padEnd(37)}║`);
console.log(`║  ⚡ Perf:     ${String(auditLog.performance.length).padEnd(37)}║`);
console.log(`║  🎨 Visual:   ${String(auditLog.visual.length).padEnd(37)}║`);
console.log(`║  ✅ Positive: ${String(auditLog.positive.length).padEnd(37)}║`);
console.log(`║  ⏱  Load:    ${String(ttFull + 'ms').padEnd(38)}║`);
console.log(`║  📸 Screenshots: ${String(auditLog.screenshots.length).padEnd(34)}║`);
console.log('╠══════════════════════════════════════════════════════╣');
const verdict = auditLog.critical.length === 0 ? 'READY FOR RELEASE' : `NOT READY — ${auditLog.critical.length} critical issue(s)`;
console.log(`║  VERDICT: ${verdict.padEnd(43)}║`);
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log('\n🔴 CRITICAL ISSUES:');
auditLog.critical.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}\n     Fix: ${c.fix}`));
console.log('\n🟠 MAJOR ISSUES:');
auditLog.major.forEach((m, i) => console.log(`  ${i + 1}. ${m.title || m.description}\n     Fix: ${m.fix || ''}`));
console.log('\n⚡ PERFORMANCE:');
auditLog.performance.forEach((p, i) => console.log(`  ${i + 1}. ${p.metric}: ${p.observed} (threshold: ${p.threshold})\n     Fix: ${p.fix}`));
console.log('\n✅ WHAT WORKS:');
auditLog.positive.forEach((p, i) => console.log(`  ${i + 1}. ${p.description}`));
