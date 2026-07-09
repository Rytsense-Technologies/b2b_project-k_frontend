const RECENT_ROLES_STORAGE_KEY = 'pk_recent_target_roles_v1';
const MAX_RECENT_ROLES = 10;

export const DEFAULT_POPULAR_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Data Scientist',
  'AI Engineer',
  'Customer Support',
  'Marketing Executive',
];

function normalizeRole(role) {
  return String(role ?? '').trim().replace(/\s+/g, ' ');
}

export function getRecentRoles() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_ROLES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveRecentRole(role) {
  const trimmed = normalizeRole(role);
  if (!trimmed || typeof window === 'undefined') return;

  const existing = getRecentRoles();
  const next = [
    trimmed,
    ...existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT_ROLES);

  localStorage.setItem(RECENT_ROLES_STORAGE_KEY, JSON.stringify(next));
}

/** Unique roles for chips and autocomplete: recent first, then defaults. */
export function getRoleSuggestions() {
  const recent = getRecentRoles();
  const recentLower = new Set(recent.map((r) => r.toLowerCase()));
  const defaults = DEFAULT_POPULAR_ROLES.filter((r) => !recentLower.has(r.toLowerCase()));
  return { recent, popular: defaults, all: [...recent, ...defaults] };
}

export function filterRoleSuggestions(query, suggestions = []) {
  const q = normalizeRole(query).toLowerCase();
  if (!q) return suggestions;
  return suggestions.filter((role) => role.toLowerCase().includes(q));
}