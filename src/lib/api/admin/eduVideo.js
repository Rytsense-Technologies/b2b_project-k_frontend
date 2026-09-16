import axios from 'axios';
import { getApiBaseUrl, getApiOrigin, PRODUCTION_HOST } from '@/lib/apiConfig';

/**
 * Educational video pipeline — mounted at /edu_video on the FastAPI app
 * (NOT under /api/v1). See CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md
 * and BACKEND_EDU_VIDEO_CA_HANDOFF.md.
 *
 * Auth: cookie-based, same as every other authenticated route
 * (app/api/deps_sync.py) — withCredentials carries the real access_token
 * cookie now; this is no longer the "no auth" gap the integration doc
 * originally flagged.
 */

/**
 * Exact values of app/edu_video/job_tracker.py's JobStatus enum. Generation
 * (PENDING..DONE/FAILED) now runs fully automatically with no manual gate
 * (product decision - see app/edu_video/pipeline.py::run_pipeline) -
 * AWAITING_REVIEW/AWAITING_TEACHER_REVIEW are legacy states from the old
 * admin-edits-before-rendering design and are passed through almost
 * instantly by the backend; a poller will rarely if ever observe them.
 * The REAL human workflow now happens after DONE, via two independent
 * timestamps (not `status` values) - see sent_to_hod_at/published_at on
 * each job, and eduVideoApi.sendToHod()/publish() below.
 */
export const JOB_STATUS = Object.freeze({
  PENDING: 'PENDING',
  EXTRACTING: 'EXTRACTING',
  SCRIPTING: 'SCRIPTING',
  AWAITING_REVIEW: 'AWAITING_REVIEW',
  AWAITING_TEACHER_REVIEW: 'AWAITING_TEACHER_REVIEW',
  RENDERING: 'RENDERING',
  DONE: 'DONE',
  FAILED: 'FAILED',
});

/** Mirrors app/edu_video/routes.py SUPPORTED_EXTENSIONS */
export const SUPPORTED_EXTENSIONS = Object.freeze(['.pdf', '.docx', '.doc', '.txt']);

/**
 * The backend only tracks progress per rendered scene (job_tracker.py's
 * scene_progress()), and scenes aren't created until scripting finishes and
 * rendering starts (pipeline.py::run_pipeline -> create_scenes()). So a job
 * sitting in EXTRACTING/SCRIPTING genuinely has `progress: 0` from the API —
 * there is no scene to count yet, not a bug. That looks frozen to someone
 * watching the table for the minute or two extraction+scripting can take.
 *
 * This blends the job's `status` (a real, already-returned signal) with its
 * scene-based `progress` into one number that actually advances — each
 * threshold only moves forward on a real status transition, and the
 * RENDERING band scales the real per-scene progress into the remaining
 * range. It's a stage-weighted estimate, not a second-by-second measurement
 * (the backend has no finer signal for extracting/scripting), and DONE is
 * reserved for 100 so this never claims completion early.
 */
export function computeJobProgress(job) {
  if (!job) return 0;
  switch (job.status) {
    case JOB_STATUS.PENDING:
      return 0;
    case JOB_STATUS.EXTRACTING:
      return 5;
    case JOB_STATUS.SCRIPTING:
    case JOB_STATUS.AWAITING_REVIEW:
    case JOB_STATUS.AWAITING_TEACHER_REVIEW:
      return 15;
    case JOB_STATUS.RENDERING: {
      const sceneProgress = typeof job.progress === 'number' ? job.progress : 0;
      return 20 + Math.round(sceneProgress * 0.75);
    }
    case JOB_STATUS.DONE:
      return 100;
    default:
      return 0;
  }
}

/**
 * Raw pipeline errors (multi-provider LLM dumps) are too long for table cells.
 * Return a calm one-line summary; keep `detail` for tip/aria when useful.
 */
