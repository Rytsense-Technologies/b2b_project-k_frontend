import api from '@/lib/axios';
import {
  setSessionCookie,
  setRoleCookie,
  setTenantCookie,
  clearRoleCookie,
  clearTenantCookie,
} from '@/lib/tokens';
import { normalizeLoginSession, resolveRoleFromLoginPayload } from '@/lib/auth/rbac';
import { superAdminLogin } from '@/lib/api/superadmin/auth';
import { adminLogin } from '@/lib/api/admin/auth';
import { facultyLogin } from '@/lib/api/faculty/auth';

/** Login may return `{ user }` or a flat user object */
export function parseLoginUser(data) {
  if (!data || typeof data !== 'object') return null;
  const u = data.user ?? data;
  if (!u?.email) return null;
  return u;
}

async function loginViaAuthEndpoint(email, password) {
  const res = await api.post('/auth/login', { email, password });
  const d = res.data ?? {};

  setSessionCookie();

  const session = normalizeLoginSession(d);
  if (!session) return null;

  if (session.role) {
    setRoleCookie(session.role);
    setTenantCookie(session.tenant_id ?? null);
  } else {
    clearRoleCookie();
    clearTenantCookie();
  }

  return session;
}

/**
 * Single sign-in for all roles (B2C + B2B).
 * Tries `/auth/login` first, then legacy portal endpoints until one succeeds.
 */
export async function loginWithRbac(email, password) {
  const legacyProviders = [
    () => superAdminLogin(email, password),
    () => adminLogin(email, password),
    () => facultyLogin(email, password),
  ];

  try {
    const session = await loginViaAuthEndpoint(email, password);
    if (session) return session;
  } catch (err) {
    const status = err.response?.status;
    if (status && status !== 401 && status !== 403 && status !== 404) {
      throw err;
    }
  }

  let lastError;
  for (const provider of legacyProviders) {
    try {
      const result = await provider();
      const session = normalizeLoginSession({
        user: result.user,
        role: result.role,
        tenant_id: result.tenant_id,
        permissions: result.permissions,
      });
      if (session) return session;
    } catch (err) {
      lastError = err;
      const status = err.response?.status ?? err.status;
      if (status === 401 || status === 403 || status === 404) continue;
      throw err;
    }
  }

  if (lastError?.message && lastError.message !== 'Not Found') {
    throw lastError;
  }
  throw new Error('Invalid email or password.');
}

export const authApi = {
  login: async (data) => {
    const session = await loginWithRbac(data.email, data.password);
    return { data: { ...session.user, user: session.user, role: session.role, tenant_id: session.tenant_id, permissions: session.permissions } };
  },

  register: (data) => api.post('/auth/register', {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    password: data.password,
    confirm_password: data.confirmPassword,
    phone_number: data.phoneNumber,
    email_verified: true,
    user_type: 'individual',
  }),

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
