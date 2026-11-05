import { expect, test } from '@playwright/test';
import { ROLES } from './roles';
import { VIEWPORTS, motionSettled, settled, signedInContext } from './journeys-helpers';

const axePath = require.resolve('axe-core/axe.min.js');

// The owner accepted the brand orange #F5821F (UX-002 / UX-003, 3 Nov 2026): white on #F5821F and
// #F5821F words on white are the guideline. Only colour-contrast nodes whose failing pair names
// #F5821F are dropped; every other contrast failure, and every other rule, still blocks.
const BRAND_ORANGE = /#f5821f(?![0-9a-f])/i;
function brandOrangePair(node) {
  const checks = [...(node.any || []), ...(node.all || []), ...(node.none || [])];
  return checks.some((c) => BRAND_ORANGE.test(String(c.message || ''))
    || BRAND_ORANGE.test(String(c.data?.fgColor || '')) || BRAND_ORANGE.test(String(c.data?.bgColor || '')));
}
function withoutBrandOrange(violations) {
  return violations
    .map((v) => (v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((n) => !brandOrangePair(n)) } : v))
    .filter((v) => v.nodes.length);
}

const PAGES = {
  'super admin': ['/superadmin/dashboard', '/superadmin/universities', '/superadmin/colleges', '/superadmin/departments', '/superadmin/academics', '/superadmin/users', '/superadmin/content', '/superadmin/reports', '/superadmin/health', '/superadmin/notifications', '/superadmin/settings'],
  'college admin': ['/admin/dashboard', '/admin/structure/programmes', '/admin/structure/departments', '/admin/content', '/admin/mcq', '/admin/students', '/admin/staff', '/admin/analytics', '/admin/reports', '/admin/notifications', '/admin/settings'],
  HOD: ['/faculty/dashboard', '/faculty/videos', '/faculty/mcq', '/faculty/subjects', '/faculty/students', '/faculty/staff', '/faculty/analytics', '/faculty/reports', '/faculty/notifications', '/faculty/settings'],
  faculty: ['/faculty/dashboard', '/faculty/videos', '/faculty/mcq', '/faculty/subjects', '/faculty/students', '/faculty/analytics', '/faculty/notifications', '/faculty/settings'],
  student: ['/student/home', '/student/subjects', '/student/leaderboard', '/student/progress', '/student/notifications', '/student/settings'],
};

for (const role of ROLES) {
  for (const vp of VIEWPORTS) {
    test.describe(`axe: ${role.name} at ${vp.label}`, () => {
      let context;
      let page;

      test.beforeAll(async ({ browser }) => {
        context = await signedInContext(browser, role, { viewport: { width: vp.width, height: vp.height } });
        page = await context.newPage();
      });
      test.afterAll(async () => {
        await context.close();
      });

      for (const path of PAGES[role.name]) {
        test(`${path} has no serious accessibility violations`, async () => {
          await page.goto(path);
          await settled(page);
          await motionSettled(page);
          await page.addScriptTag({ path: axePath });
          const { violations } = await page.evaluate(() => window.axe.run());
          const blocking = withoutBrandOrange(violations)
            .filter((v) => ['serious', 'critical'].includes(v.impact))
            .map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 4).map((n) => n.target).join(' | ')} (${v.nodes.length})`);
          expect(blocking).toEqual([]);
        });
      }
    });
  }
}
