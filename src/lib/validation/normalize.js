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

/**
 * Display an Indian mobile as "+91 89397 37644" (other country codes stay "+<digits>").
 * Spaces are display-only; normalizePhone strips them before saving.
 */
export function formatIndianPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const indian = !raw.startsWith('+') || digits.startsWith('91');
  if (!indian) return `+${digits}`;
  const local = (raw.startsWith('+') || digits.length > 10 ? digits.replace(/^91/, '') : digits).slice(0, 10);
  if (!local) return '+91';
  return `+91 ${local.slice(0, 5)}${local.length > 5 ? ` ${local.slice(5)}` : ''}`;
}

export function normalizeCode(value) {
  return trimValue(value).toUpperCase().replace(/\s+/g, '');
}

export function normalizeSearch(value) {
  return collapseSpaces(value);
}
