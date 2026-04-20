#!/usr/bin/env node
/**
 * PSI Maps – Playwright Runner Script
 *
 * A convenience wrapper that sets up the correct Node binary path
 * and passes arguments to the Playwright CLI.
 *
 * Usage examples:
 *
 *   Run all tests (headless):
 *     node playwright/run.mjs
 *
 *   Debug mode (headed + slowMo + full trace):
 *     node playwright/run.mjs --debug
 *
 *   Run specific test file:
 *     node playwright/run.mjs --test user-journey
 *
 *   Open Trace Viewer on last trace:
 *     node playwright/run.mjs --trace
 *
 *   Open HTML report:
 *     node playwright/run.mjs --report
 */

import { spawnSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const PW_CLI = join(ROOT, 'node_modules', '.bin', 'playwright');

const args = process.argv.slice(2);
const isDebug = args.includes('--debug');
const showTrace = args.includes('--trace');
const showReport = args.includes('--report');
const testFilter = args.find(a => a.startsWith('--test='))?.split('=')[1]
  ?? (args.indexOf('--test') !== -1 ? args[args.indexOf('--test') + 1] : null);

// ── Show trace viewer ─────────────────────────────────────────────
if (showTrace) {
  const traceDir = join(ROOT, 'playwright-results', 'traces');
  if (!existsSync(traceDir)) {
    console.error('[ERROR] No traces directory found. Run tests first.');
    process.exit(1);
  }
  const traces = readdirSync(traceDir)
    .filter(f => f.endsWith('.zip'))
    .sort()
    .reverse();
  if (traces.length === 0) {
    console.error('[ERROR] No trace files found. Run tests first.');
    process.exit(1);
  }
  const latestTrace = join(traceDir, traces[0]);
  console.log(`[TRACE] Opening: ${latestTrace}`);
  spawnSync(PW_CLI, ['show-trace', latestTrace], { stdio: 'inherit', env: process.env });
  process.exit(0);
}

// ── Open HTML report ─────────────────────────────────────────────
if (showReport) {
  const reportDir = join(ROOT, 'playwright-results', 'report');
  spawnSync(PW_CLI, ['show-report', reportDir], { stdio: 'inherit', env: process.env });
  process.exit(0);
}

// ── Build test command ────────────────────────────────────────────
const pwArgs = ['test'];

if (testFilter) {
  pwArgs.push(`playwright/tests/${testFilter}.spec.ts`);
}

if (isDebug) {
  pwArgs.push('--headed');
}

const env = {
  ...process.env,
  ...(isDebug ? { DEBUG_MODE: 'true' } : {}),
  BASE_URL: process.env.BASE_URL ?? 'http://localhost:3000',
};

console.log('[PSI Playwright]', isDebug ? '🐛 DEBUG MODE' : '⚡ NORMAL MODE');
console.log('[PSI Playwright] Running:', PW_CLI, pwArgs.join(' '));
console.log('[PSI Playwright] Target:', env.BASE_URL);
console.log('');

const result = spawnSync(PW_CLI, pwArgs, {
  stdio: 'inherit',
  env,
  cwd: ROOT,
});

process.exit(result.status ?? 0);
