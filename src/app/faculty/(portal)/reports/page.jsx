'use client';

import Link from 'next/link';
import ReportsWorkspace from '@/components/shared/ReportsWorkspace';
import { Icon, ModulePage, SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { FacultyScopeChip } from '@/components/faculty/facultyKit';

/** HOD: student / Q&A / interview / department reports for their own department. */
export default function FacultyReportsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState>;
  // Neutral until /faculty/me answers, so Faculty never see HOD wording first.
  if (!scope) return <SectionState title="Loading…" />;
  if (!scope.can_export_reports) {
    return (
      <ModulePage className="fa-page">
        <SectionState
          title="Available to your head of department"
          action={<Link className="sd-btn sd-btn--teal sd-btn--sm" href="/faculty/dashboard"><Icon name="back" size={16} /> Back to dashboard</Link>}
        >
          Your students&apos; results are under Students and Analytics.
        </SectionState>
      </ModulePage>
    );
  }
  return <ReportsWorkspace scope="department" departmentName={scope.department_name || ''} chips={<FacultyScopeChip scope={scope} />} />;
}
