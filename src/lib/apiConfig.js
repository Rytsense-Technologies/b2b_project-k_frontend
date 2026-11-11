const LOCAL_API_BASE = 'http://localhost:8000/api/v1';
const SAME_ORIGIN_API_BASE = '/api/v1';

/**
 * API base URL for axios.
 * - Deployed (any domain): same-origin /api/v1 through the reverse proxy
 * - Local dev: NEXT_PUBLIC_API_URL, else http://localhost:8000/api/v1
 * INFRA-025: no hard-coded host; a test server is just another same-origin deploy.
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
      if (fromEnv) return fromEnv;
      return LOCAL_API_BASE;
    }
    // HTTPS domain: same origin through the proxy (no mixed content, no CORS)
    if (protocol === 'https:') {
      return SAME_ORIGIN_API_BASE;
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    return SAME_ORIGIN_API_BASE;
  }

  return LOCAL_API_BASE;
}

export function getApiOrigin() {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/v\d+\/?$/, '');
}
