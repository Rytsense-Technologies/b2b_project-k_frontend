'use client';

import InterviewAssignmentsWorkspace from '@/components/shared/InterviewAssignmentsWorkspace';

export default function AdminInterviewsPage() {
  return (
    <InterviewAssignmentsWorkspace
      scope="college"
      title="Interview assignments"
      description="Assign AI mock interviews to final-year cohorts and track completion. Only final-year students are eligible by default."
    />
  );
}
