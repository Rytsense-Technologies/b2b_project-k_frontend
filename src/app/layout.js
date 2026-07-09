import './globals.css';
import Providers from './Providers';

export const metadata = {
  title: 'Project K – AI Interview Module',
  description: 'AI-powered mock interview coaching for students and freshers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
