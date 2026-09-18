import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/**
 * Interview profile / resume APIs — LIVEKIT_INTERVIEW_FRONTEND_GUIDE.md §2
 * Base: /api/v1/interview-profile
 */
export const interviewProfileApi = {
  /** POST /interview-profile/resume — multipart field `file` */
  uploadResume(file) {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post('/interview-profile/resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(unwrap);
  },

  /** GET /interview-profile/resumes */
  listResumes({ includeFailed = false } = {}) {
    return api
      .get('/interview-profile/resumes', {
        params: { include_failed: includeFailed },
      })
      .then(unwrap);
  },

  /** PATCH /interview-profile/resume/{id}/current */
  setCurrentResume(resumeId) {
    return api
      .patch(`/interview-profile/resume/${encodeURIComponent(resumeId)}/current`)
      .then(unwrap);
  },

  /** DELETE /interview-profile/resume/{id} */
  deleteResume(resumeId) {
    return api
      .delete(`/interview-profile/resume/${encodeURIComponent(resumeId)}`)
      .then(unwrap);
  },

  /**
   * POST /interview-profile/interview-prepare
   * Required before /livekit-interview/start. Always send position for role_match.
   */
  prepareInterview({ resumeId, position }) {
    return api
      .post('/interview-profile/interview-prepare', {
        resume_id: resumeId,
        position: position?.trim() || undefined,
      })
      .then(unwrap);
  },
};

export function resumesFromList(data) {
  if (Array.isArray(data?.resumes)) return data.resumes;
  if (Array.isArray(data)) return data;
  return [];
}
