/** India display formats for the Super Admin pages (design-system.md §5). */

/** "+918939737559" / "8939737559" -> "+91 89397 37559". Anything else is returned trimmed. */
export function formatIndianPhone(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, '');
  let local = null;
  if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) local = digits.slice(1);
  else if (digits.length === 10) local = digits;
  if (!local) return raw;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** ISO timestamp -> "14 Oct 2026, 5:12 pm" (en-IN). Returns `fallback` when empty or invalid. */
export function formatDateTime(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace('Sept', 'Sep');
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${date}, ${time}`;
}

/** 12507 -> "12,507" (Indian grouping). Non-numbers pass through. */
export function formatCount(value) {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : String(value);
}

/**
 * Option labels for a list of colleges: a name that appears more than once gets its
 * code (or city) appended, and inactive ones are marked.
 */
export function collegeOptionLabel(college, all = []) {
  if (!college) return '';
  const name = college.name || '—';
  const dup = all.filter((c) => (c.name || '').trim().toLowerCase() === name.trim().toLowerCase()).length > 1;
  const tag = dup ? (college.code || college.city || null) : null;
  const off = college.is_active === false ? ' — inactive' : '';
  return `${name}${tag ? ` (${tag})` : ''}${off}`;
}

/** Watch minutes -> "45 min" / "12 h 05 min" / "1,240 h" (Indian grouping). */
export function formatMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n < 60) return `${Math.round(n)} min`;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h >= 100 || !m) return `${formatCount(h)} h`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

/** ISO date -> "14 Oct 2026" (en-IN). */
export function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  // en-IN spells September "Sept"; the design system uses three-letter months.
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace('Sept', 'Sep');
}

/** 48.5 -> "48.5%" (en-IN, one decimal at most). */
export function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
}
