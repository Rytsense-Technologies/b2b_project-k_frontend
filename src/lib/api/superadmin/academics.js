import { api, buildParams } from './http';

/**
 * Academic hierarchy (SOW §6.2): Programme > Semester > Subject > Chapter,
 * below a Department. Backend: app/api/v1/academics.py. Scope is enforced
 * server-side (Super Admin everywhere, College Admin own college, HOD own
 * department, Faculty read-only).
 */
export const academicsApi = {
  summary: (params = {}) => api.get(`/academics/summary?${buildParams(params)}`),

  listPrograms: (params = {}) => api.get(`/academics/programs?${buildParams(params)}`),
  getProgram: (id) => api.get(`/academics/programs/${id}`),
  createProgram: (body) => api.post('/academics/programs', body),
  updateProgram: (id, body) => api.patch(`/academics/programs/${id}`, body),

  addSemester: (programId, body = {}) => api.post(`/academics/programs/${programId}/semesters`, body),
  updateSemester: (id, body) => api.patch(`/academics/semesters/${id}`, body),

  listSubjects: (semesterId, params = {}) => api.get(`/academics/semesters/${semesterId}/subjects?${buildParams(params)}`),
  createSubject: (semesterId, body) => api.post(`/academics/semesters/${semesterId}/subjects`, body),
  updateSubject: (id, body) => api.patch(`/academics/subjects/${id}`, body),

  listChapters: (subjectId, params = {}) => api.get(`/academics/subjects/${subjectId}/chapters?${buildParams(params)}`),
  createChapter: (subjectId, body) => api.post(`/academics/subjects/${subjectId}/chapters`, body),
  updateChapter: (id, body) => api.patch(`/academics/chapters/${id}`, body),
  reorderChapters: (subjectId, chapterIds) => api.post(`/academics/subjects/${subjectId}/chapters/reorder`, { chapter_ids: chapterIds }),
  getChapter: (id) => api.get(`/academics/chapters/${id}`),

  // Faculty / HOD teaching assignment (SOW §6.3).
  getStaffSubjects: (staffId) => api.get(`/academics/staff/${staffId}/subjects`),
  setStaffSubjects: (staffId, subjectIds) => api.put(`/academics/staff/${staffId}/subjects`, { subject_ids: subjectIds }),
  staffSubjectMap: () => api.get('/academics/staff-subjects'),
};
