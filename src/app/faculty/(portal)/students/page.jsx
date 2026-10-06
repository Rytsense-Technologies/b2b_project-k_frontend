'use client';

import AdminEmptyModule from '@/components/admin/AdminEmptyModule';

export default function FacultyStudentsPage() {
  return (
    <AdminEmptyModule
      icon="users"
      title="Students"
      description="Students within your scope, with learning, Q&A and assessment activity."
      epic="the scoped student directory"
      steps={[
        { title: 'Student list', body: 'Students enrolled in your subjects, searchable by name or roll number.' },
        { title: 'Learning activity', body: 'Chapters watched, questions asked and time spent per student.' },
        { title: 'Assessment results', body: 'Quiz scores per chapter so you can spot who needs support.' },
      ]}
    />
  );
}
