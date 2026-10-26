import { redirect } from 'next/navigation';

/**
 * Academic structure has one live level today (Departments). Keep the old URL working and
 * land on the departments list. When Programmes / Semesters / Subjects ship, this becomes
 * the structure overview (docs/ux/ux-architecture.md section 4).
 */
export default function AcademicStructurePage() {
  redirect('/admin/structure/departments');
}
