'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import EduVideoPlanEditor from '@/components/shared/EduVideoPlanEditor';
import { eduVideoApi, JOB_STATUS, computeJobProgress, summarizeEduVideoError } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

const POLL_INTERVAL_MS = 4000;

const canPreview = (job) => job?.status === JOB_STATUS.DONE && Boolean(job?.output_path);

/**
 * Same post-render workflow as the College Admin content page
 * (src/app/admin/(portal)/content/page.jsx) - a video's generation
 * (`status`) runs fully automatically; the two human approval steps
 * (College Admin -> HOD/Faculty -> students) are independent timestamps
 * (sent_to_hod_at, published_at), not new status values. This page's queue
 * is jobs with sent_to_hod_at set - regardless of the legacy
 * AWAITING_TEACHER_REVIEW status, which the backend now passes through
 * almost instantly and this page no longer relies on.
 */
function statusBadge(job) {
  if (job.status === JOB_STATUS.FAILED) return { label: 'Failed', variant: 'red', progress: null, error: job.error };
  if (!canPreview(job)) {
    return {
      label: job.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
      variant: 'blue', progress: computeJobProgress(job), error: null,
    };
  }
  return { label: 'Rendered', variant: 'blue', progress: null, error: null };
}

export default function FacultyVideosPage() {
  const [publishingId, setPublishingId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const { show, hide, TipLayer } = useQuirriTip();

  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    reload: reloadJobs,
  } = useAsyncResource(
    () => eduVideoApi.listJobs({ pageSize: 100 }),
    [],
  );
  const jobs = useMemo(() => asList(jobsData, []), [jobsData]);

  // Awaiting review: sent by a College Admin, not yet published to students.
  const reviewQueue = useMemo(
    () => jobs.filter((j) => j.sent_to_hod_at && !j.published_at),
    [jobs],
  );
  const published = useMemo(
    () => jobs.filter((j) => j.published_at),
    [jobs],
  );
  // Anything else: still generating, or done but not yet sent by the
  // College Admin (nothing for an HOD/Faculty to do about that last case
  // either way).
  const inProgress = useMemo(
    () => jobs.filter((j) => !reviewQueue.includes(j) && !published.includes(j) && !canPreview(j)),
    [jobs, reviewQueue, published],
  );

  // Live-refresh the queue - a chapter can arrive from a College Admin, or
  // move once a colleague (another HOD/Faculty, or this same user in
  // another tab) publishes it.
  const jobsPollInFlight = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (jobsPollInFlight.current) return;
      jobsPollInFlight.current = true;
      reloadJobs()
        .catch(() => {})
        .finally(() => {
          jobsPollInFlight.current = false;
        });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reloadJobs]);

  const publish = async (jobId) => {
    setPublishingId(jobId);
    try {
      // POST /jobs/{id}/publish - the actual "make visible to students"
      // action. Only valid once a College Admin has sent it
      // (sent_to_hod_at set); the server 400s otherwise.
      await eduVideoApi.publish(jobId);
      toast.success('Published — students can now watch this chapter.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not publish this chapter.'));
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {jobsError ? (
        <div className="notice err" style={{ marginBottom: 18 }}>
          <div>
            <b>Could not load videos</b>
            {apiErrorMessage(jobsError, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><h3>Awaiting your review</h3></div>
        <div className="card-sub">
          Preview a chapter, edit slides if needed (Save &amp; send to admin), then publish — or send edits back for the College Admin to regenerate.
        </div>
        {!jobsLoading && !reviewQueue.length ? (
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>Nothing to review</b> Chapters your College Admin sends will appear here.</div>
          </div>
        ) : null}
        {reviewQueue.length ? (
          <table>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Department</th>
                <th>Sent</th>
                <th>Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <span className="strong">{job.chapter_title || '—'}</span>
                    <div className="sub">{job.source_filename}</div>
                  </td>
                  <td>{job.department_name || '—'}</td>
                  <td className="sub">{job.sent_to_hod_at ? new Date(job.sent_to_hod_at).toLocaleString() : '—'}</td>
                  <td className="actions">
                    <a
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewJob(job)}
                      onKeyDown={(e) => e.key === 'Enter' && setPreviewJob(job)}
                    >
                      Preview
                    </a>
                  </td>
                  <td className="actions">
                    <a
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditJob(job)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditJob(job)}
                    >
                      Edit
                    </a>
                    <a
                      role="button"
                      tabIndex={0}
                      onClick={() => publishingId !== job.job_id && publish(job.job_id)}
                      onKeyDown={(e) => e.key === 'Enter' && publish(job.job_id)}
                      style={{ opacity: publishingId === job.job_id ? 0.5 : 1 }}
                    >
                      {publishingId === job.job_id ? 'Publishing…' : 'Publish to students'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {inProgress.length ? (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><h3>In progress</h3></div>
          <div className="card-sub">Still drafting or rendering at the College Admin&apos;s side.</div>
          <table>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inProgress.map((job) => {
                const badge = statusBadge(job);
                return (
                  <tr key={job.job_id}>
                    <td>
                      <span className="strong">{job.chapter_title || '—'}</span>
                      <div className="sub">{job.source_filename}</div>
                    </td>
                    <td>{job.department_name || '—'}</td>
                    <td>
                      <QuirriBadge variant={badge.variant}>{badge.label}</QuirriBadge>
                      {typeof badge.progress === 'number' ? (
                        <div className="sub" style={{ marginTop: 4 }}>{badge.progress}%</div>
                      ) : null}
                      {badge.error ? (
                        <div
                          className="sub edu-video-error"
                          style={{ marginTop: 4, color: 'var(--danger, #b42318)' }}
                          onMouseEnter={(e) => {
                            const { detail } = summarizeEduVideoError(badge.error);
                            if (detail) show(e, detail, 'top');
                          }}
                          onMouseLeave={hide}
                        >
                          {summarizeEduVideoError(badge.error).summary}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card">
        <div className="card-h"><h3>Published</h3></div>
        <div className="card-sub">Live for students in this college.</div>
        {!jobsLoading && !published.length ? (
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>Nothing published yet</b> Chapters you publish will appear here.</div>
          </div>
        ) : null}
        {published.length ? (
          <table>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Department</th>
                <th>Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {published.map((job) => (
                <tr key={job.job_id}>
                  <td>
                    <span className="strong">{job.chapter_title || '—'}</span>
                    <div className="sub">{job.source_filename}</div>
                  </td>
                  <td>{job.department_name || '—'}</td>
                  <td className="actions">
                    <a
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewJob(job)}
                      onKeyDown={(e) => e.key === 'Enter' && setPreviewJob(job)}
                    >
                      Preview
                    </a>
                  </td>
                  <td className="actions">
                    <a
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditJob(job)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditJob(job)}
                    >
                      Edit
                    </a>
                    <a href={eduVideoApi.getDownloadUrl(job.job_id)} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <VideoPreviewModal
        open={Boolean(previewJob)}
        onClose={() => setPreviewJob(null)}
        title={previewJob?.chapter_title || 'Video preview'}
        src={previewJob ? eduVideoApi.getDownloadUrl(previewJob.job_id) : null}
      />
      <EduVideoPlanEditor
        open={Boolean(editJob)}
        job={editJob}
        mode="reviewer"
        onClose={() => setEditJob(null)}
        onSaved={() => reloadJobs()}
      />
      <TipLayer />
    </div>
  );
}
