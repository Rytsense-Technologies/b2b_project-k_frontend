import { expect, test } from '@playwright/test';
import { ROLES } from './roles';
import { VIEWPORTS, expectHealthyPage, settled, signedInContext, watch } from './journeys-helpers';

const PATHS = {
  'super admin': ['/superadmin/dashboard', '/superadmin/universities', '/superadmin/colleges', '/superadmin/departments', '/superadmin/academics', '/superadmin/users', '/superadmin/content', '/superadmin/reports', '/superadmin/health', '/superadmin/notifications', '/superadmin/settings'],
  'college admin': ['/admin/dashboard', '/admin/structure', '/admin/content', '/admin/mcq', '/admin/students', '/admin/staff', '/admin/analytics', '/admin/reports', '/admin/notifications', '/admin/settings'],
  HOD: ['/faculty/dashboard', '/faculty/videos', '/faculty/mcq', '/faculty/subjects', '/faculty/students', '/faculty/staff', '/faculty/analytics', '/faculty/reports', '/faculty/notifications', '/faculty/settings'],
  faculty: ['/faculty/dashboard', '/faculty/videos', '/faculty/mcq', '/faculty/subjects', '/faculty/students', '/faculty/analytics', '/faculty/notifications', '/faculty/settings'],
  student: ['/student/home', '/student/subjects', '/student/leaderboard', '/student/progress', '/student/notifications', '/student/settings'],
};

for (const role of ROLES) {
  for (const vp of VIEWPORTS) {
    test.describe(`${role.name} at ${vp.label}`, () => {
      let context;
      let page;
      let problems;

      test.beforeAll(async ({ browser }) => {
        context = await signedInContext(browser, role, { viewport: { width: vp.width, height: vp.height } });
        page = await context.newPage();
        problems = watch(page);
      });
      test.afterAll(async () => {
        await context.close();
      });

      test('the sidebar offers exactly the expected pages', async () => {
        await page.goto(role.home);
        await settled(page);
        // The sidebar mounts on the client after hydration (and the HOD/faculty split after the
        // profile loads), so wait for the list rather than reading it once (firefox at 768).
        await expect
          .poll(async () => (await page
            .locator('aside nav a[href]')
            .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')))])).sort())
          .toEqual([...PATHS[role.name]].sort());
      });

      for (const path of PATHS[role.name]) {
        test(`${path} loads cleanly`, async () => {
          problems.length = 0;
          await page.goto(path);
          await settled(page);
          await page.waitForTimeout(400);
          await expectHealthyPage(page, problems);
        });
      }
    });
  }
}
