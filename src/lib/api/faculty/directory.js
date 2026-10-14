import api from '@/lib/axios';
import { buildParams, unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/faculty/* - HOD / Faculty teaching portal (scope-aware). */
export const facultyDirectoryApi = {
  /** Role, department, assigned subjects, read-only flag, HOD capabilities. */
  me: async () => unwrap(await api.get('/faculty/me')),
  overview: async () => unwrap(await api.get('/faculty/overview')),
  students: async ({ q = '', status = '', page = 1, pageSize = 25 } = {}) => {
    const res = await api.get(
      `/faculty/students?${buildParams({ q, status: status || undefined, page, page_size: pageSize })}`,
    );
    return unwrap(res);
  },
  student: async (id) => unwrap(await api.get(`/faculty/students/${id}`)),
  subjects: async () => unwrap(await api.get('/faculty/subjects')),
  /** HOD only. */
  staff: async () => unwrap(await api.get('/faculty/staff')),
};

/** Messages Quirri sent to the signed-in person (any role). */
export const myNotificationsApi = {
  list: async ({ page = 1, pageSize = 25, days = 30 } = {}) =>
    unwrap(await api.get(`/notifications/mine?${buildParams({ page, page_size: pageSize, days })}`)),
};
