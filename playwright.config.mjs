import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Needs a running frontend and API. It starts neither, so it can never reach for
// `npm run dev` on a port someone is using. Set E2E_BASE_URL plus the variables in e2e/roles.js.
// Pick a browser with --project (chromium, firefox, webkit, msedge, chromium-tablet, webkit-tablet).

// Microsoft Edge is a system install, not a Playwright download: the project exists only where Edge does.
const EDGE_PATHS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
const hasEdge = EDGE_PATHS.some((p) => fs.existsSync(p));

// The single-size journeys (not the sweeps, which loop over every viewport themselves).
const JOURNEYS = /journeys-(college-admin|notifications|resilience|scoping|settings|superadmin|browser-apis)\.spec\.js/;
const TABLET = { width: 768, height: 1024 };

export default defineConfig({
  testDir: './e2e',
  // One sign-in per role, and the login route allows about 5 a minute.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ...(hasEdge ? [{ name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } }] : []),
    {
      name: 'chromium-tablet',
      testMatch: JOURNEYS,
      use: { ...devices['Desktop Chrome'] },
      metadata: { journeyViewport: TABLET },
    },
    {
      name: 'webkit-tablet',
      testMatch: JOURNEYS,
      use: { ...devices['Desktop Safari'] },
      metadata: { journeyViewport: TABLET },
    },
  ],
});
