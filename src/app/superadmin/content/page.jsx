import { redirect } from 'next/navigation';

/** Upload & Generate removed from Super Admin nav — keep route as soft redirect. */
export default function ContentRedirectPage() {
  redirect('/superadmin/reports');
}
