'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import McqStudentQuiz from '@/components/shared/McqStudentQuiz';
import { Icon, SectionState } from '@/components/student/ui';

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
      <div className="sp-quiz">
        <SectionState
          tone="err"
          title="Missing chapter"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={leave}>
              <Icon name="back" size={16} /> Go to My subjects
            </button>
          )}
        >
          Open an assessment from My subjects.
        </SectionState>
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
    <Suspense fallback={<div className="sp-quiz"><SectionState title="Loading assessment…" /></div>}>
      <AssessmentInner />
    </Suspense>
  );
}
