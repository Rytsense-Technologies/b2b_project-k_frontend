import { PRODUCTION_HOST } from './apiConfig';

/** Test server — direct WebSocket to LiveKit on :7880 */
export const PRODUCTION_LIVEKIT_WS = `ws://${PRODUCTION_HOST}:7880`;

/** Live domain — Nginx proxies /livekit/ → LiveKit server */
export const LIVE_LIVEKIT_WSS = 'wss://talenteur.co.in/livekit/';

/** Default local LiveKit (must match docker/livekit.yaml + backend .env). */
export const LOCAL_LIVEKIT_WS = 'ws://localhost:7880';

const INTERNAL_LIVEKIT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'livekit-server',
  'host.docker.internal',
]);

function isInternalLivekitHost(hostname) {
  return INTERNAL_LIVEKIT_HOSTS.has(hostname?.toLowerCase());
}

function isRewritableLivekitHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return isInternalLivekitHost(h) || h === PRODUCTION_HOST;
}

function isLocalBrowserHost() {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function parseWsUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function getLivekitUrlForCurrentOrigin() {
  if (typeof window === 'undefined') return null;

  const { hostname, protocol } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  if (hostname === PRODUCTION_HOST) {
    return PRODUCTION_LIVEKIT_WS;
  }

  if (protocol === 'https:') {
    return `wss://${hostname}/livekit/`;
  }

  return null;
}

/**
 * Browser-safe LiveKit WebSocket URL.
 *
 * Local Next (:3000) always uses local LiveKit — never the API-provided host
 * if it points at EC2/remote. Tokens are signed with local LIVEKIT_API_SECRET;
 * a remote LiveKit rejects them with "signature is invalid".
 */
export function resolveLivekitBrowserUrl(urlFromApi) {
  const override = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  if (override) return override;

  // Hard rule: local browser ↔ local LiveKit only.
  if (isLocalBrowserHost()) {
    return LOCAL_LIVEKIT_WS;
  }

  const forOrigin = getLivekitUrlForCurrentOrigin();
  if (forOrigin) return forOrigin;

  const parsed = parseWsUrl(urlFromApi);
  if (!parsed || !isRewritableLivekitHost(parsed.hostname)) {
    return urlFromApi;
  }

  if (process.env.NODE_ENV === 'production') {
    return LIVE_LIVEKIT_WSS;
  }

  const port = parsed.port || '7880';
  return `ws://${PRODUCTION_HOST}:${port}`;
}

/** @deprecated alias */
export const resolveLivekitWsUrl = resolveLivekitBrowserUrl;

/** HTTP origin for LiveKit validate / health checks (ws → http). */
export function livekitHttpOrigin(wsUrl) {
  const parsed = parseWsUrl(wsUrl || LOCAL_LIVEKIT_WS);
  if (!parsed) return 'http://localhost:7880';
  const proto = parsed.protocol === 'wss:' ? 'https:' : 'http:';
  const host = parsed.host || 'localhost:7880';
  return `${proto}//${host}`;
}

/**
 * Probe token against LiveKit before room.connect().
 * @returns {Promise<{ ok: boolean, status?: number, detail?: string }>}
 */
export async function probeLivekitToken(wsUrl, token) {
  if (!token) return { ok: false, detail: 'Missing LiveKit token.' };
  const origin = livekitHttpOrigin(wsUrl);
  const url = `${origin}/rtc/v1/validate?access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = (await res.text()).slice(0, 300);
    // 400 "join_request is required" means the signature was accepted.
    if (res.status === 400 && /join_request/i.test(text)) {
      return { ok: true, status: res.status, detail: text };
    }
    if (res.ok) return { ok: true, status: res.status, detail: text };
    return { ok: false, status: res.status, detail: text || res.statusText };
  } catch (err) {
    return {
      ok: false,
      detail: err?.message || `Could not reach LiveKit at ${origin}`,
    };
  }
}

export function formatLivekitError(err, resolvedUrl) {
  if (!err) return 'Failed to connect to LiveKit.';
  const message = typeof err === 'string' ? err : err.message || String(err);

  if (/signature is invalid|cryptographic primitive|invalid token|unauthorized|401/i.test(message)) {
    return (
      'LiveKit rejected the room token (signature mismatch). ' +
      'Backend LIVEKIT_API_KEY / LIVEKIT_API_SECRET must match docker/livekit.yaml, then restart uvicorn and the LiveKit container. ' +
      (resolvedUrl ? `Tried: ${resolvedUrl}` : '')
    );
  }

  if (/Failed to fetch|Abort handler called|Could not reach LiveKit/i.test(message)) {
    return (
      `LiveKit signaling failed. Is LiveKit running on :7880? ` +
      `Tried: ${resolvedUrl || 'unknown'}`
    );
  }

  if (/permission|NotAllowedError/i.test(message)) {
    return 'Microphone permission denied. Allow mic access and try again.';
  }

  return resolvedUrl ? `${message} (${resolvedUrl})` : message;
}
