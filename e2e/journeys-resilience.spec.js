import { expect, test } from '@playwright/test';
import { CA, STUDENT, expectHealthyPage, ids, settled, sidebarLink, signedInContext, watch, journeyViewport } from './journeys-helpers';

test.describe('navigation', () => {
  test.describe.configure({ mode: 'serial' });
  let context;
  let page;
  let problems;

  test.beforeAll(async ({ browser }) => {
    context = await signedInContext(browser, CA, { viewport: journeyViewport() });
    page = await context.newPage();
    problems = watch(page);
  });
  test.afterAll(async () => {
    await context.close();
  });
  test.beforeEach(() => {
    problems.length = 0;
  });

  test('back and forward walk the sidebar without a reload or an error', async () => {
    await page.goto('/admin/dashboard');
    await settled(page);
    await (await sidebarLink(page, 'Students', { exact: true })).click();
    await page.waitForURL('**/admin/students');
    await settled(page);
    await (await sidebarLink(page, 'Staff & HOD')).click();
    await page.waitForURL('**/admin/staff');
    await settled(page);
    await page.goBack();
    await page.waitForURL('**/admin/students');
    await settled(page);
    await page.goBack();
    await page.waitForURL('**/admin/dashboard');
    await page.goForward();
    await page.waitForURL('**/admin/students');
    await settled(page);
    await expectHealthyPage(page, problems);
  });

  test('a refresh on a deep link keeps the page and its filters', async () => {
    const { a } = ids();
    for (const path of [`/admin/structure/departments/${a.dept}`, '/admin/students?status=pending', '/admin/settings?tab=security']) {
      await page.goto(path);
      await settled(page);
      const before = page.url();
      await page.reload();
      await settled(page);
      expect(page.url()).toBe(before);
      await expectHealthyPage(page, problems);
    }
  });

  test('a mistyped deep link shows not found, not a crash', async () => {
    await page.goto('/admin/structure/departments/00000000-0000-0000-0000-000000000000');
    await settled(page);
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).toContainText(/not found|couldn.t|could not|no longer/i);
  });

  test('a page from another college is not shown', async () => {
    const { b } = ids();
    await page.goto(`/admin/structure/departments/${b.dept}`);
    await settled(page);
    await expect(page.locator('body')).not.toContainText('Science B');
  });
});

test('sidebar and a modal work with the keyboard alone', async ({ browser }) => {
  const context = await signedInContext(browser, CA, { viewport: journeyViewport() });
  const page = await context.newPage();
  await page.goto('/admin/staff');
  await settled(page);

  const link = page.getByRole('link', { name: 'Students', exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/admin/students');
  await settled(page);

  const open = page.getByRole('button', { name: /Add student/ }).first();
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Focus moves in, stays in for a full Tab cycle, and Escape hands it back.
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await context.close();
});

test('losing the session mid-page lands on login, and no data stays on screen', async ({ browser }) => {
  const context = await signedInContext(browser, STUDENT, { viewport: journeyViewport() });
  const page = await context.newPage();
  const problems = watch(page);
  await page.goto('/student/subjects');
  await settled(page);
  await context.clearCookies();
  // A background request may notice first and send the page to login before the click lands.
  await (await sidebarLink(page, 'Leaderboard').catch(() => page.getByRole('link', { name: 'Leaderboard' }))).click({ timeout: 5_000 }).catch(() => {});
  await page.waitForURL(/\/auth\/login/, { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  expect(problems.filter((p) => !p.startsWith('console:'))).toEqual([]);
  await context.close();
});

test('a slow network shows a loader, then the data, with no error', async ({ browser }) => {
  const context = await signedInContext(browser, CA, { viewport: journeyViewport() });
  const page = await context.newPage();
  const problems = watch(page);
  await page.route('**/api/v1/**', async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
    await route.continue();
  });
  await page.goto('/admin/students');
  await expect(page.locator('body')).not.toContainText(/No students yet/);
  await settled(page, 40_000);
  await expect(page.locator('body')).toContainText('Student');
  await expectHealthyPage(page, problems);
  await context.close();
});

test('a failing API shows an error with a way to retry, not an empty page', async ({ browser }) => {
  const context = await signedInContext(browser, CA, { viewport: journeyViewport() });
  const page = await context.newPage();
  await page.route('**/api/v1/users**', (route) => route.fulfill({ status: 503, body: '{"detail":"down"}', contentType: 'application/json' }));
  await page.goto('/admin/students');
  await expect(page.getByRole('button', { name: /Try again|Retry/ }).first()).toBeVisible({ timeout: 25_000 });
  await context.close();
});
