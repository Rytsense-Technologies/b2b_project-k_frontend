'use client';

import ReportsWorkspace from '@/components/shared/ReportsWorkspace';
import { ModulePage, SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { scopeChip } from '@/components/faculty/facultyKit';

/** HOD: student / Q&A / department reports for their own department. */
export default function FacultyReportsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <ModulePage className="fa-page"><SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState></ModulePage>;
  // Neutral until /faculty/me answers, so Faculty never see HOD wording first.
  if (!scope) return <ModulePage className="fa-page"><SectionState title="Loading…" /></ModulePage>;
  if (!scope.can_export_reports) {
    return null;
  }
  return <ReportsWorkspace scope="department" departmentName={scope.department_name || ''} chips={scopeChip(scope)} />;
}
