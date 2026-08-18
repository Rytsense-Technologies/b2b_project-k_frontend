import { api, buildParams, withMock, downloadBlob } from './http';
import {
  DASHBOARD_METRICS,
  LEARNING_ACTIVITY,
  TOP_COLLEGES,
  DEPT_SNAPSHOT,
} from '@/lib/mock/superadminData';

export const dashboardApi = {
  getOverview: (params = {}) =>
    withMock(
      () => api.get(`/superadmin/dashboard?${buildParams(params)}`),
      () => ({
        metrics: DASHBOARD_METRICS,
        learning_activity: LEARNING_ACTIVITY,
        top_colleges: TOP_COLLEGES,
        department_snapshot: DEPT_SNAPSHOT,
      }),
    ),
};

export const collegesApi = {
  list: (params = {}) =>
    api.get(`/superadmin/colleges?${buildParams(params)}`),
  get: (id) => api.get(`/superadmin/colleges/${id}`),
  create: (payload) => api.post('/superadmin/colleges', payload),
  update: (id, payload) => api.patch(`/superadmin/colleges/${id}`, payload),
  remove: (id) => api.delete(`/superadmin/colleges/${id}`),
};

export const departmentsApi = {
  list: (params = {}) =>
    api.get(`/superadmin/departments?${buildParams(params)}`),
  exportData: (params = {}) =>
    downloadBlob(
      () => api.get(`/superadmin/departments/export?${buildParams(params)}`, { responseType: 'blob' }),
      'departments.csv',
    ),
};

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

export const reportsApi = {
  preview: (params = {}) =>
    api.get(`/superadmin/reports/preview?${buildParams(params)}`),
  generate: (payload) => api.post('/superadmin/reports/generate', payload),
  download: (format, params = {}) =>
    downloadBlob(
      () => api.get(`/superadmin/reports/download?${buildParams({ ...params, format })}`, { responseType: 'blob' }),
      `report.${format}`,
    ),
};

export const auditApi = {
  list: (params = {}) =>
    api.get(`/superadmin/audit-logs?${buildParams(params)}`),
  exportData: (params = {}) =>
    downloadBlob(
      () => api.get(`/superadmin/audit-logs/export?${buildParams(params)}`, { responseType: 'blob' }),
      'audit-logs.csv',
    ),
};

export const settingsApi = {
  get: () => api.get('/superadmin/settings'),
  update: (payload) => api.patch('/superadmin/settings', payload),
};
