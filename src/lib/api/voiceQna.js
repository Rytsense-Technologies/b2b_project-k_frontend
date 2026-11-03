/**
 * Voice Q&A — `/voice_qna` (not under `/api/v1`).
 * Every call uses the platform login cookie. The `user_token` the start call
 * returns is ignored: a bearer kept in this browser could answer for the
 * previous student on a shared machine.
 */
import { getApiOrigin } from '@/lib/apiConfig';

export function getVoiceQnaBaseUrl() {
  const origin = getApiOrigin();
  if (!origin) return '/voice_qna';
  return `${origin.replace(/\/$/, '')}/voice_qna`;
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

/** Per-college daily cap (429): "Your college has reached today's limit of N tutor questions. Try again tomorrow." */
export function dailyCapMessage(data) {
  const detail = typeof data?.detail === 'string' ? data.detail.trim() : '';
  return /reached today's limit/i.test(detail) ? detail : null;
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
  if (status === 413) return (typeof data?.detail === 'string' && data.detail.trim()) || 'That message is too long. Shorten it and try again.';
  if (status === 429) return dailyCapMessage(data) || 'Please wait a moment.';
  if (status === 502 || status === 503 || status === 500) return 'Voice assistant is unavailable. Try again later.';
  return fallback;
}

/** Whether the start call is worth a Retry button (chapter preparing / voice server down). */
export function voiceQnaCanRetry(status, data) {
  if (status === 409) return !preparationFailed(data);
  if (status === 429) return !dailyCapMessage(data);
  return status === 500 || status === 502 || status === 503;
}

/** Cookie-auth 401: refresh the platform session once, else send to login. */
async function refreshPlatformSession() {
  try {
    const { refreshSession } = await import('@/lib/axios');
    await refreshSession();
    return true;
  } catch {
    const { handleSessionExpired } = await import('@/lib/sessionExpiry');
    handleSessionExpired();
    return false;
  }
}

async function request(path, { method = 'GET', search, body, retried = false } = {}) {
  const params = new URLSearchParams();
  if (search) {
    Object.entries(search).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  const qs = params.toString();
  const url = `${getVoiceQnaBaseUrl()}${path}${qs ? `?${qs}` : ''}`;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
  if (res.status === 401 && !retried) {
    if (await refreshPlatformSession()) {
      return request(path, { method, search, body, retried: true });
    }
  }
  if (!res.ok) {
    const err = new Error(voiceQnaErrorMessage(res.status, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const voiceQnaApi = {
  /**
   * POST /voice_qna/conversation — 201 { conversation_id, livekit_url, livekit_token }
   * Pass exactly one of jobId, lessonId, conversationId.
   */
  async start({ jobId, lessonId, conversationId } = {}) {
    const data = await request('/conversation', {
      method: 'POST',
      search: {
        job_id: jobId,
        lesson_id: lessonId,
        conversation_id: conversationId,
      },
    });
    if (!data?.livekit_url || !data?.livekit_token) {
      throw new Error('Voice Q&A did not return a call ticket. Try again.');
    }
    return data;
  },

  list() {
    return request('/conversations');
  },

  get(conversationId) {
    return request(`/conversations/${encodeURIComponent(conversationId)}`);
  },

  /**
   * POST /voice_qna/chat — the typed fallback. Continues `conversationId`, else starts a
   * new conversation on the chapter. Same tutor; the turn lands in the same history.
   */
  chat({ jobId, conversationId, text }) {
    return request('/chat', {
      method: 'POST',
      search: conversationId ? { conversation_id: conversationId } : { job_id: jobId },
      body: { text },
    });
  },

  /** PATCH /voice_qna/conversations/{id} — an empty name goes back to the automatic one. */
  rename(conversationId, title) {
    return request(`/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'PATCH',
      body: { title: String(title || '').trim() || null },
    });
  },

  remove(conversationId) {
    return request(`/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
  },
};
