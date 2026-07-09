const STORAGE_KEY = 'pk_profile_photo';

/** Session-only profile photo preview (data URL) — until CDN/static URLs are wired. */
export function getProfilePhotoFromSession() {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setProfilePhotoInSession(dataUrl) {
  if (typeof window === 'undefined' || !dataUrl) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, dataUrl);
  } catch {
    /* quota — ignore */
  }
}

export function syncPkUserAvatar(avatarUrl) {
  if (typeof window === 'undefined' || !avatarUrl) return;
  try {
    const raw = sessionStorage.getItem('pk_user');
    if (!raw) return;
    const u = JSON.parse(raw);
    sessionStorage.setItem('pk_user', JSON.stringify({ ...u, avatar_url: avatarUrl }));
  } catch {
    /* ignore */
  }
}
