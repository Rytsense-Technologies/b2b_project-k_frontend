import { redirect } from 'next/navigation';

/** All roles sign in at /auth/login */
export default function SuperAdminLoginRedirect() {
  redirect('/auth/login');
}
