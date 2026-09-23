'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import McqStudentQuiz from '@/components/shared/McqStudentQuiz';

function AssessmentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get('job') || params.get('job_id') || '';
  const title = params.get('title') || '';

  const leave = useMemo(
    () => () => router.push('/student/subjects'),
    [router],
  );

  if (!jobId) {
    return (
      <div className="notice err">
        <div>
          <b>Missing chapter</b>
          Open an assessment from My Subjects.
        </div>
      </div>
    );
  }

  return (
    <McqStudentQuiz
      jobId={jobId}
      chapterTitle={title}
      onLeave={leave}
    />
  );
}

export default function StudentAssessmentPage() {
  return (
    <Suspense fallback={<div className="card-p">Loading assessment…</div>}>
      <AssessmentInner />
    </Suspense>
  );
}
