import { expect, test } from '@playwright/test';
import { CA, SA, api, expectHealthyPage, ids, settled, signedInContext, unique, watch, journeyViewport } from './journeys-helpers';

// One journey down the hierarchy: each step uses what the step before it made.
test.describe.configure({ mode: 'serial' });

let context;
let page;
let problems;
const tag = unique('').toUpperCase().slice(-6).replace(/[0-9]/g, 'Q');
const deptName = `Journey Dept ${tag}`;
const progName = `Journey Programme ${tag}`;
const subjectName = `Journey Subject ${tag}`;
const chapterTitle = `Journey Chapter ${tag}`;
const studentEmail = `journey-st-${tag.toLowerCase()}@example.com`;
const staffEmail = `journey-fac-${tag.toLowerCase()}@example.com`;
const studentName = `Stu${tag.toLowerCase()} Journey`;

const dialog = () => page.getByRole('dialog');

async function pickDepartment() {
  const box = dialog().getByRole('combobox', { name: 'Department' });
  await box.click();
  await box.fill(deptName);
  await page.getByRole('option', { name: deptName }).first().click();
}

async function pickButton(label, option) {
  await dialog().getByRole('button', { name: label }).click();
  await page.getByRole('option', { name: option }).first().click();
}

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

test('a department needs a name, then is created once on a double click', async () => {
  await page.goto('/admin/structure/departments');
  await settled(page);
  await page.getByRole('button', { name: 'New department' }).click();
  await dialog().getByRole('button', { name: 'Create department' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();

  await dialog().getByLabel('Department name').fill(deptName);
  const sent = [];
  const record = (r) => {
    if (r.method() === 'POST' && /\/departments\/?$/.test(new URL(r.url()).pathname)) sent.push(r);
  };
  page.on('request', record);
  await dialog().getByRole('button', { name: 'Create department' }).dblclick();
  await expect(dialog()).toHaveCount(0);
  page.off('request', record);
  expect(sent).toHaveLength(1);
  await expect(page.getByText(deptName).first()).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('a programme creates its semesters', async () => {
  await page.goto('/admin/structure/programmes');
  await settled(page);
  await page.getByRole('button', { name: 'New programme' }).first().click();
  await dialog().getByRole('button', { name: 'Create programme' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();
  await pickDepartmentOrButton();
  await dialog().getByLabel('Programme name').fill(progName);
  await dialog().getByRole('button', { name: 'Create programme' }).click();
  await expect(page.getByText(/Programme created with \d+ semesters?/)).toBeVisible();
  await expect(dialog()).toHaveCount(0);
  await expectHealthyPage(page, problems);
});

async function pickDepartmentOrButton() {
  const combo = dialog().getByRole('combobox', { name: 'Department' });
  if (await combo.count()) await pickDepartment();
  else await pickButton('Department', deptName);
}

test('a semester, a subject and a chapter can be added under it', async () => {
  await page.goto(`/admin/structure/programmes?q=${encodeURIComponent(progName)}`);
  await settled(page);
  await page.getByRole('list', { name: 'Programmes' }).getByRole('button', { name: new RegExp(progName) }).first().click();
  await settled(page);

  await page.getByRole('button', { name: 'Add semester' }).first().click();
  await dialog().getByLabel('Semester name').fill('');
  await dialog().getByRole('button', { name: 'Add semester' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();
  await dialog().getByLabel('Semester name').fill(`Bridge ${tag}`);
  await dialog().getByRole('button', { name: 'Add semester' }).click();
  await expect(dialog()).toHaveCount(0);
  // Let the post-save refresh land; a click on the re-rendering toolbar can be lost (XB, Firefox v2).
  await expect(page.getByText(`Bridge ${tag}`).first()).toBeVisible();
  await settled(page);

  await page.getByRole('button', { name: 'Add subject' }).first().click();
  await dialog().getByLabel('Subject name').fill(subjectName);
  await dialog().getByRole('button', { name: 'Add subject' }).click();
  await expect(dialog()).toHaveCount(0);
  await expect(page.getByText(subjectName).first()).toBeVisible();
  await settled(page);

  await page.getByText(subjectName).first().click();
  await page.getByRole('button', { name: 'Add chapter' }).first().click();
  await dialog().getByLabel('Chapter title').fill(chapterTitle);
  await dialog().getByRole('button', { name: 'Add chapter' }).click();
  await expect(dialog()).toHaveCount(0);
  await expect(page.getByText(chapterTitle).first()).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('a staff member is invited, and the same email is refused the second time', async () => {
  await page.goto('/admin/staff');
  await settled(page);
  const fill = async () => {
    await page.getByRole('button', { name: 'Add staff' }).first().click();
    await dialog().getByLabel('First name').fill('Journey');
    await dialog().getByLabel('Last name').fill('Teacher');
    await dialog().getByLabel('Email address').fill(staffEmail);
    await pickDepartment();
    await dialog().getByRole('button', { name: 'Create and send invite' }).click();
  };
  await fill();
  await expect(dialog()).toHaveCount(0);
  await fill();
  await expect(dialog()).toBeVisible();
  await expect(page.locator('[role="status"], [role="alert"]').getByText(/already|exists|registered|in use/i).first()).toBeVisible();
  await dialog().getByRole('button', { name: 'Cancel' }).click();
});

test('an invalid student form names its fields', async () => {
  await page.goto('/admin/students');
  await settled(page);
  await page.getByRole('button', { name: 'Add student' }).first().click();
  await dialog().getByLabel('Email address').fill('not-an-email');
  await dialog().getByLabel('Phone number').fill('12345');
  await dialog().getByRole('button', { name: 'Create and send invite' }).click();
  await expect(dialog().getByRole('alert').first()).toBeVisible();
  await expect(dialog()).toContainText('Enter a 10-digit Indian mobile number');
  await dialog().getByRole('button', { name: 'Cancel' }).click();
});

test('a student is invited into the new programme, and the invite can be resent', async () => {
  await page.goto('/admin/students');
  await settled(page);
  await page.getByRole('button', { name: 'Add student' }).first().click();
  const [first, last] = studentName.split(' ');
  await dialog().getByLabel('First name').fill(first);
  await dialog().getByLabel('Last name').fill(last);
  await dialog().getByLabel('Email address').fill(studentEmail);
  await pickDepartment();
  await pickButton('Programme', progName);
  await dialog().getByRole('button', { name: 'Current semester' }).click();
  await page.getByRole('option', { name: /^Semester 1/ }).first().click();
  await dialog().getByRole('button', { name: 'Create and send invite' }).click();
  await expect(page.getByText('Student created — activation link sent')).toBeVisible();
  await expect(dialog()).toHaveCount(0);

  await page.goto(`/admin/students?tab=pending&q=${encodeURIComponent(studentEmail)}`);
  await settled(page);
  await page.getByRole('button', { name: 'Resend', exact: true }).click();
  await expect(page.getByText('Invite resent')).toBeVisible();
  await expectHealthyPage(page, problems);
});

test('a pending invite can be cancelled, and is gone from the list', async () => {
  await page.goto(`/admin/students?tab=pending&q=${encodeURIComponent(studentEmail)}`);
  await settled(page);
  await page.getByRole('button', { name: 'Cancel invite' }).click();
  await dialog().getByRole('button', { name: 'Keep invite' }).click();
  await expect(dialog()).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel invite' }).click();
  await dialog().getByRole('button', { name: 'Cancel invite' }).dblclick();
  await expect(page.getByText(`Invite for ${studentEmail} cancelled`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel invite' })).toHaveCount(0);
  await expectHealthyPage(page, problems);
});

test('promote to next year previews first and changes nothing until confirmed', async () => {
  await page.goto('/admin/students');
  await settled(page);
  const before = await api(page, 'GET', '/users?role=student&page_size=100');
  await page.getByRole('button', { name: 'Promote to next year' }).click();
  await expect(dialog()).toBeVisible();
  await settled(page);
  await expect(dialog().getByRole('alert')).toHaveCount(0);
  await dialog().getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog()).toHaveCount(0);
  const after = await api(page, 'GET', '/users?role=student&page_size=100');
  expect(after.body).toEqual(before.body);
  await expectHealthyPage(page, problems);
});

test('adding a student past the seat cap shows the reason, and keeps the form', async ({ browser }) => {
  const { a } = ids();
  const adminContext = await signedInContext(browser, SA);
  const adminPage = await adminContext.newPage();
  await adminPage.goto('/superadmin/dashboard');
  const current = await api(adminPage, 'GET', `/colleges/${a.tenant}`);
  const college = current.body?.data ?? current.body;
  const cap = college.student_seat_cap;
  // The API refuses a cap below the seats in use, so the lowest cap is exactly full.
  const lowered = await api(adminPage, 'PATCH', `/colleges/${a.tenant}`, { student_seat_cap: Math.max(1, college.student_count) });
  try {
    expect(lowered.status).toBeLessThan(300);
    // The admin page opened above is now in front; headless WebKit throttles animation frames on
    // a background page, so actionability checks on `page` would wait forever (XB, WebKit runs).
    await page.bringToFront();
    await page.goto('/admin/students');
    await settled(page);
    await page.getByRole('button', { name: 'Add student' }).first().click();
    await dialog().getByLabel('First name').fill('Over');
    await dialog().getByLabel('Last name').fill('Cap');
    await dialog().getByLabel('Email address').fill(`over-cap-${tag.toLowerCase()}@example.com`);
    await pickDepartment();
    await pickButton('Programme', progName);
    await dialog().getByRole('button', { name: 'Current semester' }).click();
    await page.getByRole('option', { name: /^Semester 1/ }).first().click();
    await dialog().getByRole('button', { name: 'Create and send invite' }).click();
    await expect(page.getByText(/seat cap reached/i)).toBeVisible();
    await expect(dialog()).toBeVisible();
    await expect(dialog().getByLabel('First name')).toHaveValue('Over');
  } finally {
    await api(adminPage, 'PATCH', `/colleges/${a.tenant}`, { student_seat_cap: cap });
    await adminContext.close();
  }
});
