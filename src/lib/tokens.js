function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

// Non-sensitive session flag on the frontend domain.
// Next.js middleware reads this to know a session exists.
// It carries no token value — actual auth is enforced by backend httpOnly cookies
// on every API call. Expires in 30 days to match the refresh_token lifetime.
export function setSessionCookie() {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `pk_session=1; path=/; max-age=2592000; SameSite=Lax${secure}`;
}

// Clears all frontend-managed cookies on logout.
// Backend clears httpOnly access_token + refresh_token via Set-Cookie Max-Age=0
// in the /auth/logout response.
export function clearTokens() {
  deleteCookie('pk_session');
  deleteCookie('pk_onb');
}

// Private helper — reads a single cookie value by name.
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// Stores the user's role so Next.js middleware can redirect without an API call.
// Same 30-day expiry as the session cookie.
export function setRoleCookie(role) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `pk_role=${encodeURIComponent(role)}; path=/; max-age=2592000; SameSite=Lax${secure}`;
}

export function getRoleCookie() {
  return getCookie('pk_role');
}

export function clearRoleCookie() {
  deleteCookie('pk_role');
}

// Stores the tenant ID for B2B users (null / absent for B2C students).
export function setTenantCookie(tenantId) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `pk_tenant=${encodeURIComponent(tenantId ?? '')}; path=/; max-age=2592000; SameSite=Lax${secure}`;
}

export function getTenantCookie() {
  const val = getCookie('pk_tenant');
  return val === '' ? null : val;
}

export function clearTenantCookie() {
  deleteCookie('pk_tenant');
}
