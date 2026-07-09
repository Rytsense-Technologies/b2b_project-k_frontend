import { redirect } from 'next/navigation';

export default function TenantDetailRedirect() {
  redirect('/superadmin/colleges');
}
