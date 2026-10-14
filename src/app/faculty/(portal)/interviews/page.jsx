'use client';

import InterviewAssignmentsWorkspace from '@/components/shared/InterviewAssignmentsWorkspace';
import InterviewCohortPanel from '@/components/admin/InterviewCohortPanel';
import { ConfirmNote } from '@/components/shared/module-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/** HOD assigns mock interviews to department cohorts; Faculty follow them. */
export default function FacultyInterviewsPage() {
  const { scope } = useFacultyScope();
  // Until /faculty/me answers, nobody gets the create button (server enforces too).
  const canAssign = Boolean(scope?.can_assign_interviews);
  return (
    <InterviewAssignmentsWorkspace
      scope="department"
      title="Interview assignments"
      description={canAssign
        ? 'Assign AI mock interviews to cohorts in your department and track who has finished.'
        : 'Mock interviews your HOD assigned to cohorts in your department, and how your students are doing.'}
      readOnly={!canAssign}
      notice={scope && !canAssign ? (
        <ConfirmNote icon="mic" title="Your HOD assigns interviews">
          You can follow every assignment and your students&apos; results here.
        </ConfirmNote>
      ) : null}
      extra={<InterviewCohortPanel load={analyticsApi.department} analyticsHref="/faculty/analytics" />}
    />
  );
}
