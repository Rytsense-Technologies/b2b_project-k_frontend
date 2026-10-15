'use client';

import InterviewAssignmentsWorkspace from '@/components/shared/InterviewAssignmentsWorkspace';
import InterviewCohortPanel from '@/components/admin/InterviewCohortPanel';

/** College Admin: assign mock interviews to cohorts; Cohort readiness tab for results. */
export default function AdminInterviewsPage() {
  return (
    <InterviewAssignmentsWorkspace
      scope="college"
      cohort={<InterviewCohortPanel analyticsHref="/admin/analytics" />}
    />
  );
}
