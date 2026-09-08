import { Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import './globals.css';
import '../styles/quirri-design.css';
import Providers from './Providers';

/** Portal chrome (sidebar + all post-login UI) — matches new_updated_design_four */
const portalFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-portal',
  display: 'swap',
});

/** Auth login cards only */
const authFont = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-login',
  display: 'swap',
});

export const metadata = {
  title: 'Quirri – Super Admin Portal',
  description: 'Super Admin workspace for institutions, content, reports, and platform health.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${portalFont.variable} ${authFont.variable}`}>
      <body className={portalFont.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
