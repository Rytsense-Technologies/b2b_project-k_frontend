'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function FacultyInterviewsPage() {
  return (
    <AdminEmptyModule
      icon="mic"
      title="Interview assignments"
      description="Create interview assignments for cohorts in your department."
      epic="interview assignments"
      steps={[
        { title: 'Pick a cohort', body: 'Choose a batch or section from your department.' },
        { title: 'Set the interview', body: 'Select the role, interview type and a due date.' },
        { title: 'Track completion', body: 'See who has finished and open each student’s report.' },
      ]}
    />
  );
}
