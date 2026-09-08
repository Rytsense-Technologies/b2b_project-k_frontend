/**
 * Shared string normalization for form fields.
 * Keep UI and Zod schemas aligned — normalize before validate/submit.
 */

export function trimValue(value) {
  return String(value ?? '').trim();
}

export function collapseSpaces(value) {
  return trimValue(value).replace(/\s+/g, ' ');
}

export function normalizeEmail(value) {
  return trimValue(value).toLowerCase();
}

/** Keep leading + and digits only. */
export function normalizePhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function normalizeCode(value) {
  return trimValue(value).toUpperCase().replace(/\s+/g, '');
}

export function normalizeSearch(value) {
  return collapseSpaces(value);
}
