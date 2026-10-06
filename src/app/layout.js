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
import Providers from './Providers';

/** Brand Guidelines v1.0 — Poppins only (300, 400, 500, 700). */
const portalFont = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-portal',
  display: 'swap',
});

export const metadata = {
  title: 'Quirri – Super Admin Portal',
  description: 'Super Admin workspace for institutions, content, reports, and platform health.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={portalFont.variable}>
      <body className={portalFont.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
