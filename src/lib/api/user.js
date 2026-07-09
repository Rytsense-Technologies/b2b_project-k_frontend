import api from '@/lib/axios';

export const userApi = {
  // GET /auth/me → returns UserOut directly
  getMe: () => api.get('/auth/me'),

  // PATCH /profile/ → updates profile + user name fields
  updateMe: (data) => api.patch('/profile/', data),

  // POST /profile/photo — field name must be 'file'
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/profile/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // POST /profile/resume — field name must be 'file'
  uploadResume: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/profile/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // GET /profile/ → returns { user, profile }
  getProfile: () => api.get('/profile/'),
};
