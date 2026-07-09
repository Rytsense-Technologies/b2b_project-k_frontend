/** Backend plan_id → plan_type (Swagger) */
export const PLAN_ID_BY_TYPE = {
  standard: 1,
  premium: 2,
};

const PLAN_COPY = {
  standard: {
    description: 'Perfect to get started with guided mock practice at a job seeker-friendly price.',
    badge: null,
  },
  premium: {
    description: 'Best value for serious preparation with more attempts, deeper analysis, and job support.',
    badge: 'Most Popular',
  },
};

function formatInr(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '₹ —';
  return `₹ ${n.toLocaleString('en-IN')}`;
}

function billingPeriodLabel(cycle) {
  if (!cycle) return '/ month';
  const c = String(cycle).toLowerCase();
  if (c === 'monthly') return '/ month';
  if (c === 'yearly' || c === 'annual') return '/ year';
  return `/ ${c}`;
}

/**
 * Normalize API plan row for pricing UI.
 * @param {object} plan
 */
export function normalizePlan(plan) {
  if (!plan) return null;
  const planType = (plan.plan_type || plan.type || '').toLowerCase()
    || (plan.id === 1 ? 'standard' : plan.id === 2 ? 'premium' : `plan-${plan.id}`);
  const copy = PLAN_COPY[planType] || { description: '', badge: null };

  return {
    apiId: plan.id,
    id: planType,
    name: plan.name || planType,
    price: Number(plan.price) || 0,
    priceLabel: formatInr(plan.price),
    period: billingPeriodLabel(plan.billing_cycle),
    currency: plan.currency || 'INR',
    description: plan.description || copy.description,
    features: Array.isArray(plan.features) ? plan.features : [],
    badge: copy.badge,
    isActive: plan.is_active !== false,
  };
}

/** @param {object[]} plans */
export function normalizePlansList(plans = []) {
  return plans
    .map(normalizePlan)
    .filter((p) => p && p.isActive);
}

/** Resolve numeric plan_id for POST /plans/select */
export function resolveApiPlanId(planType, plans = []) {
  const normalized = normalizePlansList(plans);
  const match = normalized.find((p) => p.id === planType);
  if (match?.apiId != null) return match.apiId;
  return PLAN_ID_BY_TYPE[planType] ?? null;
}

/** Map GET /plans/my-plan response → Redux plan slug */
export function planTypeFromMyPlanResponse(data) {
  const plan = data?.plan;
  if (!plan) return null;
  if (plan.plan_type) return String(plan.plan_type).toLowerCase();
  if (plan.id === 1) return 'standard';
  if (plan.id === 2) return 'premium';
  return null;
}
