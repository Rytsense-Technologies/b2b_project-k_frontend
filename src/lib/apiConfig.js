/** Test server — frontend :3000, backend :8000 on same EC2 host */
export const PRODUCTION_HOST = '13.234.197.68';
export const PRODUCTION_API_BASE = `http://${PRODUCTION_HOST}:8000/api/v1`;

const LOCAL_API_BASE = 'http://localhost:8000/api/v1';
const SAME_ORIGIN_API_BASE = '/api/v1';

export function isProductionServerHost(hostname) {
  return hostname === PRODUCTION_HOST;
}

/**
 * API base URL for axios.
 * - Test server (13.234.197.68): browser calls FastAPI on :8000 directly
 * - Live domain (talenteur.co.in): same-origin /api/v1 via Nginx
 * - Local dev: http://localhost:8000/api/v1
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (isProductionServerHost(hostname)) {
      return PRODUCTION_API_BASE;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return LOCAL_API_BASE;
    }
    // HTTPS custom domain — avoid cross-origin calls to raw IP (mixed content / CORS)
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
