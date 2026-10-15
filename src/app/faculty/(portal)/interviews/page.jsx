'use client';

import InterviewAssignmentsWorkspace from '@/components/shared/InterviewAssignmentsWorkspace';
import InterviewCohortPanel from '@/components/admin/InterviewCohortPanel';
import { FacultyScopeChip } from '@/components/faculty/facultyKit';
import { SectionState } from '@/components/shared/module-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/** HOD assigns mock interviews to department cohorts; Faculty follow them (read-only). */
export default function FacultyInterviewsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState>;
  // Neutral until /faculty/me answers: no create button and no HOD wording for Faculty.
  if (!scope) return <SectionState title="Loading interview assignments…" />;
  const canAssign = Boolean(scope.can_assign_interviews);
  return (
    <InterviewAssignmentsWorkspace
      scope="department"
      readOnly={!canAssign}
      chips={<FacultyScopeChip scope={scope} />}
      cohort={<InterviewCohortPanel load={analyticsApi.department} analyticsHref="/faculty/analytics?tab=interviews" showDepartment={false} />}
    />
  );
}
