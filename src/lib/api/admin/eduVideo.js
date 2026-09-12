import axios from 'axios';
import { getApiBaseUrl, getApiOrigin, PRODUCTION_HOST } from '@/lib/apiConfig';

/**
 * Educational video pipeline — mounted at /edu_video on the FastAPI app
 * (NOT under /api/v1). See CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md.
 *
 * Auth: none on these routes today (known backend gap). withCredentials is
 * set for consistency only; the backend does not check cookies.
 */

export const JOB_STATUS = Object.freeze({
  PENDING: 'PENDING',
  EXTRACTING: 'EXTRACTING',
  SCRIPTING: 'SCRIPTING',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  RENDERING: 'RENDERING',
  DONE: 'DONE',
  FAILED: 'FAILED',
});

/** Mirrors app/edu_video/routes.py SUPPORTED_EXTENSIONS */
export const SUPPORTED_EXTENSIONS = Object.freeze(['.pdf', '.docx', '.doc', '.txt']);

const LOCAL_API_ORIGIN = 'http://localhost:8000';

function isBrowserFrontendOrigin(origin) {
  if (!origin || typeof window === 'undefined') return false;
  try {
    const u = new URL(origin, window.location.href);
    const page = window.location;
    // Same host as the Next app (e.g. localhost:3000) is never the edu_video API.
    if (u.hostname !== page.hostname) return false;
    if (u.port && page.port && u.port === page.port) return true;
    if (!u.port && (page.port === '3000' || page.port === '3001')) return true;
    return u.origin === page.origin;
  } catch {
    return false;
  }
}

/**
 * /edu_video lives on the FastAPI origin, not under /api/v1.
 * Never point at the Next.js host — middleware will 307 → /admin/dashboard
 * and axios will treat that HTML as a “successful” upload without job_id.
 */
export function getEduVideoOrigin() {
  const candidates = [];

  const stripped = getApiOrigin();
  if (stripped) candidates.push(stripped);

  const base = getApiBaseUrl();
  if (/^https?:\/\//i.test(base)) {
    try {
      candidates.push(new URL(base).origin);
    } catch {
      /* ignore */
    }
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      candidates.push(LOCAL_API_ORIGIN);
    } else if (hostname === PRODUCTION_HOST) {
      candidates.push(`http://${PRODUCTION_HOST}:8000`);
    } else if (protocol === 'https:') {
      // Nginx should proxy /edu_video same-origin.
      candidates.push('');
    }
  } else {
    candidates.push(LOCAL_API_ORIGIN);
  }

  for (const c of candidates) {
    if (c === '') return '';
    if (c && !isBrowserFrontendOrigin(c)) return c.replace(/\/$/, '');
  }

  return LOCAL_API_ORIGIN;
}

const eduVideoClient = axios.create({
  withCredentials: true,
  // Never follow redirects into the Next app (307 → /admin/dashboard).
  maxRedirects: 0,
  validateStatus: (status) => status >= 200 && status < 300,
});

eduVideoClient.interceptors.request.use((config) => {
  const origin = getEduVideoOrigin();
  config.baseURL = origin || undefined;
  return config;
});

function unwrapJobPayload(res) {
  const data = res?.data;
  if (data && typeof data === 'object' && data.job_id) return data;
  const status = res?.status;
  const err = new Error(
    status >= 300 && status < 400
      ? 'Upload was redirected before the API responded. Check that the video API origin is :8000, not the Next.js app.'
      : 'Upload succeeded but no job_id was returned.',
  );
  err.response = res;
  throw err;
}

export const eduVideoApi = {
  /**
   * POST /edu_video/upload — multipart: file + language (required).
   * Optional theme_id / design_id / avatar_id omitted (server defaults / rotation).
   */
  upload({ file, language = 'english' }) {
    const form = new FormData();
    form.append('file', file);
    form.append('language', language);
    const origin = getEduVideoOrigin();
    const url = origin ? `${origin}/edu_video/upload` : '/edu_video/upload';
    // Absolute URL when possible so a bad baseURL cannot hit Next middleware.
    // Let the browser set multipart boundary — do not force Content-Type.
    return eduVideoClient.post(url, form).then(unwrapJobPayload);
  },

  /** GET /edu_video/status/{job_id} */
  getStatus(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/status/${encodeURIComponent(jobId)}`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.get(url).then((res) => res?.data);
  },

  /**
   * POST /edu_video/jobs/{job_id}/submit — start rendering from AWAITING_REVIEW.
   * Returns status dict; callers may ignore body and keep polling.
   */
  submit(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/submit`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url).then((res) => res?.data);
  },

  /** Absolute URL for GET /edu_video/download/{job_id} (open in new tab). */
  getDownloadUrl(jobId) {
    const origin = getEduVideoOrigin() || '';
    return `${origin}/edu_video/download/${encodeURIComponent(jobId)}`;
  },
};

export default eduVideoApi;
