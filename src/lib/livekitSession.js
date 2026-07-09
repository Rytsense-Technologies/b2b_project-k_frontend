import { resolveLivekitBrowserUrl } from './livekitUrl';

const STORAGE_KEY = 'pk_livekit_session';

/** @typedef {{ sessionId: string, token: string, url: string, apiUrl?: string, room?: string, position?: string, persona?: object, mode?: 'mock' | 'full' }} LivekitSession */

function normalizeLivekitSession(session) {
  if (!session?.url || !session?.token || !session?.sessionId) return null;
  const apiUrl = session.apiUrl ?? session.url;
  return {
    ...session,
    apiUrl,
    url: resolveLivekitBrowserUrl(apiUrl),
  };
}

export function persistLivekitSession(session) {
  if (typeof window === 'undefined' || !session) return;
  const normalized = normalizeLivekitSession(session);
  if (!normalized) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota errors */
  }
}

/** @returns {LivekitSession | null} */
export function readLivekitSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeLivekitSession(parsed);
  } catch {
    return null;
  }
}

export function clearLivekitSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
