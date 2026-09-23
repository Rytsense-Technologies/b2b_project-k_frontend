'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import EduVideoPlanEditor from '@/components/shared/EduVideoPlanEditor';
import {
  QuirriSelect,
  QuirriField,
  QuirriControlledField,
} from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  eduVideoApi,
  JOB_STATUS,
  SUPPORTED_EXTENSIONS,
  computeJobProgress,
  summarizeEduVideoError,
} from '@/lib/api/admin/eduVideo';
import { mcqApi, mcqErrorMessage } from '@/lib/api/mcq';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { FIELD_RULES } from '@/lib/validation';

const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 20000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function fileExtension(name = '') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function validateFile(file) {
  if (!file) return 'Choose a source file to upload.';
  const ext = fileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type '${ext || '(none)'}'. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File must be 50 MB or smaller.';
  }
  return '';
}

const canPreview = (job) => job?.status === JOB_STATUS.DONE && Boolean(job?.output_path);

function isJobGenerating(job) {
  const s = job?.status;
  return Boolean(s) && s !== JOB_STATUS.DONE && s !== JOB_STATUS.FAILED;
}

/**
 * Generation (`status`) now runs fully automatically end to end (see
 * app/edu_video/pipeline.py::run_pipeline). The human workflow happens
 * AFTER a video exists, via two independent timestamps - not new `status`
 * values - see CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md /
 * BACKEND_EDU_VIDEO_CA_HANDOFF.md:
 *   - not yet rendered            -> "Generating" / "Rendering"
 *   - DONE, sent_to_hod_at unset  -> "Completed" (ready for College Admin to send)
 *   - DONE, sent_to_hod_at set,
 *     published_at unset          -> "Awaiting HOD & Faculty approval"
 *   - DONE, published_at set      -> "Published" (live for students)
 *   - FAILED                      -> "Failed"
 */
function computeStage(job) {
  if (!job) return 'generating';
  if (job.status === JOB_STATUS.FAILED) return 'failed';
  if (!canPreview(job)) return 'generating';
  if (job.published_at) return 'published';
  if (job.sent_to_hod_at) return 'awaiting_approval';
  return 'completed';
}

function statusBadge(job) {
  const stage = computeStage(job);
  const progress = stage === 'completed' || stage === 'awaiting_approval' || stage === 'published'
    ? null
    : computeJobProgress(job);
  const error = job?.error || null;

  switch (stage) {
    case 'failed':
      return { label: 'Failed', variant: 'red', progress: null, error, filterKey: 'failed' };
    case 'completed':
      return { label: 'Completed', variant: 'green', progress: null, error: null, filterKey: 'completed' };
    case 'awaiting_approval':
      return {
        label: 'Awaiting HOD & Faculty approval', variant: 'amber', progress: null, error: null,
        filterKey: 'awaiting_approval',
      };
    case 'published':
      return { label: 'Published', variant: 'green', progress: null, error: null, filterKey: 'published' };
    default:
      return {
        label: job?.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
        variant: 'blue', progress, error: null, filterKey: 'generating',
      };
  }
}

