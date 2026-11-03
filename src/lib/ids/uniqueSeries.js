/**
 * Unique ID series for create forms.
 * The form shows a preview (UNI-0002). Create payloads omit `code` so the API
 * assigns the real ID. Always display `code` from the response, never the preview.
 *
 * Lesson "code chip" on video slides is content, not an identity ID.
 * Students and staff have no ID field — email is their unique login.
 */

export const CODE_SERIES = {
  university: { prefix: 'UNI', width: 4, label: 'University ID' },
  college: { prefix: 'COL', width: 4, label: 'College ID' },
  department: { prefix: 'DEP', width: 4, label: 'Department ID' },
  programme: { prefix: 'PRG', width: 4, label: 'Programme ID' },
  subject: { prefix: 'SUB', width: 4, label: 'Subject ID' },
};

export const ASSIGNED_CODE_HINT = 'Assigned automatically. The saved ID is confirmed when you create.';
export const ASSIGNED_CODE_LOCKED_HINT = 'Assigned automatically. This cannot be changed.';

export function codesOf(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => row?.code).filter(Boolean);
}

function asItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

/** Walk paginated list APIs (max page size 100) so the next number is not taken. */
export async function listAllItems(fetchPage, { pageSize = 100, maxPages = 50 } = {}) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await fetchPage(page, pageSize);
    const rows = asItems(data);
    items.push(...rows);
    const total = data?.total;
    if (typeof total === 'number' && items.length >= total) break;
    if (rows.length < pageSize) break;
  }
  return items;
}

export function nextSeriesCode(prefix, existing = [], { width = 4 } = {}) {
  const used = new Set(
    (existing || []).map((code) => String(code || '').trim().toUpperCase()).filter(Boolean),
  );
  const escaped = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}-(\\d+)$`, 'i');
  let max = 0;
  used.forEach((code) => {
    const match = code.match(re);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  let n = max;
  let candidate;
  do {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(width, '0')}`;
  } while (used.has(candidate));
  return candidate;
}

export function nextCodeFor(kind, existing = []) {
  const series = CODE_SERIES[kind];
  if (!series) throw new Error(`Unknown ID series "${kind}"`);
  return nextSeriesCode(series.prefix, existing, { width: series.width });
}

export async function nextCodeFromList(kind, fetchPage) {
  const items = await listAllItems(fetchPage);
  return nextCodeFor(kind, codesOf(items));
}

/**
 * Duplicate series codes are no longer 409 — the API issues the next number.
 * This 409 is only the rare unique-index retry exhaustion on university / college.
 * College create still 409s on duplicate admin email (not this helper).
 */
export function isAllocateExhausted(err) {
  if (err?.response?.status !== 409) return false;
  const detail = err?.response?.data?.detail;
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail || '');
  return /could not allocate a unique (university|college) id/i.test(text);
}

/** Create without sending `code`; retry once if allocation exhausted. */
export async function createOmittingCode(run) {
  try {
    return await run();
  } catch (err) {
    if (!isAllocateExhausted(err)) throw err;
    return run();
  }
}
