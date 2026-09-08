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

export function asList(data, fallback = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  return fallback;
}

/** FastAPI `{ detail: "..." }` or validation array → human message */
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => (typeof d === 'string' ? d : d?.msg || d?.message))
      .filter(Boolean)
      .join('; ') || fallback;
  }
  if (err?.message && err.message !== 'Network Error') return err.message;
  return fallback;
}

/** EPIC shells: treat missing routes as unavailable, not a hard crash. */
export function isApiUnavailable(err) {
  const status = err?.response?.status;
  return status === 404 || status === 501 || status === 503;
}

/**
 * Like unwrap+request, but returns `null` when the epic API is not live yet.
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
