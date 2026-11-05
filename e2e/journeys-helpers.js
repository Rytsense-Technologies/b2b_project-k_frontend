import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { byName, credentials } from './roles';

export const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '768', width: 768, height: 1024 },
  { label: '390', width: 390, height: 844 },
];

/**
 * Viewport for the single-size journeys. A project can run them at another size by setting
 * metadata.journeyViewport (the tablet projects use 768x1024); the default stays 1440x900.
 */
export function journeyViewport() {
  return test.info().project.metadata?.journeyViewport || { width: 1440, height: 900 };
}

export const SA = byName('super admin');
export const CA = byName('college admin');
export const HOD = byName('HOD');
export const FACULTY = byName('faculty');
export const STUDENT = byName('student');

/** Entity ids of the seeded throwaway data, from the file named by E2E_IDS. */
export function ids() {
  if (!process.env.E2E_IDS) throw new Error('Set E2E_IDS to the seed ids.json');
  return JSON.parse(fs.readFileSync(process.env.E2E_IDS, 'utf8'));
}

/** A value no earlier run used, so journeys can repeat on the same database. */
export const unique = (prefix) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// Per stack and per browser: two stacks on one machine (or two browsers whose cookie jars differ)
// must never replay each other's refresh tokens.
function authDir() {
  const base = process.env.E2E_AUTH_DIR || path.join(os.tmpdir(), 'quirri-e2e-auth');
  const port = new URL(process.env.E2E_BASE_URL || 'http://localhost:3000').port || 'default';
  let project = 'default';
  try {
    project = test.info().project.name || project;
  } catch {
    /* outside a test */
  }
  return path.join(base, `${port}-${project.replace(/[^a-z0-9-]/gi, '_')}`);
}
const FRESH_MS = 8 * 60 * 1000;

function statePath(role) {
  return path.join(authDir(), `${role.name.replace(/\s+/g, '-')}.json`);
}

/** Forget a saved session, for a journey that has just ended it on the server. */
export function forgetSession(role) {
  fs.rmSync(statePath(role), { force: true });
}

/** UI sign-in that waits out the login rate limit instead of failing on it. */
export async function signInPatiently(page, role, password) {
  const creds = credentials(role);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(creds.email);
    await page.locator('#password').fill(password || creds.password);
    const answer = page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const res = await answer;
    if (res.status() !== 429) {
      if (!res.ok()) throw new Error(`Sign-in for ${role.name} answered ${res.status()}`);
      await page.waitForURL(`**${role.home}`);
      return;
    }
    await page.waitForTimeout(20_000);
  }
  throw new Error(`Sign-in for ${role.name} stayed rate limited`);
}

/**
 * A signed-in context. The session is reused across files because the login route allows
 * about 5 a minute; a saved file goes stale before its access token does, since replaying an
 * already-rotated refresh token would look like theft to the server.
 */
export async function signedInContext(browser, role, options = {}) {
  fs.mkdirSync(authDir(), { recursive: true });
  const file = statePath(role);
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < FRESH_MS;
  if (!fresh) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInPatiently(page, role);
    await context.storageState({ path: file });
    await context.close();
  }
  return browser.newContext({ ...options, storageState: file });
}

/** Records everything the journey must end without. */
export function watch(page) {
  const problems = [];
  page.on('console', (m) => {
    // Next.js 14 logs this when a navigation started by the test (goto / reload) aborts the
    // sidebar's in-flight link prefetches. Firefox settles the aborted fetch before unload, so it
    // logs; Chromium unloads silently. Next then does a normal navigation; nothing reaches the user.
    if (m.type() === 'error' && /^Failed to fetch RSC payload for .* Falling back to browser navigation\./.test(m.text())) return;
    if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 240)} @ ${m.location().url}`);
  });
  page.on('pageerror', (e) => {
    // WebKit reports every request that a navigation aborts this way, caught by the app or not
    // (probe: /auth/me and the unread count, both handled, still raise it). The app is single-origin
    // behind the proxy, so a real access-control failure cannot occur; Firefox still surfaces
    // genuinely unhandled aborts as AxiosError (XB-005).
    if (/^(?:Error: )?(?:XMLHttpRequest|Fetch API) cannot load \S+ due to access control checks\.$/.test(String(e.message || e))) return;
    problems.push(`pageerror: ${String(e).slice(0, 240)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) problems.push(`${r.status()}: ${r.request().method()} ${r.url()}`);
  });
  return problems;
}

/** Waits for the first paint of data to finish: skeletons and spinners must go away. */
export async function settled(page, timeout = 20_000) {
  await page.waitForLoadState('load');
  await page
    .waitForFunction(
      () => {
        const busy = document.querySelector(
          '[aria-busy="true"], .rps-sk, .qs-skeleton, .skeleton, [class*="skeleton"], [class*="spinner"], [class*="Spinner"]',
        );
        return !busy || !busy.getClientRects().length;
      },
      null,
      { timeout },
    )
    .catch(() => {
      throw new Error(`Stuck loader on ${page.url()}`);
    });
}

/**
 * Waits for the page's entrance motion to end (A11Y-FLAKE-001). `.animate-fade-in` and `.page.show`
 * fade pages in over 200ms; axe measures colour at that instant, so a half-faded text reads as a
 * contrast failure that no user sees at rest. Infinite animations (skeletons, live dots) are
 * ignored, and the wait is capped so a stuck animation cannot hang the test.
 */
export async function motionSettled(page, cap = 3000, quiet = 300) {
  await page.evaluate(async ({ ms, calm }) => {
    const end = Date.now() + ms;
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const moving = () => document.getAnimations().filter((a) => {
      const t = a.effect?.getComputedTiming?.();
      return a.playState === 'running' && t && Number.isFinite(t.endTime);
    });
    // Data that lands after the first paint fades in again, so wait for a quiet spell, not one pass.
    let still = 0;
    while (Date.now() < end && still < calm) {
      const now = moving();
      if (now.length) {
        still = 0;
        await Promise.race([Promise.all(now.map((a) => a.finished.catch(() => {}))), sleep(end - Date.now())]);
      } else {
        await sleep(50);
        still += 50;
      }
    }
  }, { ms: cap, calm: quiet });
}

export async function expectNoSidewaysScroll(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const over = root.scrollWidth - root.clientWidth;
    if (over <= 1) return null;
    const culprits = [...document.body.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > root.clientWidth + 1)
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    return { over, culprits };
  });
  expect(overflow, `sideways scroll on ${page.url()}`).toBeNull();
}

export async function expectHealthyPage(page, problems) {
  await expect(page.locator('body')).not.toContainText('Application error');
  await expect(page.locator('body')).not.toContainText("We couldn't find that page");
  await expectNoSidewaysScroll(page);
  expect(problems, `problems on ${page.url()}`).toEqual([]);
}

/**
 * A sidebar link, opening the drawer first when the sidebar is collapsed into it
 * (below the desktop breakpoint, e.g. the 768x1024 tablet projects).
 */
export async function sidebarLink(page, name, options = {}) {
  const link = page.locator('aside').getByRole('link', { name, ...options });
  // The drawer is slid off-canvas (transform), which Playwright still counts as visible, so decide
  // by the menu button instead and wait until the link is really on screen.
  const open = page.getByRole('button', { name: 'Open menu' });
  if ((await open.isVisible()) && !(await link.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.right > 0 && r.left < window.innerWidth;
  }))) {
    await open.click();
    await expect(link).toBeInViewport();
  }
  return link;
}

/** Same-origin API call using the page's session cookies. */
export async function api(page, method, url, data) {
  const res = await page.request.fetch(`/api/v1${url}`, {
    method,
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}
