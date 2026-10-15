/**
 * Platform health signals, shared by the Health page banner and the dashboard's
 * "Attention needed" list. Everything is derived from GET /api/v1/health - green
 * only when every service is up and the error rate is normal.
 */
import { formatCount } from './format';

/** Uptime below this needs a look; below UPTIME_BAD it is an outage. */
export const UPTIME_OK = 99.5;
export const UPTIME_BAD = 95;
/** More server errors than this in 24 hours is not a normal day. */
export const ERRORS_24H_NORMAL = 50;

/** green | amber | red | muted ("not set up yet" is not an outage). */
export function serviceTone(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('operational') || value.includes('ok') || value.includes('healthy')) return 'green';
  if (value.includes('degraded') || value.includes('warn')) return 'amber';
  if (/log.?only|not.?instrument|not.?configured|disabled|n\/a|pending/.test(value)) return 'muted';
  return 'red';
}

export function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[%,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Plain integers of 4+ digits inside API text -> Indian grouping ("12507" -> "12,507"). */
export function groupNumbers(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(^|[^\d.,])(\d{4,})(?![\d.,]*\d)/g, (_, pre, n) => `${pre}${formatCount(n)}`);
}

function list(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

/** Uptime %, server errors in 24h and failed video jobs in 24h; tolerant of older / newer API shapes. */
export function readHealthSignals(statusData) {
  const metrics = list(statusData?.metrics);
  const find = (re) => metrics.find((m) => re.test(String(m.title || m.k || '')));
  const uptimeMetric = find(/uptime/i);
  const failedMetric = find(/failed/i);
  const uptime = toNumber(statusData?.uptime_30d ?? statusData?.uptime ?? uptimeMetric?.value);
  let errors24h = toNumber(statusData?.errors_24h ?? statusData?.error_count_24h ?? statusData?.errors?.last_24h);
  if (errors24h == null) {
    const m = String(failedMetric?.trend || '').match(/([\d,]+)\s+server errors?/i);
    if (m) errors24h = toNumber(m[1]);
  }
  const failedJobs = toNumber(statusData?.failed_jobs_24h ?? failedMetric?.value);
  return { uptime, errors24h, failedJobs };
}

/**
 * { level: green|amber|red, title, reason, items } - `items` are the individual
 * problems (for attention lists), each with a plain title and a link.
 */
export function overallHealth(statusData) {
  const services = list(statusData?.services);
  const signals = readHealthSignals(statusData);
  const items = [];
  let level = 'green';
  const raise = (to) => {
    if (to === 'red' || (to === 'amber' && level === 'green')) level = to;
  };
  services.forEach((svc) => {
    const tone = serviceTone(svc.status);
    const name = svc.name || svc.service;
    if (tone === 'red' || tone === 'amber') {
      raise(tone);
      items.push({
        id: `svc-${name}`,
        title: `${name} is ${tone === 'red' ? 'down' : 'degraded'}`,
        body: groupNumbers(svc.note) || null,
        tone: tone === 'red' ? 'error' : 'warning',
        href: '/superadmin/health',
      });
    }
  });
  if (signals.uptime != null && signals.uptime < UPTIME_OK) {
    raise(signals.uptime < UPTIME_BAD ? 'red' : 'amber');
    items.push({
      id: 'uptime',
      title: `Uptime is ${signals.uptime}% over 30 days`,
      tone: signals.uptime < UPTIME_BAD ? 'error' : 'warning',
      href: '/superadmin/health',
    });
  }
  if (signals.errors24h != null && signals.errors24h > ERRORS_24H_NORMAL) {
    raise('amber');
    items.push({
      id: 'errors',
      title: `${formatCount(signals.errors24h)} server errors in the last 24 hours`,
      tone: 'warning',
      href: '/superadmin/health',
    });
  }
  if (signals.failedJobs) {
    raise('amber');
    items.push({
      id: 'failed-jobs',
      title: `${formatCount(signals.failedJobs)} video ${signals.failedJobs === 1 ? 'job' : 'jobs'} failed in 24 hours`,
      tone: 'warning',
      href: '/superadmin/content',
    });
  }
  const reason = items.length
    ? items.map((i) => i.title).join(' · ')
    : null;
  let title = 'All services operational';
  if (level === 'red') title = 'Platform has a problem';
  else if (level === 'amber') title = 'Some services need attention';
  return { level, title, reason, items, signals };
}
