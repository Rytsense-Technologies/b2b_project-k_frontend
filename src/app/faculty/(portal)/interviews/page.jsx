'use client';

import InterviewAssignmentsWorkspace from '@/components/shared/InterviewAssignmentsWorkspace';

export default function FacultyInterviewsPage() {
  return (
    <InterviewAssignmentsWorkspace
      scope="department"
      title="Interview assignments"
      description="Create interview assignments for cohorts in your department."
    />
  );
}
