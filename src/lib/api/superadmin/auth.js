import api from '@/lib/axios';
import {
  setSessionCookie, clearTokens,
  setRoleCookie, setTenantCookie,
  clearRoleCookie, clearTenantCookie,
} from '@/lib/tokens';

function applySuperAdminCookies() {
  setSessionCookie();
  setRoleCookie('superadmin');
  setTenantCookie(null);
}

function normalizeSuperAdminResponse(d) {
  const user = d.user && typeof d.user === 'object' ? d.user : d;
  return {
    user,
    token: d.token ?? null,
    role: d.role ?? 'superadmin',
    permissions: d.permissions ?? ['*'],
  };
}

/** Local dev fallback when backend superadmin route is unavailable */
async function superAdminLoginViaPlaceholder(email, password) {
  const res = await fetch('/api/superadmin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await res.json();
  if (!res.ok) {
    throw new Error(d.detail ?? 'Invalid email or password.');
  }
  applySuperAdminCookies();
  return normalizeSuperAdminResponse(d);
}

export async function superAdminLogin(email, password) {
  try {
    const res = await api.post('/superadmin/auth/login', { email, password });
    applySuperAdminCookies();
    return normalizeSuperAdminResponse(res.data ?? {});
  } catch (err) {
    const status = err.response?.status;
    // Backend missing or rejected — try local placeholder (demo superadmin in dev)
    if (!status || status === 401 || status === 404) {
      return superAdminLoginViaPlaceholder(email, password);
    }
    throw err;
  }
}

export async function superAdminLogout() {
  try { await api.post('/superadmin/auth/logout'); } catch { /* ignore */ }
  clearTokens();
  clearRoleCookie();
  clearTenantCookie();
}
