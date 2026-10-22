import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/analytics/* */
export const analyticsApi = {
  /** College Admin overview: totals, departments, subjects, students, at-risk,
   *  score spread, Q&A demand, review queue. */
  college: async ({ range = '', department = '' } = {}) => {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    if (department) params.set('department', department);
    const qs = params.toString();
    const res = await api.get(`/analytics/college${qs ? `?${qs}` : ''}`);
    return unwrap(res);
  },
  /** HOD: the department. Faculty: their subjects' students and subjects. */
  department: async ({ range = '' } = {}) => {
    const res = await api.get(`/analytics/department${range ? `?range=${encodeURIComponent(range)}` : ''}`);
    return unwrap(res);
  },
};
