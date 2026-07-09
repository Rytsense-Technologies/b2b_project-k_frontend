import api from '@/lib/axios';
import { resolveLivekitBrowserUrl } from '@/lib/livekitUrl';

export const interviewApi = {
  /** POST /livekit-interview/start — creates session + LiveKit token */
  startLivekitInterview: (data) => api.post('/livekit-interview/start', data),
  /**
   * POST /interviews/livekit/normalize-and-score
   * Post-interview pipeline: normalize transcript → score → generate report.
   */
  normalizeAndScoreInterview: (sessionId) =>
    api.post('/interviews/livekit/normalize-and-score', { session_id: sessionId }),
  /** @deprecated Use normalizeAndScoreInterview — kept as alias */
  endLivekitInterview: (sessionId) =>
    api.post('/interviews/livekit/normalize-and-score', { session_id: sessionId }),
  createSession:   (data)      => api.post('/interview/sessions', data),
  startSession:    (sessionId) => api.post(`/interview/sessions/${sessionId}/start`),
  submitAnswer:    (data)      => api.post('/interview/answers', data),
  completeSession: (sessionId) => api.post(`/interview/sessions/${sessionId}/complete`),
  endSession:      (sessionId) => api.post(`/interview/sessions/${sessionId}/complete`),
  getSessions:     ()          => api.get('/interview/sessions'),
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
