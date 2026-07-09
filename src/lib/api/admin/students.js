import api from '@/lib/axios';

export const studentsApi = {
  getStudents: ({ page = 1, limit = 10, search = '', department = '', semester = '', status = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search)     params.set('search',     search);
    if (department) params.set('department', department);
    if (semester)   params.set('semester',   semester);
    if (status)     params.set('status',     status);
    return api.get(`/admin/students?${params}`);
  },

  inviteStudent: (data) =>
    api.post('/admin/students', data),

  bulkImportStudents: (formData) =>
    api.post('/admin/students/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  toggleStudentStatus: (id, status) =>
    api.patch(`/admin/students/${id}/status`, { status }),

  getStudentReports: (id) =>
    api.get(`/admin/students/${id}/reports`),
};
