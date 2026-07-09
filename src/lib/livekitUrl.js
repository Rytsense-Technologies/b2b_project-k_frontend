import { PRODUCTION_HOST } from './apiConfig';

/** Test server — direct WebSocket to LiveKit on :7880 */
export const PRODUCTION_LIVEKIT_WS = `ws://${PRODUCTION_HOST}:7880`;

/** Live domain — Nginx proxies /livekit/ → LiveKit server */
export const LIVE_LIVEKIT_WSS = 'wss://talenteur.co.in/livekit/';

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
 * Browser-safe LiveKit WebSocket URL (logic from pre-avatar working build).
 */
export function resolveLivekitBrowserUrl(urlFromApi) {
  const override = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  if (override) return override;

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

export function formatLivekitError(err, resolvedUrl) {
  if (!err) return 'Failed to connect to LiveKit.';
  const message = err.message || String(err);

  if (/Failed to fetch|Abort handler called/i.test(message)) {
    return (
      `LiveKit signaling failed. Use wss://your-domain/livekit/ on HTTPS. ` +
      `Tried: ${resolvedUrl || 'unknown'}`
    );
  }

  if (/permission|NotAllowedError/i.test(message)) {
    return 'Microphone permission denied. Allow mic access and try again.';
  }

  return resolvedUrl ? `${message} (${resolvedUrl})` : message;
}
