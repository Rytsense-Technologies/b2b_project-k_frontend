import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';
import { handleSessionExpired } from './sessionExpiry';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,   // browser auto-sends httpOnly cookies (access_token, refresh_token)
  headers: { 'Content-Type': 'application/json' },
});

// Ensure correct base URL at request time (handles prod host + old builds without env).
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

// ── Auth endpoints that must never trigger the refresh retry loop ─────────────
const AUTH_PATHS = ['/auth/login', '/auth/refresh-token', '/auth/logout', '/auth/register'];
function isAuthEndpoint(url = '') {
  return AUTH_PATHS.some((p) => url.includes(p));
}

let refreshInFlight = null;

/**
 * The one refresh call for this tab, shared by every API client. A second call
 * sent with the same cookie would look like a stolen token to the server.
 */
export function refreshSession() {
  if (!refreshInFlight) {
    // refresh_token is httpOnly — browser sends it automatically via withCredentials.
    // No request body needed.
    refreshInFlight = api.post('/auth/refresh-token').finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

// ── Auto-refresh on 401, then replay queued requests ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;

    if (err.response?.status === 401 && !orig._retry && !isAuthEndpoint(orig.url)) {
      orig._retry = true;

      try {
        await refreshSession();
      } catch {
        handleSessionExpired();
        return Promise.reject(err);
      }

      return api(orig);
    }

    return Promise.reject(err);
  }
);

export default api;
