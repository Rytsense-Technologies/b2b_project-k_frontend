import { expect, test } from '@playwright/test';
import { FACULTY, HOD, STUDENT, api, ids, settled, signedInContext, journeyViewport } from './journeys-helpers';

const OTHER_STUDENT = () => process.env.E2E_STUDENT_EMAIL.replace('-a@', '-b@');

for (const role of [HOD, FACULTY]) {
  test.describe(`${role.name} scope`, () => {
    let context;
    let page;
    test.beforeAll(async ({ browser }) => {
      context = await signedInContext(browser, role, { viewport: journeyViewport() });
      page = await context.newPage();
    });
    test.afterAll(async () => {
      await context.close();
    });

    test('the students page lists only their own college', async () => {
      await page.goto('/faculty/students');
      await settled(page);
      await expect(page.locator('body')).not.toContainText(OTHER_STUDENT());
      await expect(page.locator('body')).not.toContainText('College B');
    });

    test('another college subject is not shown by URL', async () => {
      const { b } = ids();
      await page.goto(`/faculty/subjects/${b.subject}`);
      await settled(page);
      await expect(page.locator('body')).not.toContainText('Physics B');
    });

    test('another college student is refused by the API', async () => {
      const { b } = ids();
      await page.goto('/faculty/dashboard');
      const res = await api(page, 'GET', `/users/${b.st}`);
      expect([403, 404]).toContain(res.status);
    });

    if (role === FACULTY) {
      for (const path of ['/faculty/staff', '/faculty/reports']) {
        test(`${path} is not offered to faculty`, async () => {
          await page.goto(path);
          await settled(page);
          await expect(page.getByText("We couldn't find that page")).toBeVisible();
        });
      }
    }
  });
}

test('a student sees only their own college on the leaderboard', async ({ browser }) => {
  const context = await signedInContext(browser, STUDENT, { viewport: journeyViewport() });
  const page = await context.newPage();
  await page.goto('/student/leaderboard');
  await settled(page);
  await expect(page.locator('body')).not.toContainText('College B');
  const { b } = ids();
  const res = await api(page, 'GET', `/users/${b.st}`);
  expect([401, 403, 404]).toContain(res.status);
  await context.close();
});
