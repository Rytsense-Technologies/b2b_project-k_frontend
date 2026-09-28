/**
 * Voice Q&A — `/voice_qna` (not under `/api/v1`).
 * Start uses the platform login cookie.
 * History uses the `user_token` returned by start (Bearer only).
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

export function voiceQnaErrorMessage(status, data, fallback = 'Something went wrong with voice Q&A.') {
  if (status === 401) return 'Please sign in again before asking a doubt.';
  if (status === 403) return "You don't have access to this chapter.";
  if (status === 404) return 'This chapter or conversation could not be found.';
  if (status === 409) return 'This chapter is still being prepared for voice Q&A. Try again in a minute.';
  if (status === 422) return 'Choose a chapter before starting a conversation.';
  if (status === 429) return 'Please wait a moment and try again.';
  if (status === 502 || status === 500) return 'Voice assistant is unavailable. Try again later.';
  return fallback;
}

async function request(path, { method = 'GET', search, auth = 'cookie' } = {}) {
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
  if (!res.ok) {
    if (res.status === 401 && auth === 'bearer') clearVoiceQnaToken();
    const err = new Error(voiceQnaErrorMessage(res.status, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
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
    return request('/conversations', { auth: 'bearer' });
  },

  get(conversationId) {
    return request(`/conversations/${encodeURIComponent(conversationId)}`, { auth: 'bearer' });
  },

  remove(conversationId) {
    return request(`/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
      auth: 'bearer',
    });
  },
};
