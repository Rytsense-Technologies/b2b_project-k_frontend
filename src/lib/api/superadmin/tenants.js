import api from '@/lib/axios';

export const tenantsApi = {
  getTenants: ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return api.get(`/superadmin/tenants?${params}`);
  },

  getTenant: (id) =>
    api.get(`/superadmin/tenants/${id}`),

  createTenant: (data) =>
    api.post('/superadmin/tenants', data),

  updateTenant: (id, data) =>
    api.patch(`/superadmin/tenants/${id}`, data),

  deleteTenant: (id) =>
    api.delete(`/superadmin/tenants/${id}`),

  toggleTenantStatus: (id, status) =>
    api.patch(`/superadmin/tenants/${id}/status`, { status }),
};
