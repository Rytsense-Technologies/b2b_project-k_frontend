'use client';

import McqReviewWorkspace from '@/components/shared/McqReviewWorkspace';
import { scopeChip, ReadOnlyNote, useSubjectColor } from '@/components/faculty/facultyKit';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/**
 * HOD / Faculty MCQ review - limited to their department / subjects by the API.
 * Scope is said once (FacultyScopeChip); the full notice is kept only for Faculty without subjects.
 */
export default function FacultyMcqPage() {
  const { scope } = useFacultyScope();
  const colorFor = useSubjectColor();
  return (
    <McqReviewWorkspace
      chips={scopeChip(scope)}
      notice={<ReadOnlyNote scope={scope} what="question sets" />}
      colorFor={colorFor}
    />
  );
}
