/**
 * PSI Maps – Playwright Shared Helpers
 *
 * Provides:
 *  - Network interceptor (XHR + fetch logging)
 *  - Console log collector
 *  - DOM snapshot utility
 *  - Performance timing extractor
 *  - Screenshot wrapper
 *  - Scroll tracker
 */

import { Page, Request, Response, ConsoleMessage } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export interface NetworkEntry {
  type: 'request' | 'response' | 'failed';
  url: string;
  method?: string;
  status?: number;
  resourceType?: string;
  timestamp: string;
  headers?: Record<string, string>;
}

export interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: string;
}

export interface PerformanceTiming {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  ttfb: number;
}

export interface DebugSession {
  networkLog: NetworkEntry[];
  consoleLog: ConsoleEntry[];
  screenshots: string[];
  snapshots: { label: string; html: string }[];
  performance?: PerformanceTiming;
}

// ─────────────────────────────────────────────────────────────────
// Output directories
// ─────────────────────────────────────────────────────────────────
const RESULTS_DIR = path.resolve('./playwright-results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');
const SNAPSHOTS_DIR = path.join(RESULTS_DIR, 'snapshots');
const NETWORK_DIR = path.join(RESULTS_DIR, 'network');

[RESULTS_DIR, SCREENSHOTS_DIR, SNAPSHOTS_DIR, NETWORK_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─────────────────────────────────────────────────────────────────
// Network Instrumentation
// ─────────────────────────────────────────────────────────────────
export function attachNetworkLogger(page: Page, session: DebugSession) {
  page.on('request', (req: Request) => {
    session.networkLog.push({
      type: 'request',
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      timestamp: new Date().toISOString(),
      headers: req.headers(),
    });
  });

  page.on('response', (res: Response) => {
    session.networkLog.push({
      type: 'response',
      url: res.url(),
      status: res.status(),
      resourceType: res.request().resourceType(),
      timestamp: new Date().toISOString(),
      headers: res.headers(),
    });
  });

  page.on('requestfailed', (req: Request) => {
    session.networkLog.push({
      type: 'failed',
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      timestamp: new Date().toISOString(),
    });
    console.warn(`[NETWORK FAIL] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
}

// ─────────────────────────────────────────────────────────────────
// Console Log Collector
// ─────────────────────────────────────────────────────────────────
export function attachConsoleLogger(page: Page, session: DebugSession) {
  page.on('console', (msg: ConsoleMessage) => {
    const entry: ConsoleEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
    };
    session.consoleLog.push(entry);

    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.warn(`[BROWSER WARN] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err: Error) => {
    session.consoleLog.push({
      type: 'pageerror',
      text: err.message + '\n' + err.stack,
      timestamp: new Date().toISOString(),
    });
    console.error(`[PAGE ERROR] ${err.message}`);
  });
}

// ─────────────────────────────────────────────────────────────────
// DOM Snapshot
// ─────────────────────────────────────────────────────────────────
export async function captureSnapshot(
  page: Page,
  session: DebugSession,
  label: string,
) {
  const html = await page.content();
  const filename = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.html`;
  const filepath = path.join(SNAPSHOTS_DIR, filename);
  fs.writeFileSync(filepath, html, 'utf8');
  session.snapshots.push({ label, html });
  console.log(`[SNAPSHOT] Saved: ${filepath}`);
  return filepath;
}

// ─────────────────────────────────────────────────────────────────
// Screenshot on Action
// ─────────────────────────────────────────────────────────────────
export async function screenshotAction(
  page: Page,
  session: DebugSession,
  label: string,
) {
  const filename = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  session.screenshots.push(filepath);
  console.log(`[SCREENSHOT] ${label} → ${filepath}`);
  return filepath;
}

// ─────────────────────────────────────────────────────────────────
// Performance Timing
// ─────────────────────────────────────────────────────────────────
export async function capturePerformance(page: Page): Promise<PerformanceTiming> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paints = performance.getEntriesByType('paint');
    const fp = paints.find(p => p.name === 'first-paint')?.startTime ?? 0;
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? 0;
    return {
      navigationStart: 0,
      domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
      loadComplete: nav?.loadEventEnd ?? 0,
      firstPaint: fp,
      firstContentfulPaint: fcp,
      ttfb: nav?.responseStart ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Scroll Tracker (inject via page.evaluate)
// ─────────────────────────────────────────────────────────────────
export async function attachScrollTracker(page: Page) {
  await page.evaluate(() => {
    const log: { y: number; t: number }[] = [];
    (window as any).__scrollLog = log;
    window.addEventListener('scroll', () => {
      log.push({ y: window.scrollY, t: Date.now() });
    }, { passive: true });
  });
}

export async function getScrollLog(page: Page) {
  return page.evaluate(() => (window as any).__scrollLog ?? []);
}

// ─────────────────────────────────────────────────────────────────
// Interaction Tracker (clicks + inputs)
// ─────────────────────────────────────────────────────────────────
export async function attachInteractionTracker(page: Page) {
  await page.evaluate(() => {
    const events: { type: string; target: string; value?: string; t: number }[] = [];
    (window as any).__interactionLog = events;

    document.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      events.push({
        type: 'click',
        target: el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.trim().split(' ')[0]}` : ''),
        t: Date.now(),
      });
    }, true);

    document.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      events.push({
        type: 'input',
        target: el.tagName + (el.id ? `#${el.id}` : '') + (el.name ? `[name="${el.name}"]` : ''),
        value: el.value?.slice(0, 60),
        t: Date.now(),
      });
    }, true);
  });
}

export async function getInteractionLog(page: Page) {
  return page.evaluate(() => (window as any).__interactionLog ?? []);
}

// ─────────────────────────────────────────────────────────────────
// Session Report (write JSON summary to disk)
// ─────────────────────────────────────────────────────────────────
export async function finalizeSession(
  page: Page,
  session: DebugSession,
  label: string,
) {
  session.performance = await capturePerformance(page);

  const report = {
    label,
    timestamp: new Date().toISOString(),
    performance: session.performance,
    consoleErrors: session.consoleLog.filter(e => e.type === 'error' || e.type === 'pageerror'),
    consoleWarnings: session.consoleLog.filter(e => e.type === 'warning'),
    networkFailed: session.networkLog.filter(e => e.type === 'failed'),
    networkTotal: session.networkLog.length,
    screenshots: session.screenshots,
    snapshotLabels: session.snapshots.map(s => s.label),
  };

  const filename = `session-${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
  const filepath = path.join(NETWORK_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n[SESSION REPORT] → ${filepath}`);
  return report;
}

// ─────────────────────────────────────────────────────────────────
// Factory: create a fresh session object
// ─────────────────────────────────────────────────────────────────
export function createSession(): DebugSession {
  return {
    networkLog: [],
    consoleLog: [],
    screenshots: [],
    snapshots: [],
  };
}
