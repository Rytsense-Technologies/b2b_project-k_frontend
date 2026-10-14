import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/** Live: /api/v1/leaderboard */
export const leaderboardApi = {
  /**
   * GET /leaderboard — cohort ranking (SOW §6.4.4). `jobId` ranks one chapter
   * assessment. Response adds `me` (own position even outside the top N),
   * cohort_size, participants, class_avg, top_score, updated_at, assessments.
   */
  get: async ({ limit = 50, jobId } = {}) => {
    const res = await api.get('/leaderboard', { params: { limit, job_id: jobId || undefined } });
    return unwrap(res);
  },
};
