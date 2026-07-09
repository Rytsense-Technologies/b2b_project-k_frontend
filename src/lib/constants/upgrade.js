/** Where the user opened Upgrade Plan from — used for post-checkout redirect */
export const UPGRADE_FROM = {
  jobs: 'jobs',
  dashboard: 'dashboard',
  report: 'report',
};

/**
 * Build /main/upgrade URL with optional plan preselect and return context.
 * @param {{ from?: string, plan?: 'standard' | 'premium', reportId?: string }} opts
 */
export function getUpgradeHref({ from, plan, reportId } = {}) {
  const params = new URLSearchParams();
  if (plan === 'standard' || plan === 'premium') params.set('plan', plan);
  if (from) params.set('from', from);
  if (reportId) params.set('reportId', reportId);
  const query = params.toString();
  return `/main/upgrade${query ? `?${query}` : ''}`;
}

/**
 * Resolve redirect after plan change on Upgrade Plan page.
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 */
export function getPostUpgradeRedirect(searchParams) {
  const from = searchParams.get('from');
  const reportId = searchParams.get('reportId');

  if (from === UPGRADE_FROM.jobs) return '/main/jobs';
  if (from === UPGRADE_FROM.dashboard) return '/main/dashboard';
  if (from === UPGRADE_FROM.report) {
    return reportId ? `/main/reports/${reportId}` : '/main/reports';
  }

  return '/main/dashboard';
}
