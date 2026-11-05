import { expect, test } from '@playwright/test';
import { STUDENT, api, expectHealthyPage, settled, signInPatiently, signedInContext, unique, watch, journeyViewport } from './journeys-helpers';

// Password work uses college B's student, so the sessions other specs share stay valid.
const OTHER_STUDENT = { name: 'student b', env: 'E2E_STUDENT_B_EMAIL', home: '/student/home' };

test.describe('profile', () => {
  test.describe.configure({ mode: 'serial' });
  let context;
  let page;
  let problems;

  test.beforeAll(async ({ browser }) => {
    context = await signedInContext(browser, STUDENT, { viewport: journeyViewport() });
    page = await context.newPage();
    problems = watch(page);
  });
  test.afterAll(async () => {
    await context.close();
  });

  const phone = () => page.getByLabel('Phone number');
  const save = () => page.getByRole('button', { name: /^Save/ });
  // The form is reset with the saved profile once it loads; typing before that is wiped (XB, Chromium run 2).
  const openSettings = async () => {
    await page.goto('/student/settings');
    await settled(page);
    await expect(page.getByLabel('First name')).not.toHaveValue('');
  };

  for (const bad of ['12345', '+915123456789', '05123456789']) {
    test(`phone number ${bad} is refused on the field`, async () => {
      await openSettings();
      await phone().fill(bad);
      await phone().blur();
      await expect(save()).toBeDisabled();
      await expect(page.getByText('Enter a 10-digit Indian mobile number')).toBeVisible();
    });
  }

  test('an eleventh digit is not accepted into the phone field', async () => {
    await openSettings();
    await phone().fill('98765432100');
    await expect(phone()).toHaveValue('+91 98765 43210');
    await phone().fill('abcdefghij');
    await expect(phone()).toHaveValue('+91');
  });

  test('a valid edit saves, and survives a refresh', async () => {
    const name = `Stu${unique('').slice(-5).replace(/[0-9]/g, 'x')}`;
    await openSettings();
    await page.getByLabel('First name').fill(name);
    await phone().fill('9876543210');
    await save().click();
    await expect(page.getByText('Your changes are saved.')).toBeVisible();
    await page.reload();
    await settled(page);
    await expect(page.getByLabel('First name')).toHaveValue(name);
    await expect(phone()).toHaveValue(/98765\s?43210/);
    await expectHealthyPage(page, problems);
  });
});

test('change password ends the session, the old one stops working, the new one signs in', async ({ browser }) => {
  process.env.E2E_STUDENT_B_EMAIL = process.env.E2E_STUDENT_EMAIL.replace('-a@', '-b@');
  const original = process.env.E2E_PASSWORD;
  const next = `Qa${unique('Zz')}9`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInPatiently(page, OTHER_STUDENT);

  let changed = false;
  try {
    await page.goto('/student/settings?tab=security');
    await settled(page);
    await page.getByRole('button', { name: /Change password/i }).first().click();
    const dialog = page.getByRole('dialog');

    // Wrong current password stays on the field.
    await dialog.locator('#current_password').fill(`${original}x`);
    await dialog.locator('#new_password').fill(next);
    await dialog.locator('#confirm_password').fill(next);
    await dialog.getByRole('button', { name: /Change password|Update password|Save/i }).click();
    await expect(dialog.getByRole('alert').first()).toBeVisible();

    // Mismatch is caught before the server.
    await dialog.locator('#current_password').fill(original);
    await dialog.locator('#confirm_password').fill(`${next}x`);
    await dialog.getByRole('button', { name: /Change password|Update password|Save/i }).click();
    await expect(dialog.getByRole('alert').first()).toBeVisible();

    await dialog.locator('#confirm_password').fill(next);
    // The server's answer decides whether the account must be restored, not the toast: WebKit can
    // finish the redirect to sign-in before the toast is seen (XB, WebKit run 1 lost the reset).
    const answer = page.waitForResponse((r) => r.url().includes('/auth/change-password') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: /Change password|Update password|Save/i }).click();
    const res = await answer;
    changed = res.ok();
    expect(res.status(), 'change password').toBeLessThan(300);
    await page.waitForURL(/\/auth\/login/);

    await page.getByLabel('Email').fill(process.env.E2E_STUDENT_B_EMAIL);
    await page.locator('#password').fill(original);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('body')).toContainText(/incorrect|invalid|wrong/i);

    await signInPatiently(page, OTHER_STUDENT, next);
  } finally {
    // Leave the seeded account usable whatever happened above.
    if (changed) {
      if (!page.url().includes('/student/')) await signInPatiently(page, OTHER_STUDENT, next);
      const reset = await api(page, 'POST', '/auth/change-password', {
        current_password: next,
        new_password: original,
        confirm_password: original,
      });
      if (reset.status >= 400) console.log(`password reset answered ${reset.status}`);
    }
    await context.close();
  }
});
