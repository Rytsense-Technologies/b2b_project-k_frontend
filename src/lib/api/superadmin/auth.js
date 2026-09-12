import { loginWithRbac } from '@/lib/api/auth';
import {
  clearTokens,
  clearRoleCookie,
  clearTenantCookie,
} from '@/lib/tokens';

/**
 * Super Admin login — same unified POST /auth/login as every other role.
 * Kept for callers that still import this helper; does not hit dead
 * /superadmin/auth/login or /api/superadmin/auth/login routes.
 */
export async function superAdminLogin(email, password) {
  const session = await loginWithRbac(email, password);
  return {
    user: session.user,
    token: null,
    role: session.role,
    permissions: session.permissions,
    tenant_id: session.tenant_id,
  };
}

export async function superAdminLogout() {
  try {
    const api = (await import('@/lib/axios')).default;
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
