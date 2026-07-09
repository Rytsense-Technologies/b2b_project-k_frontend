import api from '@/lib/axios';

export const jobsApi = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  save: (id) => api.post(`/jobs/${id}/save`),
};
