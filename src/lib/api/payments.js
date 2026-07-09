import api from '@/lib/axios';

import { plansApi } from '@/lib/api/plans';

export const paymentsApi = {
  getPlans: () => plansApi.getPlans(),
  validateCoupon: (code, planId) => api.post('/coupons/validate', { code, plan_id: planId }),
  createOrder: (planId, couponCode) =>
    api.post('/payments/create-order', { plan_id: planId, coupon_code: couponCode }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  activateSubscription: (data) => api.post('/subscriptions/activate', data),
  getSubscription: () => api.get('/subscriptions/me'),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
};
