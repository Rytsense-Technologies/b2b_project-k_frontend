'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import McqStudentQuiz from '@/components/shared/McqStudentQuiz';
import { subjectColor } from '@/components/student/subjectColor';
import { Icon, SectionState } from '@/components/student/ui';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import { SUBJECTS_PATH, classroomHref, subjectKey, subjectName } from '@/lib/student/learning';
import '@/styles/student-learning.css';

/**
 * Student chapter assessment: take → results → review (state in the URL:
 * ?job=…&title=…&subject=…&view=overview|review|study&filter=all|incorrect|correct).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function AssessmentInner() {
  const [url, setUrl] = useUrlState({ job: '', job_id: '', title: '', subject: '', view: 'overview', filter: 'all' });
  const jobId = url.job || url.job_id;

  /* Chapter context (subject name, source file) for breadcrumbs and links. */
  const { data } = useAsyncResource(
    () => (jobId ? eduVideoApi.listStudentVideos({ pageSize: 100 }) : Promise.resolve(null)),
    [jobId],
  );
  const job = useMemo(() => asList(data, []).find((v) => v.job_id === jobId) || null, [data, jobId]);
  const subject = url.subject || (job ? subjectKey(job) : '');

  const context = {
    subjectName: job ? subjectName(job) : '',
    subjectColor: job ? subjectColor(job) : (subject ? subjectColor(subject) : null),
    sourceFilename: job?.source_filename || '',
    subjectsHref: subject ? `${SUBJECTS_PATH}?s=${encodeURIComponent(subject)}` : SUBJECTS_PATH,
    classroomHref: subject ? classroomHref(subject, jobId) : SUBJECTS_PATH,
    tutorHref: subject ? classroomHref(subject, jobId, 'tutor') : SUBJECTS_PATH,
  };

  // A malformed link (?job=abc) would otherwise surface the API's raw "valid UUID" error.
  if (!jobId || !UUID_RE.test(jobId)) {
    return (
      <div className="sl">
        <SectionState
          tone="err"
          title="Missing chapter"
          action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={SUBJECTS_PATH}><Icon name="back" size={16} /> Go to My subjects</Link>}
        >
          Open an assessment from a chapter in My subjects.
        </SectionState>
      </div>
    );
  }

  return (
    <McqStudentQuiz
      jobId={jobId}
      chapterTitle={url.title || job?.chapter_title || ''}
      context={context}
      nav={{ view: url.view, filter: url.filter }}
      onNav={(patch, push) => setUrl(patch, { push: Boolean(push) })}
    />
  );
}

export default function StudentAssessmentPage() {
  return (
    <Suspense fallback={<SectionState title="Loading assessment…" />}>
      <AssessmentInner />
    </Suspense>
  );
}
