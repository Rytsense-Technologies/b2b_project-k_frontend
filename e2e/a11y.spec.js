import { expect, test } from '@playwright/test';

// Public pages only, so this runs in CI with no API behind the build.
const PUBLIC_PAGES = ['/auth/login', '/auth/forgot-password'];
const axePath = require.resolve('axe-core/axe.min.js');

for (const path of PUBLIC_PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.addScriptTag({ path: axePath });
    const { violations } = await page.evaluate(() => window.axe.run());
    const blocking = violations
      .filter((v) => ['serious', 'critical'].includes(v.impact))
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`);
    expect(blocking).toEqual([]);
  });
}
