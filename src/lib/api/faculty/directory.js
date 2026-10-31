import api from '@/lib/axios';
import { buildParams, unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/faculty/* - HOD / Faculty teaching portal (scope-aware). */
export const facultyDirectoryApi = {
  /** Role, department, assigned subjects, read-only flag, HOD capabilities. */
  me: async () => unwrap(await api.get('/faculty/me')),
  /** Alias of me() for Settings (contract name). */
  facultyMe: async () => unwrap(await api.get('/faculty/me')),
  overview: async () => unwrap(await api.get('/faculty/overview')),
  students: async ({ q = '', status = '', programId = '', semesterId = '', yearOfStudy = '', page = 1, pageSize = 25 } = {}) => {
    const res = await api.get(
      `/faculty/students?${buildParams({
        q,
        status: status || undefined,
        program_id: programId || undefined,
        semester_id: semesterId || undefined,
        year_of_study: yearOfStudy || undefined,
        page,
        page_size: pageSize,
      })}`,
    );
    return unwrap(res);
  },
  student: async (id) => unwrap(await api.get(`/faculty/students/${id}`)),
  subjects: async () => unwrap(await api.get('/faculty/subjects')),
  /** HOD only. */
  staff: async () => unwrap(await api.get('/faculty/staff')),
};

/** GET /faculty/me (HOD / Faculty): department_name, college_name, is_hod, subjects. */
export const facultyMe = () => facultyDirectoryApi.me();

export { myNotificationsApi } from '@/lib/api/notificationRules';
