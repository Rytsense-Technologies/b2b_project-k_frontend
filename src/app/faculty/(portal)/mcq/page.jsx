'use client';

import { useMemo, useState } from 'react';
import McqDocumentReview from '@/components/shared/McqDocumentReview';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { eduVideoApi, JOB_STATUS } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/**
 * HOD / Faculty — review generated MCQs for chapters in scope.
 * Uses GET/POST /api/v1/mcq (no separate approve endpoint yet).
 */
export default function FacultyMcqPage() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, loading, error, reload } = useAsyncResource(
    () => eduVideoApi.listJobs({ pageSize: 100 }),
    [],
  );
  const jobs = useMemo(() => asList(data, []), [data]);

  const chapters = useMemo(
    () => jobs
      .filter((j) => j.status === JOB_STATUS.DONE || j.output_path || j.published_at)
      .sort((a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0)
        - (Date.parse(a.updated_at || a.created_at || '') || 0)),
    [jobs],
  );

  const selected = chapters.find((j) => j.job_id === selectedId) || null;

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">MCQ Review</div>
          <div className="d">
            Review AI-generated questions for each chapter. Correct answers are shown for SME review.
          </div>
        </div>
        <QuirriBtn type="button" variant="ghost" onClick={reload} disabled={loading}>
          Refresh list
        </QuirriBtn>
      </div>

      {error ? (
        <div className="notice err" style={{ marginBottom: 16 }}>
          <div>
            <b>Could not load chapters</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="edu-plan-editor" style={{ marginTop: 8 }}>
        <div className="edu-plan-scenes">
          <div className="edu-plan-scenes-h">
            Chapters
            <span className="sub">{loading ? '…' : `${chapters.length} total`}</span>
          </div>
          {!loading && !chapters.length ? (
            <div className="card-p" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              No rendered chapters yet. Finish a video in Content / Videos first.
            </div>
          ) : null}
          {chapters.map((job) => {
            const active = job.job_id === selectedId;
            return (
              <button
                key={job.job_id}
                type="button"
                className={`edu-plan-scene${active ? ' is-active' : ''}`}
                onClick={() => setSelectedId(job.job_id)}
              >
                <span className="edu-plan-scene-t">
                  {job.chapter_title || job.source_filename || 'Chapter'}
                </span>
                <span className="edu-plan-scene-type">
                  {job.department_name || '—'}
                  {job.published_at ? ' · published' : job.sent_to_hod_at ? ' · in review' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="edu-plan-detail">
          {selected ? (
            <>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {selected.published_at ? (
                  <QuirriBadge variant="green">Published to students</QuirriBadge>
                ) : (
                  <QuirriBadge variant="amber">Not published yet</QuirriBadge>
                )}
              </div>
              <McqDocumentReview
                jobId={selected.job_id}
                chapterTitle={selected.chapter_title || ''}
                canGenerate
              />
            </>
          ) : (
            <div className="notice info">
              <div>
                <b>Select a chapter</b>
                Choose a chapter on the left to review or generate its MCQ set.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
