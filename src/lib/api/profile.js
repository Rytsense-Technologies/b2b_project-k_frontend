import api from '@/lib/axios';

export const profileApi = {
  get: () => api.get('/profile/'),

  update: (data) => api.patch('/profile/', data),

  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/profile/photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadResume: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/profile/resume', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listResumes: () => api.get('/profile/resumes'),

  getParsedResume: (resumeId) => api.get(`/profile/resume/${resumeId}/parsed`),

  /** Interview prep (replaces POST .../resume/{id}/parse) */
  parseResume: (resumeId) =>
    api.post('/profile/interview-prepare', { resume_id: resumeId }),
};
