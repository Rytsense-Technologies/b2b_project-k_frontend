import { expect, test } from '@playwright/test';
import { SA, api, expectHealthyPage, settled, signedInContext, unique, watch, journeyViewport } from './journeys-helpers';

// One journey: every step builds on the university and college made before it.
test.describe.configure({ mode: 'serial' });

let context;
let page;
let problems;
const uniCode = unique('U').toUpperCase().slice(0, 12);
const uniName = `Journey University ${uniCode}`;
const colCode = unique('C').toUpperCase().slice(0, 12);
const colName = `Journey College ${colCode}`;
const adminEmail = `${unique('journey-ca-')}@example.com`;

const dialog = () => page.getByRole('dialog');

async function pickCombo(label, value) {
  // A sign-in context opened by signedInContext can leave this page in the background, where
  // headless WebKit throttles animation frames and clicks never become "stable".
  await page.bringToFront();
  const box = dialog().getByRole('combobox', { name: label });
  await box.click();
  await box.fill(value);
  await page.getByRole('option', { name: value, exact: true }).first().click();
}

test.beforeAll(async ({ browser }) => {
  context = await signedInContext(browser, SA, { viewport: journeyViewport() });
  page = await context.newPage();
  problems = watch(page);
});

test.afterAll(async () => {
  await context.close();
});

test.beforeEach(() => {
  problems.length = 0;
});

test('an empty university form shows field errors and sends nothing', async () => {
  await page.goto('/superadmin/universities');
  await settled(page);
  await page.getByRole('button', { name: 'Add university' }).first().click();
  let posted = 0;
  const count = (r) => {
    if (r.method() === 'POST' && r.url().includes('/universities')) posted += 1;
  };
  page.on('request', count);
  await dialog().getByRole('button', { name: 'Create university' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();
  expect(posted).toBe(0);
  page.off('request', count);
  await dialog().getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog()).toHaveCount(0);
});

test('a double-clicked create makes one university', async () => {
  await page.goto('/superadmin/universities');
  await settled(page);
  await page.getByRole('button', { name: 'Add university' }).first().click();
  await dialog().getByLabel('University name').fill(uniName);
  await pickCombo('State / UT', 'Tamil Nadu');
  await pickCombo('District', 'Chennai');
  await dialog().getByLabel('City').fill('Chennai');
  await dialog().getByLabel('Pincode').fill('600001');

  const sent = [];
  const record = (r) => {
    if (r.method() === 'POST' && /\/universities\/?$/.test(new URL(r.url()).pathname)) sent.push(r);
  };
  page.on('request', record);
  await dialog().getByRole('button', { name: 'Create university' }).dblclick();
  await expect(page.getByText('University created')).toBeVisible();
  await expect(dialog()).toHaveCount(0);
  page.off('request', record);
  expect(sent).toHaveLength(1);
  await expect(page.getByRole('button', { name: uniName }).first()).toBeVisible();
  await expectHealthyPage(page, problems);
});

// Owner rule (docs/knowledge/rules/unique-codes.md, 4 Nov 2026): IDs are issued by the API from a
// series and are never typed, so a clash can no longer be entered. The form shows a locked preview.
test('the university ID is assigned, never typed', async () => {
  await page.goto('/superadmin/universities?new=1');
  await expect(dialog()).toBeVisible();
  await expect(dialog().getByLabel('University ID')).toBeDisabled();
  await expect(dialog().getByLabel('University ID')).toHaveValue(/^UNI-\d{4,}$/);
  await dialog().getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog()).toHaveCount(0);
});

test('the edit form opens with the saved values', async () => {
  await page.goto(`/superadmin/universities?q=${uniCode}`);
  await settled(page);
  await page.getByRole('button', { name: `Edit ${uniName}`, exact: true }).first().click();
  await expect(dialog().getByLabel('University name')).toHaveValue(uniName);
  await expect(dialog().getByLabel('University ID')).toHaveValue(/^UNI-\d{4,}$/);
  await expect(dialog().getByLabel('University ID')).toBeDisabled();
  await expect(dialog().getByLabel('Pincode')).toHaveValue('600001');
  await expect(dialog().getByRole('combobox', { name: 'District' })).toHaveValue('Chennai');
  await dialog().getByRole('button', { name: 'Cancel' }).click();
});

