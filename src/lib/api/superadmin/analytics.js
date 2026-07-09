import api from '@/lib/axios';

export const superAdminApi = {
  getPlatformStats:  ()              => api.get('/superadmin/stats'),
  getRecentTenants:  (limit = 5)     => api.get(`/superadmin/tenants?limit=${limit}&sort=created_at:desc`),
  getInterviewTrend: (days  = 30)    => api.get(`/superadmin/analytics/trend?days=${days}`),

  getPlatformTrend:    ({ days = 30 } = {})            => api.get(`/superadmin/analytics/trend?days=${days}`),
  getTopTenants:       ({ days = 30, limit = 10 } = {}) => api.get(`/superadmin/analytics/top-tenants?days=${days}&limit=${limit}`),
  getRoleDistribution: ()                               => api.get('/superadmin/analytics/roles'),
  getRevenueTrend:     ({ days = 30 } = {})            => api.get(`/superadmin/analytics/revenue?days=${days}`),
};