export function summarizeEduVideoError(error) {
  const raw = String(error || '').trim();
  if (!raw) return { summary: '', detail: '' };
  const lower = raw.toLowerCase();
  if (lower.includes('llm providers failed') || lower.includes('payment required') || lower.includes('api key')) {
    return {
      summary: 'Generation failed — AI providers are unavailable. Try uploading again later.',
      detail: raw,
    };
  }
  if (raw.length <= 140) return { summary: raw, detail: '' };
  return { summary: `${raw.slice(0, 137).trim()}…`, detail: raw };
}

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
  const base = getApiBaseUrl();

  // Same-origin API (Next rewrite or Nginx): /edu_video is proxied with auth cookies.
  // Direct :8000 from :3000 does not receive access_token — lists hang or 401.
  if (typeof base === 'string' && base.startsWith('/')) {
    return '';
  }

  const candidates = [];

  const stripped = getApiOrigin();
  if (stripped) candidates.push(stripped);

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
  timeout: 25000,
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
   *
   * department_id + chapter_title are now REQUIRED by the backend for
   * every college-scoped caller (college_admin/faculty/hod) — see
   * BACKEND_EDU_VIDEO_CA_HANDOFF.md P1.3. Omitting them gets a 422
   * ("department_id is required." / "chapter_title is required...").
   * department_id must be a real Department belonging to the caller's own
   * college, or the server 404s ("Department not found").
   */
  upload({ file, language = 'english', departmentId, chapterTitle }) {
    const form = new FormData();
    form.append('file', file);
    form.append('language', language);
    if (departmentId) form.append('department_id', departmentId);
    if (chapterTitle) form.append('chapter_title', chapterTitle);
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
   * POST /edu_video/jobs/{job_id}/submit — starts rendering. Valid from
   * AWAITING_REVIEW (College Admin submitting directly, no HOD in the
   * loop) or AWAITING_TEACHER_REVIEW (HOD/Faculty approving a chapter the
   * College Admin sent them) — same endpoint, wider status check
   * server-side. Returns a status dict; callers may ignore the body and
   * keep polling/re-fetching the list instead.
   */
  submit(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/submit`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url).then((res) => res?.data);
  },

  /**
   * POST /edu_video/jobs/{job_id}/send_to_teacher — hands a College-
   * Admin-reviewed chapter to the department's HOD/Faculty for approval
   * before it renders. Only valid from AWAITING_REVIEW; the server 400s
   * otherwise. This is what "Send to HOD" should call instead of
   * submit() when a review step is required.
   */
  sendToTeacher(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/send_to_teacher`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url).then((res) => res?.data);
  },

  /**
   * GET /edu_video/jobs — server-side list (BACKEND_EDU_VIDEO_CA_HANDOFF.md
   * P1.1), scoped to the caller's own college automatically. This is the
   * source of truth for the Content Status table and the HOD/Faculty
   * review queue — NOT localStorage, which only ever reflected uploads
   * made from that one browser and could never show the same job to a
   * different browser/device/role.
   */
  listJobs({ status, departmentId, q, page = 1, pageSize = 25 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (departmentId) params.set('department_id', departmentId);
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs?${params.toString()}`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.get(url).then((res) => res?.data);
  },

  /**
   * POST /edu_video/jobs/{job_id}/send-to-hod — the real, default
   * post-render review step: a College Admin has watched the finished
   * video (status DONE + output_path) and hands it to their department's
   * HOD/Faculty for approval. 400s if the video hasn't finished rendering
   * yet, or if it was already sent once.
   */
  sendToHod(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/send-to-hod`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url).then((res) => res?.data);
  },

  /**
   * POST /edu_video/jobs/{job_id}/publish — an HOD/Faculty's final
   * approval; the video becomes visible to students from this point (no
   * separate student-facing consumption endpoint exists yet — see
   * CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md). 400s if a College
   * Admin hasn't sent it yet, or if it was already published.
   */
  publish(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/publish`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url).then((res) => res?.data);
  },

  /**
   * GET /edu_video/student/videos — a student's own reading list: chapters
   * published to their department only (published_at set, department_id
   * matches the logged-in student — enforced server-side off the student's
   * own user record, not anything this call can influence). Deliberately a
   * separate, narrower endpoint from listJobs() — a student never sees
   * drafts, other departments, or the college_admin/HOD management view.
   */
  listStudentVideos({ q, page = 1, pageSize = 25 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    const origin = getEduVideoOrigin();
    const path = `/edu_video/student/videos?${params.toString()}`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.get(url).then((res) => res?.data);
  },

  /**
   * DELETE /edu_video/jobs/{job_id} — soft-delete (the row and any
   * rendered file are kept server-side for audit; it just stops appearing
   * in listJobs()). Scoped to the caller's own college, same as every
   * other job route.
   */
  deleteJob(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.delete(url).then((res) => res?.data);
  },

  /** Absolute URL for GET /edu_video/download/{job_id} (open in new tab). */
  getDownloadUrl(jobId) {
    const origin = getEduVideoOrigin() || '';
    return `${origin}/edu_video/download/${encodeURIComponent(jobId)}`;
  },

  /**
   * GET /edu_video/jobs/{job_id}/plan — the AI-drafted lesson plan (scene
   * list: topic + narration + visual spec per scene). This is what a
   * College Admin actually has to review at AWAITING_REVIEW — there is no
   * rendered video yet at that stage (rendering only starts once an
   * HOD/Faculty approves it), only this plan. 400s if the plan isn't ready
   * yet (job hasn't finished scripting).
   */
  getPlan(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/plan`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.get(url).then((res) => res?.data);
  },

  /**
   * PUT /edu_video/jobs/{job_id}/plan — save slide/plan text edits.
   * Backend currently only accepts this while AWAITING_REVIEW /
   * AWAITING_TEACHER_REVIEW (400 on DONE).
   */
  putPlan(jobId, plan) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/plan`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.put(url, plan).then((res) => res?.data);
  },

  /**
   * POST /edu_video/jobs/{job_id}/request-changes — HOD/Faculty sends
   * edited plan (+ optional note) back to College Admin for regenerate.
   * Live FastAPI often 404s; we then fall back to the Next.js bridge
   * (`/api/edu-video/request-changes`) so the handoff works in-app until
   * backend ships the real route. See docs/BACKEND_EDU_VIDEO_REQUEST_CHANGES.md.
   */
  requestChanges(jobId, { plan, note, meta } = {}) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/request-changes`;
    const url = origin ? `${origin}${path}` : path;
    const body = { plan, note: note || undefined };

    return eduVideoClient
      .post(url, body)
      .then((res) => res?.data)
      .catch(async (err) => {
        const status = err?.response?.status;
        if (status !== 404 && status !== 405 && status !== 501) throw err;
        const bridgeRes = await fetch('/api/edu-video/request-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            job_id: jobId,
            plan,
            note: note || '',
            chapter_title: meta?.chapter_title || '',
            source_filename: meta?.source_filename || '',
            department_name: meta?.department_name || '',
            department_id: meta?.department_id || null,
            sent_to_hod_at: meta?.sent_to_hod_at || null,
          }),
        });
        const data = await bridgeRes.json().catch(() => ({}));
        if (!bridgeRes.ok) {
          const detail = data?.detail || data?.message || 'Could not store pending changes.';
          const bridgeErr = new Error(detail);
          bridgeErr.response = { status: bridgeRes.status, data };
          throw bridgeErr;
        }
        return data;
      });
  },

  /** Temporary Next bridge — list HOD→CA pending slide edits. */
  listPendingChanges() {
    return fetch('/api/edu-video/pending-changes', { credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data?.detail || 'Could not load pending changes.');
          err.response = { status: res.status, data };
          throw err;
        }
        return data;
      });
  },

  /** POST /edu_video/jobs/{job_id}/dismiss-changes — CA clears HOD queue without regenerate. */
  dismissChanges(jobId) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/dismiss-changes`;
    const url = origin ? `${origin}${path}` : path;
    return eduVideoClient.post(url, {}).then((res) => res?.data);
  },

  /** Temporary Next bridge — clear one pending item after CA acts. */
  clearPendingChange(jobId) {
    const qs = new URLSearchParams({ job_id: String(jobId) });
    return fetch(`/api/edu-video/pending-changes?${qs}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.detail || 'Could not clear pending change.');
        err.response = { status: res.status, data };
        throw err;
      }
      return data;
    });
  },

  /**
   * POST /edu_video/jobs/{job_id}/regenerate — College Admin re-renders
   * from the current (possibly HOD-edited) plan on a DONE / changes-
   * requested job. Not on the live backend yet. See
   * docs/BACKEND_EDU_VIDEO_REQUEST_CHANGES.md.
   */
  regenerate(jobId, { plan } = {}) {
    const origin = getEduVideoOrigin();
    const path = `/edu_video/jobs/${encodeURIComponent(jobId)}/regenerate`;
    const url = origin ? `${origin}${path}` : path;
    const body = plan ? { plan } : {};
    return eduVideoClient.post(url, body).then((res) => res?.data);
  },

  /**
   * Absolute URL for GET /edu_video/jobs/{job_id}/scene_image/{scene_index}
   * — a PNG render of one scene's actual slide design, for use directly as
   * an <img src>. Same auth-via-cookie behavior as getDownloadUrl.
   */
  getSceneImageUrl(jobId, sceneIndex) {
    const origin = getEduVideoOrigin() || '';
    return `${origin}/edu_video/jobs/${encodeURIComponent(jobId)}/scene_image/${sceneIndex}`;
  },
};

export default eduVideoApi;
