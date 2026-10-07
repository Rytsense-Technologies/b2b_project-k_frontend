import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/leaderboard */
export const leaderboardApi = {
  get: async ({ limit = 50 } = {}) => {
    const res = await api.get(`/leaderboard?limit=${limit}`);
    return unwrap(res);
  },
};
