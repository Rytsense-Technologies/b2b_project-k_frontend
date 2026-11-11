import { headers } from 'next/headers';
import { Poppins } from 'next/font/google';
import './globals.css';
import '../styles/quirri-design.css';
// Shared module-page kit for every portal (design-system.md §4b).
import '../styles/student-portal.css';
import '../styles/superadmin-universities.css';
import '../styles/superadmin-colleges.css';
import '../styles/portal-modules.css';
import '../styles/portal-superadmin.css';
import '../styles/portal-admin.css';
import '../styles/portal-faculty.css';
// Dual-tone accent layer (teal structure + Amber 700 accents) — must stay last.
import '../styles/quirri-accents.css';
import '../styles/data-viz.css';
import '../styles/module-analytics.css';
import '../styles/portal-b2c.css';
import Providers from './Providers';

/** Brand Guidelines v1.0 — Poppins only (400, 500, 700). */
const portalFont = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-portal',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'Quirri',
    template: '%s · Quirri',
  },
  description: 'Quirri workspace for institutions, learning, and platform operations.',
};

/**
 * SECB-009: reading the request makes every page render per request, which a nonce-based CSP needs
 * (a prerendered page would carry no nonce). The middleware sets x-nonce.
 */
export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <html lang="en" className={portalFont.variable}>
      <body className={portalFont.className}>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
