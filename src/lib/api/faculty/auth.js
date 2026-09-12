import api from '@/lib/axios';
import { loginWithRbac } from '@/lib/api/auth';
import {
  clearTokens,
  clearRoleCookie,
  clearTenantCookie,
} from '@/lib/tokens';

/**
 * Faculty / HOD login — unified POST /auth/login.
 */
export async function facultyLogin(email, password) {
  const session = await loginWithRbac(email, password);
  return {
    user: session.user,
    token: null,
    role: session.role,
    tenant_id: session.tenant_id,
    permissions: session.permissions,
  };
}

export async function facultyLogout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
