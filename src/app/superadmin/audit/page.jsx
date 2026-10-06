import { redirect } from 'next/navigation';

/** Audit Logs module removed from Super Admin — keep route for old bookmarks. */
export default function AuditPageRedirect() {
  redirect('/superadmin/dashboard');
}
