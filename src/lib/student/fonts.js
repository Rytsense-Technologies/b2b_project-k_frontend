import { DM_Sans } from 'next/font/google';

/** Student portal type (quirri-b2c-student-ui skill): DM Sans, exposed as --font-student. */
export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-student',
});
