'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function FacultySubjectsPage() {
  return (
    <AdminEmptyModule
      icon="book"
      title="Subjects"
      description="Subjects in your scope and how far each is through review."
      epic="the subject directory"
      steps={[
        { title: 'Your subjects', body: 'Every subject assigned to you, grouped by department and semester.' },
        { title: 'Review progress', body: 'How many chapters of each subject are generated, in review and published.' },
        { title: 'Jump to review', body: 'Open a subject’s pending videos or MCQs in one step.' },
      ]}
    />
  );
}
