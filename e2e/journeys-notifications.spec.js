import { expect, test } from '@playwright/test';
import { CA, FACULTY, HOD, SA, STUDENT, api, expectHealthyPage, settled, signedInContext, watch, journeyViewport } from './journeys-helpers';

const SCOPES = [
  { role: SA, path: '/superadmin/notifications?tab=rules' },
  { role: CA, path: '/admin/notifications?tab=rules' },
  { role: HOD, path: '/faculty/notifications?tab=rules' },
  { role: FACULTY, path: '/faculty/settings?tab=notifications' },
  { role: STUDENT, path: '/student/settings?tab=notifications' },
];

for (const { role, path } of SCOPES) {
  test(`${role.name} rule switch saves, survives a reload, and is put back`, async ({ browser }) => {
    const context = await signedInContext(browser, role, { viewport: journeyViewport() });
    const page = await context.newPage();
    const problems = watch(page);
    await page.goto(path);
    await settled(page);
    let tab = page.getByRole('tab', { name: /rules|notifications/i }).first();
    if (await tab.count()) await tab.click();
    tab = null;
    const toggle = page.locator('[role=switch]:not([disabled])').first();
    await expect(toggle).toBeVisible();
    const name = (await toggle.getAttribute('aria-label')) || '';
    const was = await toggle.getAttribute('aria-checked');
    const now = was === 'true' ? 'false' : 'true';
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', now);
    await page.reload();
    await settled(page);
    const again = page.locator('[role=switch]:not([disabled])').first();
    await expect(again, `saved state of ${name}`).toHaveAttribute('aria-checked', now);
    await again.click();
    await expect(again).toHaveAttribute('aria-checked', was);
    await expectHealthyPage(page, problems);
    await context.close();
  });
}

test('the bell opens, closes on Escape, and Mark all as read clears the count', async ({ browser }) => {
  const context = await signedInContext(browser, STUDENT, { viewport: journeyViewport() });
  const page = await context.newPage();
  const problems = watch(page);
  await page.goto('/student/home');
  await settled(page);
  const bell = page.getByRole('button', { name: /^Alerts/ });
  await bell.click();
  const panel = page.getByRole('region', { name: 'Your alerts' });
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  const inbox = await api(page, 'GET', '/notifications/inbox');
  if (/new/.test((await bell.getAttribute('aria-label')) || '')) {
    await bell.click();
    await panel.getByRole('button', { name: /Mark all/ }).click();
    await expect(bell).toHaveAccessibleName('Alerts');
  }
  expect(inbox.status).toBeLessThan(500);
  await expectHealthyPage(page, problems);
  await context.close();
});
