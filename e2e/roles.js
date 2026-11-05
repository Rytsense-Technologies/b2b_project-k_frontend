/** Credentials come from the environment only; nothing about a real account lives in the repo. */
export const ROLES = [
  { name: 'super admin', env: 'E2E_SUPERADMIN_EMAIL', home: '/superadmin/dashboard' },
  { name: 'college admin', env: 'E2E_COLLEGE_ADMIN_EMAIL', home: '/admin/dashboard' },
  { name: 'HOD', env: 'E2E_HOD_EMAIL', home: '/faculty/dashboard' },
  { name: 'faculty', env: 'E2E_FACULTY_EMAIL', home: '/faculty/dashboard' },
  { name: 'student', env: 'E2E_STUDENT_EMAIL', home: '/student/home' },
];

/** Fails rather than skips: a smoke run with no accounts must not look green. */
export function credentials(role) {
  const email = process.env[role.env];
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error(`Set ${role.env} and E2E_PASSWORD to run the smoke tests`);
  return { email, password };
}

export async function signIn(page, role) {
  const { email, password } = credentials(role);
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`**${role.home}`);
}

export const byName = (name) => ROLES.find((r) => r.name === name);
