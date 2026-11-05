import api from '@/lib/axios';

let meInFlight = null;

export const userApi = {
  // GET /auth/me → returns UserOut directly. Overlapping callers share one request; a finished one is never reused.
  getMe: () => {
    if (!meInFlight) meInFlight = api.get('/auth/me').finally(() => { meInFlight = null; });
    return meInFlight;
  },
};
