/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// Live (talenteur.co.in): same-origin via Nginx. Test server uses apiConfig.js runtime override for :8000.
const PRODUCTION_API_URL = '/api/v1';

const apiProxyTarget = (process.env.API_PROXY_TARGET || '').replace(/\/$/, '');

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || (isProd ? PRODUCTION_API_URL : ''),
  },
  images: {
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
      {
        protocol: 'http',
        hostname: '13.234.197.68',
        port: '8000',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
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
    ];
  },
};

module.exports = nextConfig;
