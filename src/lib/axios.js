import axios from 'axios';
import { clearTokens } from './tokens';
import { getApiBaseUrl } from './apiConfig';

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

let refreshing = false;
let queue = [];

// ── Auto-refresh on 401, then replay queued requests ─────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;

    if (err.response?.status === 401 && !orig._retry && !isAuthEndpoint(orig.url)) {
      orig._retry = true;

      if (refreshing) {
        return new Promise((resolve) => queue.push(() => resolve(api(orig))));
      }

      refreshing = true;
      try {
        // refresh_token is httpOnly — browser sends it automatically via withCredentials.
        // Backend reads it from the cookie (Path=/api/v1/auth/refresh-token).
        // No request body needed.
        await api.post('/auth/refresh-token');
      } catch {
        refreshing = false;
        queue = [];
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
        return Promise.reject(err);
      }

      refreshing = false;
      queue.forEach((cb) => cb());
      queue = [];
      return api(orig);
    }

    return Promise.reject(err);
  }
);

export default api;
