'use client';

import Link from 'next/link';
import ReportsWorkspace from '@/components/shared/ReportsWorkspace';
import { Icon, ModulePage, SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { scopeChip } from '@/components/faculty/facultyKit';

/** HOD: student / Q&A / department reports for their own department. */
export default function FacultyReportsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <ModulePage className="fa-page"><SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState></ModulePage>;
  // Neutral until /faculty/me answers, so Faculty never see HOD wording first.
  if (!scope) return <ModulePage className="fa-page"><SectionState title="Loading…" /></ModulePage>;
  if (!scope.can_export_reports) {
    return (
      <ModulePage className="fa-page">
        <section className="fa-missing" aria-labelledby="fa-reports-locked">
          <b id="fa-reports-locked">This page is for your head of department</b>
          <p>Your students&apos; results are under Students and Analytics.</p>
          <Link href="/faculty/dashboard"><Icon name="back" size={16} /> Back to dashboard</Link>
        </section>
      </ModulePage>
    );
  }
  return <ReportsWorkspace scope="department" departmentName={scope.department_name || ''} chips={scopeChip(scope)} />;
}
