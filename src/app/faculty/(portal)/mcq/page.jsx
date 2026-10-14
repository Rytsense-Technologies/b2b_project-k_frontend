'use client';

import McqReviewWorkspace from '@/components/shared/McqReviewWorkspace';
import ScopeNotice from '@/components/faculty/ScopeNotice';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/** HOD / Faculty MCQ review - limited to their department / subjects by the API. */
export default function FacultyMcqPage() {
  const { scope } = useFacultyScope();
  return <McqReviewWorkspace notice={<ScopeNotice scope={scope} what="question sets" />} />;
}