test('college form validates, then a college with an admin invite is created', async () => {
  await page.goto('/superadmin/colleges');
  await settled(page);
  await page.getByRole('button', { name: 'Add college' }).first().click();
  await dialog().getByRole('button', { name: 'Create college' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();

  await dialog().getByRole('button', { name: 'University' }).click();
  await page.getByRole('option', { name: uniName, exact: true }).click();
  await dialog().getByLabel('College name').fill(colName);
  await pickCombo('State / UT', 'Tamil Nadu');
  await pickCombo('District', 'Chennai');
  await dialog().getByLabel('City').fill('Chennai');
  await dialog().getByLabel('Pincode').fill('600002');
  await dialog().getByLabel('Student seat cap').fill('3');
  await dialog().getByLabel('Full name').fill('Journey Admin');
  await dialog().getByLabel('Email').fill(adminEmail);
  await dialog().getByLabel('Mobile').fill('+919876543210');
  await dialog().getByRole('button', { name: 'Create college' }).click();
  await expect(page.getByText('College created')).toBeVisible();
  await expect(dialog()).toHaveCount(0);
  await expectHealthyPage(page, problems);
});

test('the new college has its detail page, and the admin invite can be resent', async () => {
  await page.goto(`/superadmin/colleges?q=${colCode}`);
  await settled(page);
  await page.getByRole('link', { name: new RegExp(colName) }).first().click();
  await page.waitForURL(/\/superadmin\/colleges\/[0-9a-f-]{36}/);
  await settled(page);
  await expect(page.locator('body')).toContainText(colName);
  await expectHealthyPage(page, problems);

  await page.goto(`/superadmin/colleges?q=${colCode}`);
  await settled(page);
  await page.getByRole('button', { name: 'View' }).first().click();
  await expect(dialog().getByText(adminEmail)).toBeVisible();
  await dialog().getByRole('button', { name: /Resend/ }).first().click();
  await expect(page.getByText(`Invite resent to ${adminEmail}`)).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('deactivating a college moves it to Inactive, reactivating brings it back', async () => {
  await page.goto(`/superadmin/colleges?q=${colCode}`);
  await settled(page);
  await page.getByRole('button', { name: `Deactivate ${colName}`, exact: true }).click();
  await dialog().getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByText('College deactivated')).toBeVisible();
  await expect(page.getByRole('button', { name: `Deactivate ${colName}`, exact: true })).toHaveCount(0);

  await page.goto(`/superadmin/colleges?q=${colCode}&status=false`);
  await settled(page);
  await page.getByRole('button', { name: `Reactivate ${colName}`, exact: true }).click();
  await dialog().getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByText('College reactivated')).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('deactivating a university moves it to Inactive, reactivating brings it back', async () => {
  await page.goto(`/superadmin/universities?q=${uniCode}`);
  await settled(page);
  await page.getByRole('button', { name: `Deactivate ${uniName}`, exact: true }).click();
  await dialog().getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByText('University deactivated')).toBeVisible();

  await page.goto(`/superadmin/universities?q=${uniCode}&status=inactive`);
  await settled(page);
  await page.getByRole('button', { name: `Reactivate ${uniName}`, exact: true }).click();
  await dialog().getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByText('University reactivated')).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('the Platform users page lists the pending invite, and a bad search is empty, not broken', async () => {
  await page.goto(`/superadmin/users?tab=pending&q=${adminEmail}`);
  await settled(page);
  await expect(page.locator('body')).toContainText(adminEmail);
  await page.goto('/superadmin/users?q=nobody-here-at-all');
  await settled(page);
  await expectHealthyPage(page, problems);
});

test('a signed-out visitor cannot use the university API', async ({ browser }) => {
  const { status } = await api(await (await browser.newContext({ baseURL: process.env.E2E_BASE_URL })).newPage(), 'GET', '/universities');
  expect(status).toBe(401);
});
