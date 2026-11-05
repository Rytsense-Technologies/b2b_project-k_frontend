// P4 DECB: PATCH /departments/{id} refuses a non-HOD head (422), so the picker lists role=hod only.
import { describe, expect, it, vi } from 'vitest';

const users = {
  hod: [{ id: 'h1', first_name: 'Hari', role: 'hod', department_id: 'd1', email: 'h@x.in' }],
  faculty: [{ id: 'f1', first_name: 'Fathima', role: 'faculty', department_id: 'd1', email: 'f@x.in' }],
};
vi.mock('@/lib/api/superadmin/users', () => ({
  usersApi: { getUsers: vi.fn(async ({ role }) => ({ data: { users: users[role] || [], total: (users[role] || []).length } })) },
}));

const { usersApi } = await import('@/lib/api/superadmin/users');
const { loadHodOptions } = await import('./departmentModel');

describe('head of department picker', () => {
  it('offers HOD accounts of the department only, never faculty', async () => {
    const opts = await loadHodOptions('t1', { id: 'd1', name: 'CSE' });
    expect(opts.map((o) => o.value)).toEqual(['h1']);
    expect(usersApi.getUsers.mock.calls.every(([p]) => p.role === 'hod')).toBe(true);
  });
});
