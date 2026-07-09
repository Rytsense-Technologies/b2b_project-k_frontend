import api from '@/lib/axios';
import {
  setSessionCookie, clearTokens,
  setRoleCookie, setTenantCookie,
  clearRoleCookie, clearTenantCookie,
} from '@/lib/tokens';

export async function adminLogin(email, password) {
  const res = await api.post('/admin/auth/login', { email, password });
  const d   = res.data ?? {};

  setSessionCookie();
  setRoleCookie('college_admin');
  setTenantCookie(d.tenant_id ?? null);

  const user = d.user && typeof d.user === 'object' ? d.user : d;

  return {
    user,
    token:       d.token       ?? null,
    role:        d.role        ?? 'college_admin',
    tenant_id:   d.tenant_id   ?? null,
    permissions: d.permissions ?? [
      'users.read',    'users.write',
      'reports.read',  'analytics.read',
      'faculty.read',  'faculty.write',
      'students.read', 'students.write',
      'settings.read', 'settings.write',
    ],
  };
}

export async function adminLogout() {
  try { await api.post('/admin/auth/logout'); } catch { /* ignore */ }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
