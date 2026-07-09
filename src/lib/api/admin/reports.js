import api from '@/lib/axios';

export const adminReportsApi = {
  getAdminReports: ({
    page = 1, limit = 10,
    search = '', department = '',
    dateFrom = '', dateTo = '',
    scoreMin = '', scoreMax = '',
  } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (search)     params.set('search',     search);
    if (department) params.set('department', department);
    if (dateFrom)   params.set('date_from',  dateFrom);
    if (dateTo)     params.set('date_to',    dateTo);
    if (scoreMin !== '') params.set('score_min', scoreMin);
    if (scoreMax !== '') params.set('score_max', scoreMax);
    return api.get(`/admin/reports?${params}`);
  },

  exportReportsCSV: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search)     params.set('search',     filters.search);
    if (filters.department) params.set('department', filters.department);
    if (filters.dateFrom)   params.set('date_from',  filters.dateFrom);
    if (filters.dateTo)     params.set('date_to',    filters.dateTo);
    if (filters.scoreMin !== '') params.set('score_min', filters.scoreMin);
    if (filters.scoreMax !== '') params.set('score_max', filters.scoreMax);

    const res = await api.get(`/admin/reports/export?${params}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
