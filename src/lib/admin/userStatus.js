/**
 * Account state of a user row from GET /users. The server's `status` is the
 * source of truth (active | pending_activation | deactivated); a pending
 * invite is is_active=false too, so is_active alone cannot tell it apart from
 * a deactivated account - is_verified does (never activated = pending).
 */
export function accountState(user) {
  const s = String(user?.status || '').toLowerCase();
  if (s.includes('pending')) return 'pending';
  if (s.includes('deactiv') || s === 'inactive') return 'deactivated';
  if (s === 'active') return 'active';
  if (user?.is_active === false) return user?.is_verified === false ? 'pending' : 'deactivated';
  if (user?.is_verified === false) return 'pending';
  return 'active';
}

export const isPending = (user) => accountState(user) === 'pending';
export const isDeactivated = (user) => accountState(user) === 'deactivated';

/** Traffic-light key used by the College Admin tables (red / amber / green). */
export function statusVariant(user) {
  return { active: 'green', pending: 'amber', deactivated: 'red' }[accountState(user)];
}

export function userStatusLabel(user) {
  return { active: 'Active', pending: 'Pending activation', deactivated: 'Deactivated' }[accountState(user)];
}
