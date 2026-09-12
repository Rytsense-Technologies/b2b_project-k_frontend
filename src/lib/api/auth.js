import api from '@/lib/axios';
import {
  setSessionCookie,
  setRoleCookie,
  setTenantCookie,
  clearRoleCookie,
  clearTenantCookie,
} from '@/lib/tokens';
import { normalizeLoginSession } from '@/lib/auth/rbac';

/** Login may return `{ user }` or a flat user object */
export function parseLoginUser(data) {
  if (!data || typeof data !== 'object') return null;
  const u = data.user ?? data;
  if (!u?.email) return null;
  return u;
}

/**
 * Unified sign-in for every portal role (superadmin, college_admin, faculty/hod, student).
 * Live: POST /api/v1/auth/login only — no legacy /superadmin/auth/login fallbacks.
 */
export async function loginWithRbac(email, password, tenantSlug) {
  const body = { email, password };
  if (tenantSlug) body.tenant_slug = tenantSlug;

  const res = await api.post('/auth/login', body);
  const session = normalizeLoginSession(res.data ?? {});
  if (!session?.user?.email) {
    throw new Error('Unexpected login response from server.');
  }

  setSessionCookie();
  setRoleCookie(session.role);
  setTenantCookie(session.tenant_id ?? null);
  return session;
}

export const authApi = {
  login: async (data) => {
    const session = await loginWithRbac(data.email, data.password);
    return {
      data: {
        ...session.user,
        user: session.user,
        role: session.role,
        tenant_id: session.tenant_id,
        permissions: session.permissions,
      },
    };
  },

  register: () => {
    throw new Error('Open self-signup is not available in B2B. Accounts are created by an administrator.');
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    clearRoleCookie();
    clearTenantCookie();
    return res;
  },
  refresh: (refreshToken) => api.post('/auth/refresh-token', { refresh_token: refreshToken }),

  sendOtp: (email) => api.post('/auth/send-otp', { email }),

  verifyOtp: (email, otp_code, purpose = 'login') =>
    api.post('/auth/verify-otp', { email, otp_code, purpose }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token, password) => api.post('/auth/reset-password', {
    token,
    new_password: password,
    confirm_password: password,
  }),
};
