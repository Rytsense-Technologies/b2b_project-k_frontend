/**
 * SECB-009: per-request Content-Security-Policy, built by the middleware.
 *
 * Scripts run only with this request's nonce ('strict-dynamic' lets Next's nonced loader pull its
 * own chunks); no 'unsafe-inline' and, in production, no 'unsafe-eval'. Network, image and media
 * sources are pinned to this host, the configured API / LiveKit origins and the media bucket
 * instead of any https:/wss: origin.
 *
 * Style: <style> elements need the nonce (react-hot-toast's goober reads window.__nonce__, see
 * Providers.jsx). Server-rendered style="" attributes (React inline styles, recharts, the toaster)
 * cannot carry a nonce, so only style-src-attr keeps 'unsafe-inline'; attributes cannot run script.
 */

/** host[:port] only, so a forged Host header cannot inject a directive. */
const HOST_RE = /^[a-z0-9.-]+(:\d{1,5})?$/i;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Media bucket defaults; presigned edu_video links point at this bucket (next.config images too). */
const DEFAULT_BUCKET = 'projectk-media';
const DEFAULT_REGION = 'ap-south-1';

/** Local stack the browser talks to directly when the page itself is on localhost (apiConfig, livekitUrl, eduVideo). */
const LOCAL_ORIGINS = ['http://localhost:8000', 'http://localhost:8001', 'ws://localhost:7880', 'http://localhost:7880'];

/** The origin of an absolute http(s)/ws(s) URL, or null for relative or malformed values. */
export function originOf(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return /^(https?|wss?):$/.test(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

/** Space or comma separated origins from an env value; anything that is not a bare origin is dropped. */
export function originList(value) {
  return String(value || '')
    .split(/[\s,]+/)
    .map(originOf)
    .filter(Boolean);
}

/** A ws(s) origin also needs its http(s) twin: LiveKit's token probe fetches /rtc/v1/validate over HTTP. */
function withHttpTwin(origin) {
  if (origin.startsWith('wss://')) return [origin, `https://${origin.slice(6)}`];
  if (origin.startsWith('ws://')) return [origin, `http://${origin.slice(5)}`];
  return [origin];
}

/**
 * Configured origins. NEXT_PUBLIC_* are inlined at build time; CSP_* are read by the middleware at
 * runtime, so an image built without them can still be pointed at another bucket or LiveKit host.
 */
export function configuredOrigins(env = {}) {
  const bucket = (env.NEXT_PUBLIC_AWS_S3_BUCKET || DEFAULT_BUCKET).trim();
  const region = (env.NEXT_PUBLIC_AWS_REGION || DEFAULT_REGION).trim();
  const bucketOrigins = /^[a-z0-9.-]+$/.test(bucket) && /^[a-z0-9-]+$/.test(region)
    ? [`https://${bucket}.s3.${region}.amazonaws.com`, `https://${bucket}.s3.amazonaws.com`]
    : [];
  const api = [env.NEXT_PUBLIC_API_URL, env.NEXT_PUBLIC_EDU_VIDEO_ORIGIN].map(originOf).filter(Boolean);
  const livekit = originList(env.NEXT_PUBLIC_LIVEKIT_URL).flatMap(withHttpTwin);
  return {
    connect: [...api, ...livekit, ...originList(env.CSP_CONNECT_ORIGINS).flatMap(withHttpTwin)],
    media: [...api, ...bucketOrigins, ...originList(env.CSP_MEDIA_ORIGINS)],
  };
}

/** The env the middleware passes in. Literal process.env reads, so Next keeps them in the edge bundle. */
export function cspEnv() {
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_EDU_VIDEO_ORIGIN: process.env.NEXT_PUBLIC_EDU_VIDEO_ORIGIN,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_AWS_S3_BUCKET: process.env.NEXT_PUBLIC_AWS_S3_BUCKET,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    CSP_CONNECT_ORIGINS: process.env.CSP_CONNECT_ORIGINS,
    CSP_MEDIA_ORIGINS: process.env.CSP_MEDIA_ORIGINS,
  };
}

/** 16 random bytes, base64: a fresh nonce per request (Web Crypto, so it runs in the edge runtime). */
export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const uniq = (list) => [...new Set(list)];

/**
 * @param {object} o
 * @param {string} o.nonce   this request's nonce
 * @param {string} [o.host]  host[:port] the browser used (Host / X-Forwarded-Host)
 * @param {boolean} [o.dev]  next dev: eval for React refresh, inline <style> for CSS hot reload
 * @param {object} [o.env]   see cspEnv()
 */
export function buildCsp({ nonce, host = '', dev = false, env = {} }) {
  const safeHost = HOST_RE.test(host) ? host.toLowerCase() : '';
  const hostname = safeHost.replace(/:\d+$/, '');
  const local = LOOPBACK.has(hostname);
  const { connect, media } = configuredOrigins(env);

  // 'self' covers same-host ws(s) in CSP3, but older engines need the scheme spelled out.
  const sameHostSockets = safeHost ? [`wss://${safeHost}`, ...(local || dev ? [`ws://${safeHost}`] : [])] : [];
  const localStack = local ? LOCAL_ORIGINS : [];

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    // Dev injects CSS as nonce-less <style> tags; a nonce in the list would switch 'unsafe-inline' off.
    'style-src': dev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': uniq(["'self'", 'data:', 'blob:', ...media.filter((o) => o.startsWith('http')), ...localStack.filter((o) => o.startsWith('http'))]),
    'font-src': ["'self'", 'data:'],
    'media-src': uniq(["'self'", 'blob:', ...media.filter((o) => o.startsWith('http')), ...localStack.filter((o) => o.startsWith('http'))]),
    'connect-src': uniq(["'self'", ...sameHostSockets, ...connect, ...localStack]),
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}
