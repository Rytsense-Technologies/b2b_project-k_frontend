/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// Same origin behind Nginx in production.
const PRODUCTION_API_URL = '/api/v1';

const apiProxyTarget = (process.env.API_PROXY_TARGET || '').replace(/\/$/, '');

// SECB-009: the Content-Security-Policy is per request (nonce) and set by src/middleware.js,
// built in src/lib/security/csp.js. These headers are the same on every response.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  // Microphone is the voice tutor.
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  // No popup/OAuth flow needs a cross-origin opener (SECB-003).
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // SECB-010: no other site may embed these responses. COEP stays off: it would block the
  // cross-origin S3 media the players load.
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig = {
  poweredByHeader: false,
  // CI lints as its own gate; a lint rule must not abort an image build that already passed it.
  eslint: { ignoreDuringBuilds: true },
  // `npm run preview` builds into .next-preview so it never clashes with `npm run dev` (.next).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Dev speed (owner, 26 Oct 2026): StrictMode double-runs every effect in dev, doubling API calls
  // on each page switch. Production is unaffected either way.
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || (isProd ? PRODUCTION_API_URL : ''),
  },
  images: {
    // SECA-003: no page needs /_next/image; with this set Next answers it with 404, which removes
    // the optimiser's unpatched 14.x RCE/DoS advisories from the attack surface.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'projectk-media.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // Redirect before render: a page-level redirect() here trips React #310 inside the App Router
  // on WebKit when reached by client navigation (XB-012). The page keeps its redirect as a fallback.
  async redirects() {
    return [{ source: '/admin/structure', destination: '/admin/structure/departments', permanent: false }];
  },
  // Optional: set API_PROXY_TARGET for same-origin /api/v1 proxy on :3000.
  // LiveKit: Nginx proxies /livekit/ directly to :7880 (Option B) — no Next.js rewrite.
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
      // edu_video is mounted outside /api/v1 on FastAPI
      {
        source: '/edu_video/:path*',
        destination: `${apiProxyTarget}/edu_video/:path*`,
      },
      // Voice Q&A is mounted at /voice_qna (not under /api/v1).
      {
        source: '/voice_qna/:path*',
        destination: `${apiProxyTarget}/voice_qna/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
