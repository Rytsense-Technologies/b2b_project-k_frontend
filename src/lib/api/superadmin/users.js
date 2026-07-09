import api from '@/lib/axios';

export const usersApi = {
  getUsers: ({ page = 1, limit = 10, search = '', role = '', tenantId = '', status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search)   params.set('search',    search);
    if (role)     params.set('role',      role);
    if (tenantId) params.set('tenant_id', tenantId);
    if (status)   params.set('status',    status);
    return api.get(`/superadmin/users?${params}`);
  },

  updateUserRole: (userId, role) =>
    api.patch(`/superadmin/users/${userId}/role`, { role }),

  toggleUserStatus: (userId, status) =>
    api.patch(`/superadmin/users/${userId}/status`, { status }),

  bulkCreateUsers: (formData) =>
    api.post('/superadmin/users/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  downloadCSVTemplate: async () => {
    const res = await api.get('/superadmin/users/csv-template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'users_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
