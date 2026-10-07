import api from '@/lib/axios';
import { buildParams, unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/faculty/* */
export const facultyDirectoryApi = {
  students: async ({ q = '', page = 1, pageSize = 25 } = {}) => {
    const res = await api.get(
      `/faculty/students?${buildParams({ q, page, page_size: pageSize })}`,
    );
    return unwrap(res);
  },
  subjects: async () => {
    const res = await api.get('/faculty/subjects');
    return unwrap(res);
  },
};
