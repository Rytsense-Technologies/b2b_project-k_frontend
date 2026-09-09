import { redirect } from 'next/navigation';

/** Unified sign-in — all roles use /auth/login. */
export default function StudentLoginRedirect() {
  redirect('/auth/login');
}
