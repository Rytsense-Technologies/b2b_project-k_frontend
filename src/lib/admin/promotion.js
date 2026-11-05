/**
 * Yearly rollover (POST /users/bulk-promote-year). A college already promoted this academic year
 * needs an explicit repeat confirmation: the preview says so (already_promoted_this_year), and an
 * older API answers 409 instead.
 */
export function promotionBody({ dryRun = true, repeatConfirmed = false, tenantId } = {}) {
  return {
    dry_run: dryRun,
    ...(repeatConfirmed ? { repeat_confirmed: true } : {}),
    ...(tenantId ? { tenant_id: tenantId } : {}),
  };
}

export function isAlreadyPromoted({ preview, error } = {}) {
  if (preview?.already_promoted_this_year) return true;
  return error?.response?.status === 409;
}
