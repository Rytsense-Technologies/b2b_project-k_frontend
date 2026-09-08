import { api, buildParams, downloadBlob, unwrap } from './http';

export async function fetchData(request) {
  return unwrap(await request());
}

/** Live: GET /api/v1/dashboard — institution/user counts; learning KPIs empty until analytics. */
export const dashboardApi = {
  getOverview: (params = {}) =>
    api.get(`/dashboard?${buildParams(params)}`),
};

/**
 * Live: /api/v1/universities (Super Admin only).
 * @see docs/BACKEND_STATUS_REPORT.md
 */
export const universitiesApi = {
  list: (params = {}) => {
    const query = {
      q: params.q ?? params.search,
      is_active: params.is_active,
      page: params.page ?? 1,
      page_size: params.page_size ?? params.pageSize ?? 25,
    };
    return api.get(`/universities?${buildParams(query)}`);
  },
  get: (id) => api.get(`/universities/${id}`),
  create: (payload) => api.post('/universities', payload),
  update: (id, payload) => api.patch(`/universities/${id}`, payload),
  deactivate: (id) => api.post(`/universities/${id}/deactivate`),
  reactivate: (id) => api.post(`/universities/${id}/reactivate`),
};

/**
 * Live: /api/v1/colleges (Tenant entity). Super Admin only.
 * Create is atomic college + admins[]. Soft-delete via deactivate/reactivate.
 */
export const collegesApi = {
  list: (params = {}) => {
    const query = {
      q: params.q ?? params.search,
      university_id: params.university_id,
      is_active: params.is_active,
      page: params.page ?? 1,
      page_size: params.page_size ?? params.pageSize ?? 25,
    };
    return api.get(`/colleges?${buildParams(query)}`);
  },
  get: (id) => api.get(`/colleges/${id}`),
  create: (payload) => api.post('/colleges', payload),
  update: (id, payload) => api.patch(`/colleges/${id}`, payload),
  deactivate: (id) => api.post(`/colleges/${id}/deactivate`),
  reactivate: (id) => api.post(`/colleges/${id}/reactivate`),
};

/** EPIC-06 not started — UI should not pretend departments exist. */
export const departmentsApi = {
  list: (params = {}) =>
    api.get(`/superadmin/departments?${buildParams(params)}`),
  exportData: (params = {}) =>
    downloadBlob(
      () => api.get(`/superadmin/departments/export?${buildParams(params)}`, { responseType: 'blob' }),
      'departments.csv',
    ),
};

/** Out of Phase 1 Super Admin nav — do not reintroduce in UI. */
export const skillsApi = {
  list: (params = {}) =>
    api.get(`/superadmin/skill-courses?${buildParams(params)}`),
  metrics: () => api.get('/superadmin/skill-courses/metrics'),
  generate: (payload) => api.post('/superadmin/skill-courses/generate', payload),
  upload: (formData) =>
    api.post('/superadmin/skill-courses/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, payload) => api.patch(`/superadmin/skill-courses/${id}`, payload),
};

/**
 * Upload & Generate removed from Super Admin UI.
 * Prefer faculty/edu_video flows when content generation returns.
 */

export const aiUsageApi = {
  list: (params = {}) =>
    api.get(`/superadmin/ai-usage?${buildParams(params)}`),
  exportData: (params = {}) =>
    downloadBlob(
      () => api.get(`/superadmin/ai-usage/export?${buildParams(params)}`, { responseType: 'blob' }),
      'ai-usage.csv',
    ),
};

export const emailsApi = {
  list: () => api.get('/superadmin/emails'),
  create: (payload) => api.post('/superadmin/emails', payload),
  update: (id, payload) => api.patch(`/superadmin/emails/${id}`, payload),
  remove: (id) => api.delete(`/superadmin/emails/${id}`),
  verify: (id) => api.post(`/superadmin/emails/${id}/verify`),
};

/** Live: /api/v1/reports — institution preview + CSV; learning report types stay empty. */
export const reportsApi = {
  preview: (params = {}) =>
    api.get(`/reports/preview?${buildParams(params)}`),
  generate: (payload) => api.post('/reports/generate', payload),
  download: (format, params = {}) =>
    downloadBlob(
      () => api.get(`/reports/download?${buildParams({ ...params, format })}`, { responseType: 'blob' }),
      `report.${format}`,
    ),
};

/** Live: /api/v1/health — DB/API status; no invented uptime/p95. */
export const healthApi = {
  getStatus: () => api.get('/health'),
  getErrors: (params = {}) =>
    api.get(`/health/errors?${buildParams(params)}`),
};

/** Live: /api/v1/audit-logs — append-only rows from institution/user/auth mutations. */
export const auditApi = {
  list: (params = {}) =>
    api.get(`/audit-logs?${buildParams(params)}`),
  exportData: (params = {}) =>
    downloadBlob(
      () => api.get(`/audit-logs/export?${buildParams(params)}`, { responseType: 'blob' }),
      'audit-logs.csv',
    ),
};

/** Live: /api/v1/notifications — SOW event catalogue; deliveries empty until ESP. */
export const notificationsApi = {
  listEvents: () => api.get('/notifications/events'),
  listDeliveries: (params = {}) =>
    api.get(`/notifications/deliveries?${buildParams(params)}`),
  retryFailed: () => api.post('/notifications/deliveries/retry-failed'),
};

/**
 * Settings = auth profile surface (EPIC-03).
 * GET/PATCH /auth/me · POST /auth/change-password
 */
export const settingsApi = {
  get: () => api.get('/auth/me'),
  update: (payload) => {
    const body = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone_number: payload.phone_number ?? payload.phone ?? payload.mobile,
    };
    if (payload.avatar_url !== undefined) body.avatar_url = payload.avatar_url;
    return api.patch('/auth/me', body);
  },
  changePassword: (payload) =>
    api.post('/auth/change-password', {
      current_password: payload.current_password,
      new_password: payload.new_password,
      confirm_password: payload.confirm_password,
    }),
};

/** Live: /api/v1/roles */
export const rolesApi = {
  list: (params = {}) => api.get(`/roles?${buildParams(params)}`),
  get: (code) => api.get(`/roles/${code}`),
  create: (payload) => api.post('/roles', payload),
  update: (code, payload) => api.patch(`/roles/${code}`, payload),
  remove: (code) => api.delete(`/roles/${code}`),
};
