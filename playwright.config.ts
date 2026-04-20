import { defineConfig, devices } from '@playwright/test';

/**
 * PSI Maps – Playwright Configuration
 *
 * Debug mode is toggled via the DEBUG_MODE env var:
 *   DEBUG_MODE=true npx playwright test
 *
 * Trace files land in: playwright-results/traces/
 * Screenshots land in: playwright-results/screenshots/
 */

const isDebugMode = process.env.DEBUG_MODE === 'true';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  // ──────────────────────────────────────────────
  // Directories
  // ──────────────────────────────────────────────
  testDir: './playwright/tests',
  outputDir: './playwright-results/test-artifacts',

  // ──────────────────────────────────────────────
  // Global behaviour
  // ──────────────────────────────────────────────
  fullyParallel: false,       // run sequentially so traces are clean
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                 // single worker for deterministic traces
  timeout: isDebugMode ? 120_000 : 60_000,
  expect: { timeout: isDebugMode ? 30_000 : 10_000 },

  // HTML + JSON reporters so we can review failures visually
  reporter: [
    ['html', { outputFolder: './playwright-results/report', open: 'never' }],
    ['json', { outputFile: './playwright-results/results.json' }],
    ['line'],
  ],

  use: {
    baseURL: BASE_URL,

    // ── Browser appearance ──────────────────────
    headless: !isDebugMode,   // headed when DEBUG_MODE=true
    slowMo: isDebugMode ? 600 : 0,

    // ── Tracing (always on, full detail in debug) ────────────────
    trace: 'on',              // record every run; view with: npx playwright show-trace
    video: isDebugMode ? 'on' : 'retain-on-failure',
    screenshot: 'on',

    // ── Viewport ───────────────────────────────
    viewport: { width: 1440, height: 900 },

    // ── Extra HTTP headers for clarity in network logs ─────────
    extraHTTPHeaders: {
      'X-Playwright-Session': 'psi-maps-debug',
    },
  },

  // ──────────────────────────────────────────────
  // Projects (browsers)
  // ──────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          // give the map engine enough time
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
          ],
        },
      },
    },
  ],

  // ──────────────────────────────────────────────
  // Dev-server auto-start (optional)
  // ──────────────────────────────────────────────
  // Uncomment to have Playwright boot the Vite dev server automatically:
  // webServer: {
  //   command: '/opt/homebrew/bin/node ./node_modules/.bin/vite --port 3000',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 30_000,
  // },
});
