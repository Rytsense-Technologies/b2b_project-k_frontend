'use client';

import ReportsWorkspace from '@/components/shared/ReportsWorkspace';
import { SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/** HOD: student / Q&A / interview / department reports for their own department. */
export default function FacultyReportsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState>;
  if (!scope) return <SectionState title="Loading…" />;
  if (!scope.can_export_reports) {
    return (
      <SectionState title="Reports are for your HOD">
        Department reports are available to the head of department. Your students&apos; results are under Students and Analytics.
      </SectionState>
    );
  }
  return <ReportsWorkspace scope="department" departmentName={scope.department_name || ''} />;
}
