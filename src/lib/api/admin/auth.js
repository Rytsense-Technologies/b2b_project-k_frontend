import api from '@/lib/axios';
import {
  setSessionCookie,
  clearTokens,
  setRoleCookie,
  setTenantCookie,
  clearRoleCookie,
  clearTenantCookie,
} from '@/lib/tokens';
import { normalizeLoginSession } from '@/lib/auth/rbac';
import { ROLES } from '@/lib/permissions';

/**
 * College Admin login via unified auth (EPIC-03).
 * Live: POST /api/v1/auth/login — not legacy /admin/auth/login.
 */
export async function adminLogin(email, password, tenantSlug) {
  const body = { email, password };
  if (tenantSlug) body.tenant_slug = tenantSlug;

  const res = await api.post('/auth/login', body);
  const session = normalizeLoginSession(res.data ?? {});

  if (!session?.user?.email) {
    throw new Error('Unexpected login response from server.');
  }

  if (session.role !== ROLES.COLLEGE_ADMIN) {
    clearTokens();
    clearRoleCookie();
    clearTenantCookie();
    throw new Error(
      'This portal is for College Admin only. Super Admins sign in at /auth/login.',
    );
  }

  setSessionCookie();
  setRoleCookie(session.role);
  setTenantCookie(session.tenant_id ?? null);

  return session;
}

export async function adminLogout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
