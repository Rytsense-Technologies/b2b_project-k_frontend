import api from '@/lib/axios';

export const facultyStudentsApi = {
  getFacultyStats: () =>
    api.get('/faculty/stats'),

  getMyStudents: ({ search = '', page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set('search', search);
    return api.get(`/faculty/students?${params}`);
  },

  getQnaQuestions: ({ subjectId = '', chapter = '', showAnswered = false, limit } = {}) => {
    const params = new URLSearchParams();
    if (subjectId)    params.set('subject_id',    subjectId);
    if (chapter)      params.set('chapter',       chapter);
    if (showAnswered) params.set('show_answered', 'true');
    if (limit)        params.set('limit',         limit);
    return api.get(`/faculty/qna/questions?${params}`);
  },

  markQuestionAnswered: (questionId) =>
    api.patch(`/faculty/qna/questions/${questionId}/answered`),

  getQnaSubjects: () =>
    api.get('/faculty/qna/subjects'),
};
