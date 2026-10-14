import { clearTokens } from './tokens';

/**
 * One place for "the session is gone" (FRONTEND_CHANGES.md §8): any 401 that
 * survives a refresh attempt — from /api/v1, /edu_video or /voice_qna —
 * clears local state and sends the user to login instead of leaving pages
 * showing empty lists. Guarded so parallel failing requests redirect once.
 */
let redirecting = false;

export function handleSessionExpired() {
  if (typeof window === 'undefined' || redirecting) return;
  if (window.location.pathname.startsWith('/auth/')) return;
  redirecting = true;
  try { clearTokens(); } catch { /* ignore */ }
  try {
    window.sessionStorage.removeItem('pk_user');
    window.localStorage.removeItem('voiceQnaToken');
  } catch { /* private mode */ }
  window.location.href = '/auth/login';
}
