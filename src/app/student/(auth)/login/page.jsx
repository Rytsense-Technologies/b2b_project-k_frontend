'use client';

import PortalLoginPage from '@/components/auth/PortalLoginPage';
import { ROLES } from '@/lib/permissions';

export default function StudentLoginPage() {
  return (
    <PortalLoginPage
      expectedRole={ROLES.STUDENT}
      homePath="/student/home"
      lockoutKey="pk_student_login_lockout"
      footCopy="Access is by invitation from your College Admin."
      bypassUser={{
        id: 'dev-student',
        name: 'Student User',
        email: 'student@quirri.ai',
        first_name: 'Student',
        last_name: 'User',
        college_name: 'Demo College',
        department: 'Computer Science',
        tenant_id: 'dev-college',
      }}
    />
  );
}
