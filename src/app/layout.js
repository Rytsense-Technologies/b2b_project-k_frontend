import './globals.css';
import Providers from './Providers';

export const metadata = {
  title: 'Quirri – Super Admin Portal',
  description: 'Super Admin workspace for colleges, departments, skill courses, and platform management.',
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
