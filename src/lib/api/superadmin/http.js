import api from '@/lib/axios';

export function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

export function buildParams(obj = {}) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

export async function downloadBlob(request, fallbackName) {
  const res = await request();
  const blob = new Blob([res.data]);
  const disposition = res.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * HTTP 429 body `{ detail, retry_after }` plus the Retry-After header.
 * Same shape for login, MCQ, voice Q&A, and the rest of the app.
 */
export function rateLimitInfo(err) {
  const status = err?.response?.status ?? err?.status;
  if (status !== 429) return null;
  const data = err?.response?.data || err?.data || {};
  const header = Number.parseInt(
    err?.response?.headers?.['retry-after'] || err?.response?.headers?.['Retry-After'] || '',
    10,
  );
  const n = Number(data.retry_after) || (Number.isFinite(header) && header > 0 ? header : 0);
  const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
  return {
    retryAfter: Math.max(0, n),
    message: detail || (n > 0
      ? `Too many requests. Please wait ${n} second(s) and try again.`
      : 'Too many requests. Please wait a moment and try again.'),
  };
}

export function asList(data, fallback = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.videos)) return data.videos;
  return fallback;
}

/** FastAPI `{ detail: "..." }` or validation array → human message */
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
  }
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d?.msg || d?.message))
      .filter(Boolean)
      .join('; ') || fallback;
  }
  const raw = err?.response?.data;
  if (
    typeof raw === 'string' && raw.trim() && raw.trim().length < 300
    && raw.trim() !== 'Internal Server Error' && !raw.trim().startsWith('<')
  ) {
    return raw.trim();
  }
  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || (err?.request && !err?.response)) {
    return "Can't connect right now. Check your internet connection and try again.";
  }
  if (err?.code === 'ECONNABORTED') {
    return 'This is taking longer than expected. Please try again.';
  }
  const status = err?.response?.status;
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return "You don't have access to do this.";
  if (status === 404) return fallback !== 'Something went wrong' ? fallback : "We couldn't find that. It may have been removed.";
  if (status === 429) {
    const limited = rateLimitInfo(err);
    return limited?.message || 'Too many requests. Please wait a moment and try again.';
  }
  // Axios' own messages ("Request failed with status code …") are not for people.
  if (err?.message && !/status code|network error|timeout of/i.test(err.message) && !err?.isAxiosError) {
    return err.message;
  }
  return fallback;
}

/**
 * Missing route / not implemented / briefly down — not a crash.
 * Interview routers are unmounted while INTERVIEWS_ENABLED=false (404 = feature off).
 */
export function isApiUnavailable(err) {
  const status = err?.response?.status;
  return status === 404 || status === 501 || status === 503;
}

/**
 * Like unwrap+request, but returns `null` when the epic API is not live yet
 * (including interview paths that 404 while the module is off).
 * Real failures (auth, 500, network) still throw.
 */
export async function fetchOptional(request) {
  try {
    return unwrap(await request());
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    throw err;
  }
}

export { api };
