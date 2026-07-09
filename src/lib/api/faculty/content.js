import api from '@/lib/axios';

export const contentApi = {
  uploadContent: (formData, onUploadProgress) =>
    api.post('/faculty/content/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),

  getMyContent: ({ page = 1, limit = 10, status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set('status', status);
    return api.get(`/faculty/content?${params}`);
  },

  deleteContent: (id) =>
    api.delete(`/faculty/content/${id}`),

  // ── Review queue ──────────────────────────────────────────────────────────

  getPendingReviews: ({ page = 1, type = '', status = 'pending' } = {}) => {
    const params = new URLSearchParams({ page, status });
    if (type) params.set('type', type);
    return api.get(`/faculty/content/review?${params}`);
  },

  getReviewStats: () =>
    api.get('/faculty/content/review/stats'),

  getContentDetail: (id) =>
    api.get(`/faculty/content/${id}`),

  approveContent: (id) =>
    api.patch(`/faculty/content/${id}/approve`),

  rejectContent: (id, reason) =>
    api.patch(`/faculty/content/${id}/reject`, { reason }),

  requestRegeneration: (id, reason) =>
    api.patch(`/faculty/content/${id}/regenerate`, { reason }),
};
