import api from '@/lib/axios';
import {
  setSessionCookie, clearTokens,
  setRoleCookie, setTenantCookie,
  clearRoleCookie, clearTenantCookie,
} from '@/lib/tokens';

export async function facultyLogin(email, password) {
  const res = await api.post('/faculty/auth/login', { email, password });
  const d   = res.data ?? {};

  setSessionCookie();
  setRoleCookie('faculty');
  setTenantCookie(d.tenant_id ?? null);

  const user = d.user && typeof d.user === 'object' ? d.user : d;

  return {
    user,
    token:       d.token       ?? null,
    role:        d.role        ?? 'faculty',
    tenant_id:   d.tenant_id   ?? null,
    permissions: d.permissions ?? [
      'content.read', 'content.write', 'content.review',
      'students.read', 'qna.read', 'reports.read',
    ],
  };
}

export async function facultyLogout() {
  try { await api.post('/faculty/auth/logout'); } catch { /* ignore */ }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
