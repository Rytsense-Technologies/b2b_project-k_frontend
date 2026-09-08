import api from '@/lib/axios';
import { buildParams } from './http';

/**
 * Live: /api/v1/users (PRJ-127, PRJ-141).
 * @see docs/BACKEND_STATUS_REPORT.md
 */
export const usersApi = {
  getUsers: ({
    page = 1,
    pageSize = 25,
    limit,
    search = '',
    q,
    role = '',
    tenantId = '',
    status = '',
    is_active,
  } = {}) => {
    const query = {
      page,
      page_size: pageSize ?? limit ?? 25,
      q: q ?? search,
      role: role || undefined,
      tenant_id: tenantId || undefined,
    };
    if (is_active !== undefined && is_active !== '') {
      query.is_active = is_active;
    } else if (status) {
      const s = String(status).toLowerCase();
      if (s === 'active') query.is_active = true;
      if (s === 'inactive' || s.includes('deactiv')) query.is_active = false;
    }
    return api.get(`/users?${buildParams(query)}`);
  },

  getUser: (userId) => api.get(`/users/${userId}`),

  /** No password — activation email is issued by the backend. */
  createUser: (payload) => {
    const body = {
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name || undefined,
      role: payload.role,
      tenant_id: payload.tenant_id || payload.college_id || undefined,
      phone_number: payload.phone_number ?? payload.phone ?? undefined,
      department: payload.department || undefined,
    };
    return api.post('/users', body);
  },

  updateUserRole: (userId, role) =>
    api.patch(`/users/${userId}/role`, { role }),

  deactivate: (userId) => api.post(`/users/${userId}/deactivate`),
  reactivate: (userId) => api.post(`/users/${userId}/reactivate`),

  /** @deprecated use deactivate/reactivate */
  toggleUserStatus: (userId, status) => {
    const active = String(status).toLowerCase() === 'active';
    return active
      ? api.post(`/users/${userId}/reactivate`)
      : api.post(`/users/${userId}/deactivate`);
  },

  /** Maps to POST /auth/resend-activation { email } */
  resendInvite: (emailOrUser) => {
    const email = typeof emailOrUser === 'string'
      ? emailOrUser
      : emailOrUser?.email;
    return api.post('/auth/resend-activation', { email });
  },

  /** EPIC-12 bulk CSV — not live yet. */
  bulkCreateUsers: (formData) =>
    api.post('/users/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  downloadCSVTemplate: async () => {
    const res = await api.get('/users/csv-template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
