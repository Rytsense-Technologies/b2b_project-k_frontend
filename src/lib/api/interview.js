import api from '@/lib/axios';
import { resolveLivekitBrowserUrl } from '@/lib/livekitUrl';
import { unwrap } from '@/lib/api/superadmin/http';

export const interviewApi = {
  /** POST /livekit-interview/start — creates session + LiveKit token */
  startLivekitInterview(data) {
    return api.post('/livekit-interview/start', data).then((res) => {
      const body = res?.data;
      // LiveKit start is a flat payload — do not unwrap a nested `data` key
      // if session credentials are already at the top level.
      if (body && typeof body === 'object' && body.token && (body.session_id || body.id)) {
        return body;
      }
      return unwrap(res);
    });
  },

  /**
   * POST /livekit-interview/{session_id}/abort
   * Only when the candidate never spoke with the interviewer.
   * Call before room.disconnect().
   */
  abortLivekitInterview(sessionId) {
    return api
      .post(`/livekit-interview/${encodeURIComponent(sessionId)}/abort`)
      .then(unwrap);
  },

  /**
   * @deprecated Agent-only. Do not call from the student UI.
   * Kept for legacy imports.
   */
  normalizeAndScoreInterview(sessionId) {
    return api
      .post('/interviews/livekit/normalize-and-score', { session_id: sessionId })
      .then(unwrap);
  },

  /** @deprecated */
  endLivekitInterview(sessionId) {
    return interviewApi.normalizeAndScoreInterview(sessionId);
  },
};

/** Normalize start response — backend may use session_id or id */
export function extractSessionId(data) {
  if (!data || typeof data !== 'object') return null;
  return data.session_id ?? data.id ?? data.sessionId ?? null;
}

/** Parse LiveKit start response — resolves URL for browser when needed */
export function parseLivekitStartResponse(data) {
  if (!data || typeof data !== 'object') return null;
  const sessionId = extractSessionId(data);
  const { token, url, room, position, persona, mode } = data;
  if (!sessionId || !token || !url) return null;
  const browserUrl = resolveLivekitBrowserUrl(url);
  return {
    sessionId,
    token,
    url: browserUrl,
    apiUrl: url,
    room,
    position,
    persona: persona ?? null,
    mode: mode === 'full' ? 'full' : 'mock',
  };
}
