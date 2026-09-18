import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

export const reportsApi = {
  /** GET /reports/livekit — list + KPI */
  getLivekit(params) {
    return api.get('/reports/livekit', { params }).then(unwrap);
  },

  /** GET /reports/livekit/{session_id} */
  getLivekitReport(sessionId) {
    return api.get(`/reports/livekit/${encodeURIComponent(sessionId)}`).then(unwrap);
  },

  /** GET /reports/livekit/{session_id}/status — poll while scoring */
  getLivekitStatus(sessionId) {
    return api
      .get(`/reports/livekit/${encodeURIComponent(sessionId)}/status`)
      .then(unwrap);
  },

  /** GET /reports/livekit/{session_id}/audio-summary */
  getLivekitAudioSummary(sessionId) {
    return api
      .get(`/reports/livekit/${encodeURIComponent(sessionId)}/audio-summary`)
      .then(unwrap);
  },

  getAll: (params) => api.get('/reports', { params }).then(unwrap),
  getById: (id) => api.get(`/reports/${id}`).then(unwrap),
  getSummary: (id) => api.get(`/reports/${id}/summary`).then(unwrap),
  download: (id) => api.post(`/reports/${id}/download`).then(unwrap),
  getScoreCard: (id) => api.get(`/score-cards/${id}`).then(unwrap),
  verifyScoreCard: (id) => api.get(`/score-cards/${id}/verify`).then(unwrap),
};
