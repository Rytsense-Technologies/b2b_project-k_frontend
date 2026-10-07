import api from '@/lib/axios';
import { buildParams, unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/interview-assignments */
export const interviewAssignmentsApi = {
  list: async (params = {}) => {
    const res = await api.get(`/interview-assignments?${buildParams(params)}`);
    return unwrap(res);
  },

  summary: async () => {
    const res = await api.get('/interview-assignments/summary');
    return unwrap(res);
  },

  create: async (payload) => {
    const res = await api.post('/interview-assignments', payload);
    return unwrap(res);
  },

  update: async (id, payload) => {
    const res = await api.patch(`/interview-assignments/${id}`, payload);
    return unwrap(res);
  },

  close: async (id) => {
    const res = await api.post(`/interview-assignments/${id}/close`);
    return unwrap(res);
  },
};
