import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/analytics/* */
export const analyticsApi = {
  college: async () => {
    const res = await api.get('/analytics/college');
    return unwrap(res);
  },
  department: async () => {
    const res = await api.get('/analytics/department');
    return unwrap(res);
  },
};
