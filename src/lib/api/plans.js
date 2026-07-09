import api from '@/lib/axios';

export const plansApi = {
  /** GET /plans/ — list active subscription plans */
  getPlans: () => api.get('/plans/'),
  /** POST /plans/select — save selected plan to user account */
  selectPlan: (planId) => api.post('/plans/select', { plan_id: planId }),
  /** GET /plans/my-plan — logged-in user's active plan (or null) */
  getMyPlan: () => api.get('/plans/my-plan'),
};