export default function ContentPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const fileInputRef = useRef(null);

  const [departmentId, setDepartmentId] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterError, setChapterError] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [generatingMcqId, setGeneratingMcqId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [dismissingPendingId, setDismissingPendingId] = useState(null);

  const { data: deptData, loading: deptLoading, error: deptError } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({
      page: 1,
      pageSize: 100,
      is_active: true,
    })),
    [tenantId],
  );

  const departments = useMemo(() => asList(deptData, []), [deptData]);
  const departmentOptions = useMemo(
    () => departments.map((d) => ({
      value: String(d.id),
      label: d.name || d.code || String(d.id),
    })),
    [departments],
  );

  // Server-side job list (BACKEND_EDU_VIDEO_CA_HANDOFF.md P1.1) — this
  // college's jobs, the same on every browser/device/role, not a
  // per-browser localStorage guess. Polled below so the table stays live
  // without a manual refresh.
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

  const pendingFromJobs = useMemo(
    () => jobs.filter((job) => {
      if (!job?.sent_to_hod_at || job?.published_at) return false;
      if (job?.changes_requested_at) return true;
      const sentMs = new Date(job.sent_to_hod_at).getTime();
      const updatedMs = job.updated_at ? new Date(job.updated_at).getTime() : 0;
      // Plan saved after CA sent to HOD (request-changes updates plan_json + updated_at).
      return Number.isFinite(sentMs) && updatedMs > sentMs + 2000;
    }),
    [jobs],
  );

  // Silent poll — do not set loading (that re-rendered the whole page every 4s).
  const jobsPollInFlight = useRef(false);
  const reloadJobsRef = useRef(reloadJobs);
  const jobsRef = useRef(jobs);
  reloadJobsRef.current = reloadJobs;
  jobsRef.current = jobs;

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(tick, ms);
    };

    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(POLL_IDLE_MS);
        return;
      }
      if (jobsPollInFlight.current) {
        schedule(POLL_ACTIVE_MS);
        return;
      }
      jobsPollInFlight.current = true;
      reloadJobsRef.current({ silent: true })
        .catch(() => {})
        .finally(() => {
          jobsPollInFlight.current = false;
          if (!cancelled) {
            const next = jobsRef.current.some(isJobGenerating) ? POLL_ACTIVE_MS : POLL_IDLE_MS;
            schedule(next);
          }
        });
    };

    const initial = jobsRef.current.some(isJobGenerating) ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    schedule(initial);
    const onVis = () => {
      if (!document.hidden && !jobsPollInFlight.current) schedule(250);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reloadJobs]);

  const pendingPollInFlight = useRef(false);
  const reloadPending = async ({ silent = false } = {}) => {
    if (!silent) setPendingLoading(true);
    if (!silent) setPendingError('');
    try {
      let bridgeItems = [];
      try {
        const data = await eduVideoApi.listPendingChanges();
        bridgeItems = Array.isArray(data?.items) ? data.items : [];
      } catch {
        bridgeItems = [];
      }
      setPendingItems((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(bridgeItems)) return prev;
        } catch {
          /* fall through */
        }
        return bridgeItems;
      });
      if (!silent) setPendingError('');
    } catch (err) {
      if (!silent) {
        setPendingError(apiErrorMessage(err, 'Could not load HOD feedback.'));
        setPendingItems([]);
      }
    } finally {
      if (!silent) setPendingLoading(false);
    }
  };
  const reloadPendingRef = useRef(reloadPending);
  reloadPendingRef.current = reloadPending;

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(tick, ms);
    };

    const tick = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(POLL_IDLE_MS);
        return;
      }
      if (pendingPollInFlight.current) {
        schedule(POLL_IDLE_MS);
        return;
      }
      pendingPollInFlight.current = true;
      reloadPendingRef.current({ silent: true })
        .catch(() => {})
        .finally(() => {
          pendingPollInFlight.current = false;
          if (!cancelled) schedule(POLL_IDLE_MS);
        });
    };

    reloadPendingRef.current({ silent: false }).catch(() => {});
    schedule(POLL_IDLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const hodFeedbackItems = useMemo(() => {
    const byId = new Map();
    pendingFromJobs.forEach((job) => {
      byId.set(job.job_id, {
        job_id: job.job_id,
        chapter_title: job.chapter_title,
        source_filename: job.source_filename,
        department_name: job.department_name,
        department_id: job.department_id,
        status: job.status,
        sent_to_hod_at: job.sent_to_hod_at,
        changes_requested_at: job.changes_requested_at,
        from_backend: true,
      });
    });
    pendingItems.forEach((item) => {
      if (!byId.has(item.job_id)) {
        byId.set(item.job_id, { ...item, from_bridge: true });
      }
    });
    return Array.from(byId.values()).sort((a, b) => {
      const ta = a.changes_requested_at ? new Date(a.changes_requested_at).getTime() : 0;
      const tb = b.changes_requested_at ? new Date(b.changes_requested_at).getTime() : 0;
      return tb - ta;
    });
  }, [pendingFromJobs, pendingItems]);

  const openPendingEdit = (item) => {
    const jobRow = jobs.find((j) => j.job_id === item.job_id);
    setEditJob({
      ...(jobRow || {}),
      job_id: item.job_id,
      chapter_title: item.chapter_title || jobRow?.chapter_title,
      source_filename: item.source_filename || jobRow?.source_filename,
      department_name: item.department_name || jobRow?.department_name,
      department_id: item.department_id || jobRow?.department_id,
      status: item.status || jobRow?.status || JOB_STATUS.DONE,
      sent_to_hod_at: item.sent_to_hod_at || jobRow?.sent_to_hod_at,
      changes_requested_at: item.changes_requested_at || jobRow?.changes_requested_at,
      pending_bridge_plan: item.plan,
    });
  };

  const dismissPending = async (jobId, fromBridge = false) => {
    setDismissingPendingId(jobId);
    try {
      await eduVideoApi.clearPendingChange(jobId).catch(() => {});
      toast.success('Cleared from the HOD feedback queue.');
      await reloadJobs();
      await reloadPending();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not clear this feedback item.'));
    } finally {
      setDismissingPendingId(null);
    }
  };

  // POST /jobs/{id}/send-to-hod - a College Admin has watched the finished
  // video (Preview column) and hands it to their department's HOD/Faculty.
  // Only valid once status is DONE (the server 400s otherwise).
  const sendToHod = async (jobId) => {
    setSendingId(jobId);
    try {
      await eduVideoApi.sendToHod(jobId);
      toast.success('Sent to your department HOD/Faculty for approval.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send this chapter to your department HOD.'));
    } finally {
      setSendingId(null);
    }
  };

  const generateMcq = async (jobId) => {
    setGeneratingMcqId(jobId);
    try {
      const doc = await mcqApi.generate(jobId);
      toast.success(
        doc?.generated_count
          ? `MCQs ready (${doc.generated_count} questions). HOD/Faculty can review them under MCQ Review.`
          : 'MCQs generated. HOD/Faculty can review them under MCQ Review.',
      );
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not generate MCQs for this chapter.'));
    } finally {
      setGeneratingMcqId(null);
    }
  };

  const pickFile = (nextFile) => {
    const err = validateFile(nextFile);
    setFileError(err);
    setFile(err ? null : nextFile);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const validateChapter = (value) => {
    const trimmed = String(value || '').trim();
    const rule = FIELD_RULES.academicLabel;
    if (!trimmed) return 'Enter a chapter title.';
    if (trimmed.length < rule.min) return `Chapter title must be at least ${rule.min} characters.`;
    if (trimmed.length > rule.max) return `Chapter title must be ${rule.max} characters or fewer.`;
    if (!rule.pattern.test(trimmed)) {
      return 'Enter a valid chapter title using letters, numbers, and common punctuation.';
    }
    return '';
  };

  const handleUpload = async () => {
    const dept = departments.find((d) => String(d.id) === String(departmentId));
    if (!departmentId || !dept) {
      toast.error('Select a department.');
      return;
    }
    const titleErr = validateChapter(chapterTitle);
    setChapterError(titleErr);
    if (titleErr) {
      toast.error(titleErr);
      return;
    }
    const fErr = validateFile(file);
    setFileError(fErr);
    if (fErr) {
      toast.error(fErr);
      return;
    }

    setUploading(true);
    try {
      const res = await eduVideoApi.upload({
        file,
        language: 'english',
        departmentId: dept.id,
        chapterTitle: chapterTitle.trim(),
      });
      if (!res?.job_id) {
        throw new Error('The video API did not return a job id. Try again in a moment.');
      }
      setFile(null);
      setFileError('');
      setChapterTitle('');
      setChapterError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Upload started. Generation is running in the background.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const removeJob = async (jobId) => {
    setRemovingId(jobId);
    try {
      await eduVideoApi.deleteJob(jobId);
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove this job.'));
    } finally {
      setRemovingId(null);
    }
  };

  const canSubmit = Boolean(departmentId && chapterTitle.trim() && file && !uploading);

  const filteredJobs = statusFilter
    ? jobs.filter((j) => statusBadge(j).filterKey === statusFilter)
    : jobs;

  return (
    <div className="animate-fade-in">
      <div className="notice info" style={{ marginBottom: 18 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <b>How generation works</b>
          The pipeline drafts a lesson and renders the video automatically — no manual step needed
          until it&apos;s done. Once <b>Status</b> reads &quot;Completed&quot;, use <b>Preview</b> to watch it,
          <b> Edit</b> to review slides, and if it looks good, <b>Send to HOD &amp; Faculty</b> in the
          Action column to hand it off for approval.
        </div>
      </div>

      <div className="cols a" style={{ alignItems: 'start', marginBottom: 18 }}>
        <div className="card card-p">
          <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>New chapter upload</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 18 }}>
            Choose a department, name the chapter, and upload a document.
          </p>

          {deptError ? (
            <div className="notice err" style={{ marginBottom: 12 }}>
              <div>
                <b>Could not load departments</b>
                {apiErrorMessage(deptError, 'Please try again.')}
              </div>
            </div>
          ) : null}

          <QuirriSelect
            id="content-department"
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder={deptLoading ? 'Loading departments…' : 'Select department'}
            disabled={deptLoading || !departmentOptions.length}
            options={departmentOptions}
          />

          <QuirriControlledField
            label="Chapter title"
            fieldType="academicLabel"
            name="chapter_title"
            id="content-chapter-title"
            value={chapterTitle}
            onChange={(v) => {
              setChapterTitle(v);
              if (chapterError) setChapterError(validateChapter(v));
            }}
            onBlur={() => setChapterError(validateChapter(chapterTitle))}
            error={chapterError}
            placeholder="e.g. Trees & Binary Search Trees"
          />

          <QuirriField
            label="Source material"
            htmlFor="content-source-file"
            error={fileError}
            hint={`Accepted: ${SUPPORTED_EXTENSIONS.join(', ')} · up to 50 MB · English`}
          >
            <div
              className="drop"
              role="button"
              tabIndex={0}
              aria-label="Choose source file"
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              style={{
                outline: dragging ? '2px solid var(--teal-500, #0E5C6B)' : undefined,
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
              <div className="t">
                {file ? file.name : 'Drop a document, or click to browse'}
              </div>
              <div className="s">
                PDF, DOCX, DOC or TXT · up to 50 MB · English
              </div>
              <input
                ref={fileInputRef}
                id="content-source-file"
                type="file"
                accept={SUPPORTED_EXTENSIONS.join(',')}
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>
          </QuirriField>

          <div className="flow" style={{ marginBottom: 16 }}>
            <span className="step">On submit:</span>
            <span>
              The document uploads and the video generates automatically in the background — you&apos;ll
              see it move from Generating to Rendering to Completed here.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canSubmit}
            onClick={handleUpload}
            aria-label="Upload and generate"
            onMouseEnter={(e) => {
              if (!canSubmit) {
                show(e, 'Select a department, chapter title, and supported file first', 'top');
              }
            }}
            onMouseLeave={hide}
            onFocus={(e) => {
              if (!canSubmit) {
                show(e, 'Select a department, chapter title, and supported file first', 'top');
              }
            }}
            onBlur={hide}
          >
            {uploading ? 'Uploading…' : 'Upload & generate'}
          </button>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Content status</h3>
            <QuirriSelect
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All statuses"
              options={[
                { value: 'generating', label: 'Generating' },
                { value: 'completed', label: 'Completed' },
                { value: 'awaiting_approval', label: 'Awaiting HOD & Faculty approval' },
                { value: 'published', label: 'Published' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          <div className="card-sub">
            This college&apos;s jobs from the server — the same list on every browser and device.
          </div>

          {jobsError ? (
            <div className="notice err" style={{ margin: 16 }}>
              <div>
                <b>Could not load content status</b>
                {apiErrorMessage(jobsError, 'Please try again.')}
              </div>
            </div>
          ) : null}

          {!jobsLoading && !jobs.length ? (
            <div className="notice info" style={{ margin: 16 }}>
              <div>
                <b>No jobs yet</b>
                Upload a chapter to see generation status here.
              </div>
            </div>
          ) : null}

          <table>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Department</th>
                <th>Status</th>
                <th>Preview</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobsLoading && !jobs.length ? (
                <tr><td colSpan={5}>Loading…</td></tr>
              ) : null}
              {!jobsLoading && jobs.length && !filteredJobs.length ? (
                <tr><td colSpan={5}>No jobs match this filter.</td></tr>
              ) : null}
              {filteredJobs.map((job) => {
                const badge = statusBadge(job);
                const stage = badge.filterKey;
                const previewable = canPreview(job);
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
                        <div className="sub" style={{ marginTop: 4 }}>
                          {badge.progress}%
                        </div>
                      ) : null}
                      {badge.error ? (
                        <div
                          className="sub edu-video-error"
                          style={{ marginTop: 4, color: 'var(--danger, #b42318)' }}
                          title={undefined}
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
                    <td className="actions">
                      {previewable ? (
                        <a
                          role="button"
                          tabIndex={0}
                          onClick={() => setPreviewJob(job)}
                          onKeyDown={(e) => e.key === 'Enter' && setPreviewJob(job)}
                        >
                          Preview
                        </a>
                      ) : (
                        <span className="sub">—</span>
                      )}
                    </td>
                    <td className="actions">
                      {stage === 'completed' ? (
                        <>
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
                            onClick={() => generatingMcqId !== job.job_id && generateMcq(job.job_id)}
                            onKeyDown={(e) => e.key === 'Enter' && generateMcq(job.job_id)}
                            style={{ opacity: generatingMcqId === job.job_id ? 0.5 : 1 }}
                          >
                            {generatingMcqId === job.job_id ? 'Generating MCQs…' : 'Generate MCQs'}
                          </a>
                          <a
                            role="button"
                            tabIndex={0}
                            onClick={() => sendingId !== job.job_id && sendToHod(job.job_id)}
                            onKeyDown={(e) => e.key === 'Enter' && sendToHod(job.job_id)}
                            style={{ opacity: sendingId === job.job_id ? 0.5 : 1 }}
                          >
                            {sendingId === job.job_id ? 'Sending…' : 'Send to HOD & Faculty'}
                          </a>
                        </>
                      ) : stage === 'awaiting_approval' ? (
                        <>
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
                            onClick={() => generatingMcqId !== job.job_id && generateMcq(job.job_id)}
                            onKeyDown={(e) => e.key === 'Enter' && generateMcq(job.job_id)}
                            style={{ opacity: generatingMcqId === job.job_id ? 0.5 : 1 }}
                          >
                            {generatingMcqId === job.job_id ? 'Generating MCQs…' : 'Generate MCQs'}
                          </a>
                          <span className="sub">Awaiting approval</span>
                        </>
                      ) : stage === 'failed' || stage === 'published' ? (
                        <>
                          {previewable ? (
                            <>
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
                                onClick={() => generatingMcqId !== job.job_id && generateMcq(job.job_id)}
                                onKeyDown={(e) => e.key === 'Enter' && generateMcq(job.job_id)}
                                style={{ opacity: generatingMcqId === job.job_id ? 0.5 : 1 }}
                              >
                                {generatingMcqId === job.job_id ? 'Generating MCQs…' : 'Generate MCQs'}
                              </a>
                            </>
                          ) : null}
                          <a
                            role="button"
                            tabIndex={0}
                            onClick={() => removingId !== job.job_id && removeJob(job.job_id)}
                            onKeyDown={(e) => e.key === 'Enter' && removeJob(job.job_id)}
                            style={{ opacity: removingId === job.job_id ? 0.5 : 1 }}
                          >
                            {removingId === job.job_id ? '…' : 'Remove'}
                          </a>
                        </>
                      ) : previewable ? (
                        <>
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
                            onClick={() => generatingMcqId !== job.job_id && generateMcq(job.job_id)}
                            onKeyDown={(e) => e.key === 'Enter' && generateMcq(job.job_id)}
                            style={{ opacity: generatingMcqId === job.job_id ? 0.5 : 1 }}
                          >
                            {generatingMcqId === job.job_id ? 'Generating MCQs…' : 'Generate MCQs'}
                          </a>
                        </>
                      ) : (
                        <span className="sub">Working…</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" data-testid="hod-feedback-queue">
        <div className="card-h"><h3>HOD feedback — needs your action</h3></div>
        <div className="card-sub">
          When an HOD/Faculty edits slides and sends them back, review and regenerate from those edits here.
        </div>
        {pendingError ? (
          <div className="notice err" style={{ margin: 16 }}>
            <div><b>Could not load feedback</b>{pendingError}</div>
          </div>
        ) : null}
        {pendingLoading && !hodFeedbackItems.length ? (
          <div className="card-p">Loading HOD feedback…</div>
        ) : null}
        {!pendingLoading && !pendingError && !hodFeedbackItems.length ? (
          <div className="notice info" style={{ margin: 16 }}>
            <div>
              <b>No pending HOD edits</b>
              When faculty uses Save &amp; send to admin, chapters appear here so you can edit and regenerate.
            </div>
          </div>
        ) : null}
        {hodFeedbackItems.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Department</th>
                  <th>Received</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hodFeedbackItems.map((item) => (
                  <tr key={item.job_id}>
                    <td>
                      <span className="strong">{item.chapter_title || '—'}</span>
                      <div className="sub">{item.source_filename || item.job_id}</div>
                    </td>
                    <td>{item.department_name || '—'}</td>
                    <td className="sub">
                      {item.changes_requested_at
                        ? new Date(item.changes_requested_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="actions">
                      <a
                        role="button"
                        tabIndex={0}
                        onClick={() => openPendingEdit(item)}
                        onKeyDown={(e) => e.key === 'Enter' && openPendingEdit(item)}
                      >
                        Edit
                      </a>
                      <a
                        role="button"
                        tabIndex={0}
                        onClick={() => dismissingPendingId !== item.job_id
                          && dismissPending(item.job_id, Boolean(item.from_bridge))}
                        onKeyDown={(e) => e.key === 'Enter'
                          && dismissPending(item.job_id, Boolean(item.from_bridge))}
                        style={{ opacity: dismissingPendingId === item.job_id ? 0.5 : 1 }}
                      >
                        {dismissingPendingId === item.job_id ? '…' : 'Dismiss'}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        mode="admin"
        onClose={() => setEditJob(null)}
        onSaved={() => {
          reloadJobs();
          reloadPending();
          if (editJob?.job_id) {
            eduVideoApi.clearPendingChange(editJob.job_id).catch(() => {});
          }
        }}
      />

      <TipLayer />
    </div>
  );
}
