import { redirect } from 'next/navigation';

/** Legacy Skill Courses route — feature removed from Phase 1 Super Admin. */
export default function SkillsRedirectPage() {
  redirect('/superadmin/dashboard');
}
