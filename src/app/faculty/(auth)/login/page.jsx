'use client';

import PortalLoginPage from '@/components/auth/PortalLoginPage';
import { ROLES } from '@/lib/permissions';

export default function FacultyLoginPage() {
  return (
    <PortalLoginPage
      expectedRole={ROLES.FACULTY}
      homePath="/faculty/dashboard"
      lockoutKey="pk_faculty_login_lockout"
      footCopy="Access is by invitation from your College Admin."
      bypassUser={{
        id: 'dev-faculty',
        name: 'Faculty User',
        email: 'faculty@quirri.ai',
        first_name: 'Faculty',
        last_name: 'User',
        college_name: 'Demo College',
        department: 'Computer Science',
        tenant_id: 'dev-college',
      }}
    />
  );
}
