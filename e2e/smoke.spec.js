import { expect, test } from '@playwright/test';
import { ROLES, byName, signIn } from './roles';

// Each block signs in once and reuses the page, to stay under the login rate limit.
test.describe.configure({ mode: 'serial' });

test('a signed-out visitor is sent to login', async ({ page }) => {
  await page.goto('/superadmin/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
});

for (const role of ROLES) {
  test.describe(role.name, () => {
    let page;
    const blocked = [];

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      page.on('console', (message) => {
        if (message.text().includes('Content Security Policy')) blocked.push(message.text());
      });
      await signIn(page, role);
    });

    test.afterAll(async () => {
      await page.close();
    });

    test('reaches its dashboard', async () => {
      await expect(page).toHaveURL(new RegExp(`${role.home}$`));
      await expect(page.locator('body')).not.toContainText('Application error');
      expect(blocked).toEqual([]);
    });

    if (role === byName('faculty')) {
      test('gets not found on the HOD staff page', async () => {
        await page.goto('/faculty/staff');
        await expect(page.getByText("We couldn't find that page")).toBeVisible();
      });
    }

    if (role === byName('student')) {
      for (const path of ['/superadmin/dashboard', '/admin/dashboard', '/faculty/dashboard']) {
        test(`is turned away from ${path}`, async () => {
          await page.goto(path);
          await expect(page).toHaveURL(/\/student\/home$/);
        });
      }
    }
  });
}
