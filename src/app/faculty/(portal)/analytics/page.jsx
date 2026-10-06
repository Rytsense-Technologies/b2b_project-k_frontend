'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function FacultyAnalyticsPage() {
  return (
    <AdminEmptyModule
      icon="chart"
      title="Department analytics"
      description="Completion, assessment performance and Q&A demand for your department."
      epic="department analytics"
      steps={[
        { title: 'Completion', body: 'How many students finish each chapter video and quiz.' },
        { title: 'Assessment performance', body: 'Average quiz scores by subject and chapter, with weak topics flagged.' },
        { title: 'Q&A demand', body: 'The topics students ask the AI tutor about most.' },
      ]}
    />
  );
}
