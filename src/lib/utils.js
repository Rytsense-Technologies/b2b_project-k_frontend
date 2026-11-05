import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format date to readable string */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value ?? ''));
}

/** What a page's not-found branch expects, for an id that cannot exist. */
export function notFoundError() {
  return Object.assign(new Error('Not found'), { response: { status: 404 } });
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).replace('Sept', 'Sep');
}

/** Format duration in minutes/seconds */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Get score color class */
export function getScoreColor(score) {
  // Score bands (design-system.md §0c): green = strong, blue = on track, orange = needs focus
  if (score >= 80) return '#46921A';
  if (score >= 60) return '#2C74E0';
  return '#F5821F';
}

/** Truncate text */
export function truncate(str, length = 80) {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/** Format currency in INR */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

import { getApiOrigin as resolveApiOrigin } from './apiConfig';

/** API origin for media/uploads (handles relative NEXT_PUBLIC_API_URL via proxy). */
export function getApiOrigin() {
  return resolveApiOrigin();
}

/** Resolve relative upload paths from the API to absolute URLs */
export function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const origin = resolveApiOrigin();
  if (!origin) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
