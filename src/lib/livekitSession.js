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

/* ---- Waiting room → interview room lifecycle (Interview flow guide) ---- */
const FRESH_KEY = 'pk_livekit_fresh_start';
const LIVE_KEY = 'pk_livekit_reached_live';

function store(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch { /* ignore */ }
}
function read(key) {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}

/** Set by the setup page right before navigating to the live page. */
export function markFreshStart(sessionId) { store(FRESH_KEY, sessionId); store(LIVE_KEY, null); }

/** Read once on the live page: true on first entry, false after a refresh. */
export function consumeFreshStart(sessionId) {
  const fresh = read(FRESH_KEY) === String(sessionId);
  store(FRESH_KEY, null);
  return fresh;
}

/** Latched when the candidate enters the interview room — credit is spent from here on. */
export function markReachedLive(sessionId) { store(LIVE_KEY, sessionId); }
export function hasReachedLive(sessionId) { return read(LIVE_KEY) === String(sessionId); }

export function clearLivekitLifecycle() { store(FRESH_KEY, null); store(LIVE_KEY, null); }
