import api from '@/lib/axios';

export const adminAnalyticsApi = {
  getAdminStats:    ()            => api.get('/admin/stats'),
  getRecentActivity:(limit = 10) => api.get(`/admin/activity?limit=${limit}`),

  // Updated: was no-arg, now accepts optional filters (backward compatible — no args still works)
  getDeptScores: ({ semester = '', dateFrom = '', dateTo = '' } = {}) => {
    const params = new URLSearchParams();
    if (semester) params.set('semester', semester);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo)   params.set('date_to',   dateTo);
    const qs = params.toString();
    return api.get(`/admin/analytics/departments${qs ? `?${qs}` : ''}`);
  },

  getScoreTrend: ({ months = 6 } = {}) =>
    api.get(`/admin/analytics/trend?months=${months}`),

  getTopStudents: ({ limit = 10, month = '' } = {}) => {
    const params = new URLSearchParams({ limit });
    if (month) params.set('month', month);
    return api.get(`/admin/analytics/top-students?${params}`);
  },

  getPlacementReadiness: () =>
    api.get('/admin/analytics/placement-readiness'),
};
