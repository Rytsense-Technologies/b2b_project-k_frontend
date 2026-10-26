/**
 * Voice Q&A — `/voice_qna` (not under `/api/v1`).
 * Start uses the platform login cookie.
 * History (list / get / delete) uses the platform session cookie first; when the
 * backend still answers 401 there (older builds accepted only the per-call
 * `user_token`), it falls back to that Bearer token if this browser has one.
 */
import { getApiOrigin } from '@/lib/apiConfig';

const TOKEN_KEY = 'voiceQnaToken';

export function getVoiceQnaBaseUrl() {
  const origin = getApiOrigin();
  if (!origin) return '/voice_qna';
  return `${origin.replace(/\/$/, '')}/voice_qna`;
}

export function readVoiceQnaToken() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function storeVoiceQnaToken(token) {
  if (typeof window === 'undefined' || !token) return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode */
  }
}

export function clearVoiceQnaToken() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function parseBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

/** 409 detail says the document failed to prepare (not just "still preparing"). */
function preparationFailed(data) {
  return /status:\s*failed|\bfailed\b/i.test(String(data?.detail || ''));
}

/** FRONTEND_CHANGES.md §3.2 — one message per status code. */
export function voiceQnaErrorMessage(status, data, fallback = 'Something went wrong with voice Q&A.') {
  if (status === 401) return 'Please sign in again before asking a doubt.';
  if (status === 403) return "You don't have access to this chapter.";
  if (status === 404) return "This chapter isn't available.";
  if (status === 409) {
    return preparationFailed(data)
      ? "This chapter can't be used for voice Q&A. Contact your admin."
      : 'Preparing this chapter, try again in a minute.';
  }
  if (status === 422) return 'Choose a chapter before starting a conversation.';
  if (status === 429) return 'Please wait a moment.';
  if (status === 502 || status === 503 || status === 500) return 'Voice assistant is unavailable. Try again later.';
  return fallback;
}

/** Whether the start call is worth a Retry button (chapter preparing / voice server down). */
export function voiceQnaCanRetry(status, data) {
  if (status === 409) return !preparationFailed(data);
  return status === 429 || status === 500 || status === 502 || status === 503;
}

/** Cookie-auth 401: refresh the platform session once, else send to login. */
async function refreshPlatformSession() {
  try {
    const { default: api } = await import('@/lib/axios');
    await api.post('/auth/refresh-token');
    return true;
  } catch {
    const { handleSessionExpired } = await import('@/lib/sessionExpiry');
    handleSessionExpired();
    return false;
  }
}

async function request(path, { method = 'GET', search, auth = 'cookie', retried = false, refresh = true } = {}) {
  const params = new URLSearchParams();
  if (search) {
    Object.entries(search).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  const qs = params.toString();
  const url = `${getVoiceQnaBaseUrl()}${path}${qs ? `?${qs}` : ''}`;
  const headers = { Accept: 'application/json' };
  const token = readVoiceQnaToken();
  if (auth === 'bearer') {
    if (!token) {
      const err = new Error('missing_token');
      err.status = 401;
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    credentials: auth === 'bearer' ? 'omit' : 'include',
  });
  const data = await parseBody(res);
  // An HTML page instead of JSON means /voice_qna isn't routed to the API
  // (missing Nginx location / Next rewrite) — FRONTEND_CHANGES.md §3.6.
  const html = typeof data?.detail === 'string' && /^\s*<(!doctype|html)/i.test(data.detail);
  if (html) {
    const err = new Error('Voice assistant is unavailable. Try again later.');
    err.status = 502; // a routing problem, not "chapter not found" - report it as unavailable
    err.data = { detail: 'Voice Q&A route returned an HTML page instead of JSON (check /voice_qna proxy).' };
    console.error('[voice_qna]', url, err.data.detail);
    throw err;
  }
  if (res.status === 401 && auth === 'cookie' && refresh && !retried) {
    if (await refreshPlatformSession()) {
      return request(path, { method, search, auth, retried: true });
    }
  }
  if (!res.ok) {
    if (res.status === 401 && auth === 'bearer') clearVoiceQnaToken();
    const err = new Error(voiceQnaErrorMessage(res.status, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * History calls: platform session cookie first (no refresh / logout on 401 —
 * a 401 here can simply mean the backend does not accept the cookie yet),
 * then the stored Bearer `user_token` as a fallback.
 */
async function sessionRequest(path, opts = {}) {
  try {
    return await request(path, { ...opts, auth: 'cookie', refresh: false });
  } catch (err) {
    if ((err?.status === 401 || err?.status === 403) && readVoiceQnaToken()) {
      return request(path, { ...opts, auth: 'bearer' });
    }
    throw err;
  }
}

export const voiceQnaApi = {
  /**
   * POST /voice_qna/conversation — 201 { conversation_id, livekit_url, livekit_token, user_token }
   * Pass exactly one of jobId, lessonId, conversationId.
   */
  async start({ jobId, lessonId, conversationId } = {}) {
    const data = await request('/conversation', {
      method: 'POST',
      auth: 'cookie',
      search: {
        job_id: jobId,
        lesson_id: lessonId,
        conversation_id: conversationId,
      },
    });
    if (data?.user_token) storeVoiceQnaToken(data.user_token);
    if (!data?.livekit_url || !data?.livekit_token) {
      throw new Error('Voice Q&A did not return a call ticket. Try again.');
    }
    return data;
  },

  list() {
    return sessionRequest('/conversations');
  },

  get(conversationId) {
    return sessionRequest(`/conversations/${encodeURIComponent(conversationId)}`);
  },

  remove(conversationId) {
    return sessionRequest(`/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
  },
};
