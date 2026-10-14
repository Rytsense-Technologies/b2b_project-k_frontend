'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import EduVideoPlanEditor from '@/components/shared/EduVideoPlanEditor';
import {
  QuirriSelect,
  QuirriField,
  QuirriControlledField,
} from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import {
  Icon,
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  SearchBox,
  Panel,
  StatusPill,
  IconButton,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { academicsApi } from '@/lib/api/superadmin/academics';
import ChapterLinkModal from '@/components/shared/ChapterLinkModal';
import ReviewHistoryModal from '@/components/shared/ReviewHistoryModal';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  eduVideoApi,
  JOB_STATUS,
  SUPPORTED_EXTENSIONS,
  UPLOAD_LIMITS,
  computeJobProgress,
  summarizeEduVideoError,
} from '@/lib/api/admin/eduVideo';
import MultiDocumentPicker, { validateDocuments } from '@/components/shared/MultiDocumentPicker';
import { mcqApi, mcqGenerateErrorMessage, waitForMcqGeneration } from '@/lib/api/mcq';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { FIELD_RULES } from '@/lib/validation';

const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 20000;

/** User-facing message for a failed upload (FRONTEND_CHANGES.md §2.7). */
function uploadErrorMessage(err) {
  const status = err?.response?.status;
  if (status === 403) return 'You don’t have permission to upload content.';
  if (status === 413) return 'The upload is too large. Keep all documents together under 50 MB.';
  return apiErrorMessage(err, 'Upload failed. Please try again.');
}

/* QuirriBadge variant → shared .sp-pill tone */
const TONE = { red: 'err', green: 'good', amber: 'low', blue: 'teal', off: 'off' };

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
/** Mid-pipeline but untouched for this long: the worker is gone, not "updating on its own". */
const STALL_MS = 30 * 60 * 1000;

function isStalled(job) {
  if (!job || job.status === JOB_STATUS.FAILED || canPreview(job)) return false;
  const last = Date.parse(job.updated_at || job.created_at || '');
  return Number.isFinite(last) && Date.now() - last > STALL_MS;
}

function uploadedLabel(job) {
  const d = new Date(job?.created_at || '');
  return Number.isNaN(d.getTime())
    ? 'No source details'
    : `Uploaded ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function computeStage(job) {
  if (!job) return 'generating';
  if (job.status === JOB_STATUS.FAILED) return 'failed';
  if (isStalled(job)) return 'stalled';
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
    case 'stalled':
      return {
        label: 'Stalled', variant: 'off', progress: null, filterKey: 'stalled',
        note: job.status === JOB_STATUS.AWAITING_REVIEW
          ? 'Waiting for a start that never came. Resume it or remove it.'
          : 'No progress for over 30 minutes. Remove it and upload again.',
      };
    default:
      return {
        label: job?.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
        variant: 'blue', progress, error: null, filterKey: 'generating',
      };
  }
}

/**
 * Shared content upload + generation studio (SOW §6.1 / §6.2 / §6.3).
 * @param {{ platformScope?: boolean }} props
 *   platformScope — Super Admin: pick a college, then department/chapter.
 *   college scope (default) — College Admin: pinned to session tenant.
 */
export default function EduVideoContentStudio({ platformScope = false } = {}) {
  const { tenantId: sessionTenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();

  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterError, setChapterError] = useState('');
  // Optional link into the academic structure: Programme > Semester > Subject > Chapter.
  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [generatingMcqId, setGeneratingMcqId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [linkJob, setLinkJob] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [historyJob, setHistoryJob] = useState(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [dismissingPendingId, setDismissingPendingId] = useState(null);

  const { data: collegeData, loading: collegeLoading, error: collegeError } = useAsyncResource(
    () => (platformScope
      ? fetchData(() => collegesApi.list({ page: 1, pageSize: 100, is_active: true }))
      : Promise.resolve({ items: [] })),
    [platformScope],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);
  const collegeOptions = useMemo(
    () => colleges.map((c) => ({
      value: String(c.id),
      label: c.name || c.code || String(c.id),
    })),
    [colleges],
  );

  const { data: deptData, loading: deptLoading, error: deptError } = useAsyncResource(
    () => {
      if (platformScope && !collegeId) return Promise.resolve({ items: [] });
      return fetchData(() => departmentsApi.list({
        page: 1,
        pageSize: 100,
        is_active: true,
        college_id: platformScope ? collegeId : undefined,
      }));
    },
    [platformScope, collegeId, sessionTenantId],
  );

  const departments = useMemo(() => asList(deptData, []), [deptData]);

  const resetChapterLink = (level) => {
    if (level <= 0) setProgramId('');
    if (level <= 1) setSemesterId('');
    if (level <= 2) setSubjectId('');
    if (level <= 3) setChapterId('');
  };
  const { data: programData } = useAsyncResource(
    () => (departmentId
      ? fetchData(() => academicsApi.listPrograms({ department_id: departmentId }))
      : Promise.resolve(null)),
    [departmentId],
  );
  const programs = useMemo(() => asList(programData, []), [programData]);
  const { data: programDetail } = useAsyncResource(
    () => (programId ? fetchData(() => academicsApi.getProgram(programId)) : Promise.resolve(null)),
    [programId],
  );
  const semesters = useMemo(
    () => (programDetail?.semesters || []).filter((s) => s.is_active !== false),
    [programDetail],
  );
  const { data: subjectData } = useAsyncResource(
    () => (semesterId ? fetchData(() => academicsApi.listSubjects(semesterId)) : Promise.resolve(null)),
    [semesterId],
  );
  const subjects = useMemo(() => asList(subjectData, []), [subjectData]);
  const { data: chapterData } = useAsyncResource(
    () => (subjectId ? fetchData(() => academicsApi.listChapters(subjectId)) : Promise.resolve(null)),
    [subjectId],
  );
  const chapters = useMemo(() => asList(chapterData, []), [chapterData]);
  const linkedChapter = chapters.find((c) => c.id === chapterId) || null;
  const departmentOptions = useMemo(
    () => departments.map((d) => ({
      value: String(d.id),
      label: d.name || d.code || String(d.id),
    })),
    [departments],
  );

  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    reload: reloadJobs,
  } = useAsyncResource(
    () => eduVideoApi.listJobs({
      pageSize: 100,
      tenantId: platformScope ? (collegeId || undefined) : undefined,
    }),
    [platformScope, collegeId],
  );
  const jobs = useMemo(() => asList(jobsData, []), [jobsData]);

  // Open change requests from HOD / Faculty (edu_video_jobs.changes_requested_at,
  // cleared by regenerate / publish / dismiss).
  const pendingFromJobs = useMemo(
    () => jobs.filter((job) => Boolean(job?.changes_requested_at) && !job?.published_at),
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
            const next = jobsRef.current.some((j) => isJobGenerating(j) && !isStalled(j)) ? POLL_ACTIVE_MS : POLL_IDLE_MS;
            schedule(next);
          }
        });
    };

    const initial = jobsRef.current.some((j) => isJobGenerating(j) && !isStalled(j)) ? POLL_ACTIVE_MS : POLL_IDLE_MS;
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
      // Change requests now live on the job itself (GET /jobs); the old
      // in-app bridge store is no longer used.
      const bridgeItems = [];
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
        changes_requested_by: job.changes_requested_by,
        change_note: job.change_note,
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
      changes_requested_by: item.changes_requested_by || jobRow?.changes_requested_by,
      change_note: item.change_note || jobRow?.change_note,
      pending_bridge_plan: item.plan,
    });
  };

  const dismissPending = async (jobId) => {
    setDismissingPendingId(jobId);
    try {
      await eduVideoApi.dismissChanges(jobId);
      toast.success('Change request dismissed. The chapter stays in review.');
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
  // A legacy job parked at AWAITING_REVIEW: POST /jobs/{id}/submit starts rendering it.
  const [resumingId, setResumingId] = useState(null);
  const resumeJob = async (jobId) => {
    setResumingId(jobId);
    try {
      await eduVideoApi.submit(jobId);
      toast.success('Rendering resumed. Progress shows here.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not resume this chapter. Remove it and upload again.'));
    } finally {
      setResumingId(null);
    }
  };

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
    if (generatingMcqId) return; // one request in flight at a time - no duplicate clicks
    setGeneratingMcqId(jobId);
    const readyToast = (doc) => {
      const count = doc?.generated_count || doc?.questions?.length || 0;
      toast.success(
        count
          ? `MCQs ready (${count} questions). HOD/Faculty can review them under MCQ review.`
          : 'MCQs generated. HOD/Faculty can review them under MCQ review.',
      );
    };
    try {
      readyToast(await mcqApi.generate(jobId));
    } catch (err) {
      if (err?.response?.status === 409) {
        // Already generating (another click / another admin) - keep the button
        // disabled and wait for that run to finish instead of failing.
        const waitId = toast.loading(mcqGenerateErrorMessage(err));
        const doc = await waitForMcqGeneration(jobId);
        toast.dismiss(waitId);
        if (doc?.status === 'ready') readyToast(doc);
        else if (doc?.status === 'failed') toast.error(doc.error || 'MCQ generation failed for this chapter.');
        else toast('Still generating — check MCQ review in a few minutes.');
      } else {
        toast.error(mcqGenerateErrorMessage(err));
      }
    } finally {
      setGeneratingMcqId(null);
    }
  };

  const changeDocuments = (next) => {
    setDocuments(next);
    setFileError(''); // a server error referred to the previous selection
  };
  const docCheck = validateDocuments(documents);

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
    if (platformScope && !collegeId) {
      toast.error('Select a college.');
      return;
    }
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
    if (!docCheck.valid) {
      toast.error(docCheck.summary);
      return;
    }

    setUploading(true);
    setUploadPct(0);
    setFileError('');
    try {
      const res = await eduVideoApi.upload({
        documents: documents.map((d) => ({ file: d.file, role: d.role })),
        language: 'english',
        departmentId: dept.id,
        chapterTitle: chapterTitle.trim(),
        chapterId: linkedChapter ? linkedChapter.id : undefined,
        tenantId: platformScope ? collegeId : undefined,
        onUploadProgress: (e) => {
          if (e?.total) setUploadPct(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        },
      });
      if (!res?.job_id) {
        throw new Error('The video API did not return a job id. Try again in a moment.');
      }
      setDocuments([]);
      setChapterTitle('');
      setChapterError('');
      resetChapterLink(0);
      const contentCount = documents.filter((d) => d.role !== 'question_bank').length;
      toast.success(
        contentCount > 1
          ? `Upload started — ${contentCount} documents combined into one chapter. Generation is running in the background.`
          : 'Upload started. Generation is running in the background.',
      );
      (Array.isArray(res.warnings) ? res.warnings : []).forEach((w) => toast(w, { duration: 8000 }));
      await reloadJobs();
    } catch (err) {
      const msg = uploadErrorMessage(err);
      setFileError(msg);
      toast.error(msg);
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

  const canSubmit = Boolean(
    (!platformScope || collegeId)
    && departmentId
    && chapterTitle.trim()
    && docCheck.valid
    && !uploading,
  );

  const searchTerm = jobSearch.trim().toLowerCase();
  // chapter_path is "Programme · Semester · Subject" for linked content.
  const programmeOf = (j) => (j.chapter_path ? String(j.chapter_path).split(' · ')[0] : '');
  const programmeNames = [...new Set(jobs.map(programmeOf).filter(Boolean))].sort();
  const filteredJobs = (statusFilter
    ? jobs.filter((j) => statusBadge(j).filterKey === statusFilter)
    : jobs
  ).filter((j) => !programFilter
    || (programFilter === '__none' ? !j.chapter_id : programmeOf(j) === programFilter))
    .filter((j) => !searchTerm || [j.chapter_title, j.source_filename, j.department_name, j.chapter_path]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(searchTerm)));

  const stageCounts = jobs.reduce((acc, j) => {
    const key = statusBadge(j).filterKey;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const jobsReady = !(jobsLoading && !jobs.length);

  const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'generating', label: 'Generating' },
    { value: 'completed', label: 'Completed' },
    { value: 'awaiting_approval', label: 'Awaiting approval' },
    { value: 'published', label: 'Published' },
    { value: 'failed', label: 'Failed' },
  ];

  const mcqButton = (job) => {
    const busy = generatingMcqId === job.job_id;
    const tip = busy ? 'Generating MCQs…' : 'Generate MCQs for this chapter';
    return (
      <span onMouseEnter={(e) => show(e, tip, 'top')} onMouseLeave={hide}>
        <IconButton
          icon="spark"
          label={busy ? 'Generating MCQs…' : `Generate MCQs for ${job.chapter_title || 'this chapter'}`}
          disabled={Boolean(generatingMcqId)}
          onClick={() => !generatingMcqId && generateMcq(job.job_id)}
        />
      </span>
    );
  };

  const editButton = (job) => (
    <>
      <span onMouseEnter={(e) => show(e, 'Review and edit slides', 'top')} onMouseLeave={hide}>
        <IconButton icon="edit" label={`Edit slides for ${job.chapter_title || 'this chapter'}`} onClick={() => setEditJob(job)} />
      </span>
      <span onMouseEnter={(e) => show(e, job.chapter_id ? 'Change chapter link' : 'Link to a chapter', 'top')} onMouseLeave={hide}>
        <IconButton icon="tree" label={`Link ${job.chapter_title || 'this chapter'} to the academic structure`} onClick={() => setLinkJob(job)} />
      </span>
    </>
  );

  const previewButton = (job) => (
    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setPreviewJob(job)}>
      <Icon name="play" size={14} /> Preview
    </button>
  );

  return (
    <ModulePage className="ad-page">
      <ModuleBanner
        icon="upload"
        eyebrow={platformScope ? 'Super Admin · Content' : 'Upload and content'}
        title="Chapter videos"
        lede={platformScope
          ? 'Upload academic material for any college and trigger AI course generation. Preview the video, then send it to that college’s HOD and faculty for approval before students see it.'
          : 'Upload a chapter document and the video is generated automatically. Preview it, review the slides, then send it to the department HOD and faculty for approval.'}
        chips={(
          <>
            <span className="is-on">Upload</span>
            <Icon name="chev" size={14} />
            <span>Generating</span>
            <Icon name="chev" size={14} />
            <span>Completed</span>
            <Icon name="chev" size={14} />
            <span>HOD approval</span>
            <Icon name="chev" size={14} />
            <span>Published</span>
          </>
        )}
      />

      <KpiRow
        label="Content summary"
        items={[
          {
            icon: 'video',
            label: 'Chapters',
            value: jobsReady ? countLabel(jobs.length) : null,
            sub: platformScope
              ? (collegeId ? 'For the selected college' : 'Across the platform')
              : 'Uploaded by your college',
          },
          { icon: 'clock', label: 'Generating', value: jobsReady ? countLabel(stageCounts.generating || 0) : null, sub: 'Updates on its own' },
          { icon: 'send', label: 'Awaiting approval', value: jobsReady ? countLabel(stageCounts.awaiting_approval || 0) : null, sub: 'With HOD and faculty' },
          { icon: 'tick', label: 'Published', value: jobsReady ? countLabel(stageCounts.published || 0) : null, sub: 'Live for students' },
        ]}
      />

      <div className="ad-upload-grid">
        <Panel
          title="New chapter upload"
          sub={platformScope
            ? 'Choose a college and department, name the chapter and add the source document.'
            : 'Choose a department, name the chapter and add the source document.'}
          className="ad-upload"
        >
          {platformScope && collegeError ? (
            <SectionState tone="err" title="Could not load colleges">
              {apiErrorMessage(collegeError, 'Please try again.')}
            </SectionState>
          ) : null}
          {deptError ? (
            <SectionState tone="err" title="Could not load departments">
              {apiErrorMessage(deptError, 'Please try again.')}
            </SectionState>
          ) : null}

          <div className="grid2">
            {platformScope ? (
              <QuirriSelect
                id="content-college"
                label="College"
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setDepartmentId('');
                  resetChapterLink(0);
                }}
                placeholder={collegeLoading ? 'Loading colleges…' : 'Select college'}
                disabled={collegeLoading || !collegeOptions.length}
                options={collegeOptions}
              />
            ) : null}

            <QuirriSelect
              id="content-department"
              label="Department"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                resetChapterLink(0);
              }}
              placeholder={
                platformScope && !collegeId
                  ? 'Select a college first'
                  : (deptLoading ? 'Loading departments…' : 'Select department')
              }
              disabled={deptLoading || !departmentOptions.length || (platformScope && !collegeId)}
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
              disabled={Boolean(linkedChapter)}
              hint={linkedChapter ? 'Taken from the linked chapter. Clear the chapter link to type a title.' : undefined}
              placeholder="e.g. Trees & Binary Search Trees"
            />
          </div>

          {departmentId ? (
            <div className="ad-chapter-link">
              <div className="ad-chapter-link-h">
                <b>Link to the academic structure</b>
                <small>
                  {programs.length
                    ? 'Optional. Tag this upload to a programme chapter so progress rolls up by subject.'
                    : 'No programmes in this department yet. Add them under Academic structure to tag uploads to chapters.'}
                </small>
              </div>
              {programs.length ? (
                <div className="grid2">
                  <QuirriSelect
                    id="content-programme"
                    label="Programme"
                    value={programId}
                    onChange={(e) => { setProgramId(e.target.value); resetChapterLink(1); }}
                    placeholder="Not linked"
                    options={[{ value: '', label: 'Not linked' }, ...programs.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))]}
                  />
                  <QuirriSelect
                    id="content-semester"
                    label="Semester"
                    value={semesterId}
                    onChange={(e) => { setSemesterId(e.target.value); resetChapterLink(2); }}
                    placeholder={programId ? 'Select semester' : 'Select a programme first'}
                    disabled={!programId || !semesters.length}
                    options={semesters.map((s) => ({ value: s.id, label: s.name }))}
                  />
                  <QuirriSelect
                    id="content-subject"
                    label="Subject"
                    value={subjectId}
                    onChange={(e) => { setSubjectId(e.target.value); resetChapterLink(3); }}
                    placeholder={!semesterId ? 'Select a semester first' : subjects.length ? 'Select subject' : 'No subjects in this semester'}
                    disabled={!semesterId || !subjects.length}
                    options={subjects.map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }))}
                  />
                  <QuirriSelect
                    id="content-chapter"
                    label="Chapter"
                    value={chapterId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setChapterId(id);
                      const ch = chapters.find((c) => c.id === id);
                      if (ch) {
                        setChapterTitle(ch.title);
                        setChapterError('');
                      }
                    }}
                    placeholder={!subjectId ? 'Select a subject first' : chapters.length ? 'Select chapter' : 'No chapters in this subject'}
                    disabled={!subjectId || !chapters.length}
                    options={chapters.map((c) => ({ value: c.id, label: `${c.position}. ${c.title}` }))}
                  />
                </div>
              ) : null}
              {linkedChapter ? (
                <button type="button" className="sp-link ad-chapter-clear" onClick={() => { resetChapterLink(0); setChapterTitle(''); }}>
                  Clear chapter link
                </button>
              ) : null}
            </div>
          ) : null}

          <QuirriField
            label="Source material"
            htmlFor="content-source-files"
            error={fileError}
            hint={`Add one or more documents for this chapter (${SUPPORTED_EXTENSIONS.join(', ')}) · up to ${UPLOAD_LIMITS.maxFiles} files, ${UPLOAD_LIMITS.maxTotalBytes / (1024 * 1024)} MB in total · English`}
          >
            <MultiDocumentPicker
              id="content-source-files"
              items={documents}
              onChange={changeDocuments}
              disabled={uploading}
              serverError={fileError}
            />
          </QuirriField>

          {uploading ? (
            <div className="mdp-progress" aria-live="polite">
              <div className="mdp-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadPct} aria-label="Upload progress">
                <i style={{ width: `${uploadPct}%` }} />
              </div>
              <span>
                {uploadPct < 100
                  ? `Uploading ${documents.length} document${documents.length === 1 ? '' : 's'}… ${uploadPct}%`
                  : documents.length > 1 ? 'Combining documents and creating the job…' : 'Creating the job…'}
              </span>
            </div>
          ) : null}

          <div className="ad-upload-foot">
            <p className="ad-muted">
              <Icon name="info" size={14} />
              After you submit, the video generates in the background. You&apos;ll see it move from
              Generating to Rendering to Completed in the table below.
            </p>
            <button
              type="button"
              className="sd-btn sd-btn--amber"
              disabled={!canSubmit}
              onClick={handleUpload}
              aria-label="Upload and generate"
              onMouseEnter={(e) => {
                if (!canSubmit) {
                  show(e, 'Select a department, chapter title, and valid documents first', 'top');
                }
              }}
              onMouseLeave={hide}
              onFocus={(e) => {
                if (!canSubmit) {
                  show(e, 'Select a department, chapter title, and valid documents first', 'top');
                }
              }}
              onBlur={hide}
            >
              <Icon name="upload" size={16} />
              {uploading ? 'Uploading…' : 'Upload and generate'}
            </button>
          </div>
        </Panel>

        <section className="sp-panel ad-howto" aria-label="How generation works">
          <h3>How generation works</h3>
          <ol>
            <li>
              <span className="pm-step-n">1</span>
              <div><b>Upload</b><small>The pipeline drafts a lesson and renders the video. No manual step is needed.</small></div>
            </li>
            <li>
              <span className="pm-step-n">2</span>
              <div><b>Preview and edit</b><small>When the status reads Completed, preview the video and review its slides.</small></div>
            </li>
            <li>
              <span className="pm-step-n">3</span>
              <div><b>Send to HOD and faculty</b><small>Hand it off for approval. Once approved, it is published for students.</small></div>
            </li>
          </ol>
        </section>
      </div>

      <FilterBar label="Filter content">
        <SearchBox
          placeholder="Search chapter, file or department…"
          value={jobSearch}
          onChange={(e) => setJobSearch(e.target.value)}
        />
        {programmeNames.length || jobs.some((j) => !j.chapter_id) ? (
          <QuirriSelect
            ariaLabel="Filter by programme"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            placeholder="All programmes"
            options={[
              { value: '', label: 'All programmes' },
              ...programmeNames.map((n) => ({ value: n, label: n })),
              { value: '__none', label: 'Not linked to a chapter' },
            ]}
          />
        ) : null}
        <SegTabs label="Filter by status" options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
      </FilterBar>

      <Panel
        title="Content status"
        sub={platformScope
          ? (collegeId
            ? 'Jobs for the selected college — the same list on every browser and device.'
            : 'All platform jobs. Select a college above to narrow the list.')
          : "Your college's jobs from the server — the same list on every browser and device."}
        bodyClassName={null}
      >
        {jobsError ? (
          <div className="sp-panel-b">
            <SectionState
              tone="err"
              title="Could not load content status"
              action={(
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reloadJobs()}>
                  <Icon name="refresh" size={16} /> Try again
                </button>
              )}
            >
              {apiErrorMessage(jobsError, 'Please try again.')}
            </SectionState>
          </div>
        ) : null}

        {jobsLoading && !jobs.length ? (
          <div className="sp-panel-b"><SectionState title="Loading content status…" /></div>
        ) : null}

        {!jobsLoading && !jobsError && !jobs.length ? (
          <div className="sp-panel-b">
            <SectionState title="No chapters yet">
              Upload a chapter above to see its generation status here.
            </SectionState>
          </div>
        ) : null}

        {!jobsLoading && jobs.length && !filteredJobs.length ? (
          <div className="sp-panel-b">
            <SectionState title="No chapters match these filters">
              Try a different status or search.
            </SectionState>
          </div>
        ) : null}

        {filteredJobs.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-jobs ad-stack">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Status</th>
                  <th className="ad-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const badge = statusBadge(job);
                  const stage = badge.filterKey;
                  const previewable = canPreview(job);
                  return (
                    <tr key={job.job_id}>
                      <td>
                        <div className="pm-person">
                          <span className="ad-file-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                          <div>
                            <b className={job.chapter_title ? undefined : 'sa-muted'}>{job.chapter_title || 'Untitled chapter'}</b>
                            <small>{[job.chapter_path || job.department_name, job.source_filename].filter(Boolean).join(' · ') || uploadedLabel(job)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill active on={badge.label} tone={TONE[badge.variant]} />
                        {typeof badge.progress === 'number' ? (
                          <div className="ad-progress" aria-label={`${badge.progress}% done`}>
                            <span className="ad-progress-bar"><i style={{ width: `${badge.progress}%` }} /></span>
                            <small>{badge.progress}%</small>
                          </div>
                        ) : null}
                        {badge.error ? (
                          <div
                            className="ad-job-err edu-video-error"
                            onMouseEnter={(e) => {
                              const { detail } = summarizeEduVideoError(badge.error);
                              if (detail) show(e, detail, 'top');
                            }}
                            onMouseLeave={hide}
                          >
                            {summarizeEduVideoError(badge.error).summary}
                          </div>
                        ) : null}
                        {badge.note ? <div className="ad-muted sa-job-note">{badge.note}</div> : null}
                      </td>
                      <td>
                        <div className="ad-actions">
                          {previewable ? previewButton(job) : null}
                          {stage === 'completed' ? (
                            <>
                              {mcqButton(job)}
                              {editButton(job)}
                              <button
                                type="button"
                                className="sd-btn sd-btn--teal sd-btn--sm"
                                disabled={sendingId === job.job_id}
                                onClick={() => sendingId !== job.job_id && sendToHod(job.job_id)}
                              >
                                <Icon name="send" size={14} />
                                {sendingId === job.job_id ? 'Sending…' : 'Send to HOD'}
                              </button>
                            </>
                          ) : stage === 'awaiting_approval' ? (
                            <>
                              {mcqButton(job)}
                              {editButton(job)}
                            </>
                          ) : stage === 'stalled' ? (
                            <>
                              {job.status === JOB_STATUS.AWAITING_REVIEW ? (
                                <button
                                  type="button"
                                  className="sd-btn sd-btn--teal sd-btn--sm"
                                  disabled={resumingId === job.job_id}
                                  onClick={() => resumingId !== job.job_id && resumeJob(job.job_id)}
                                >
                                  <Icon name="refresh" size={14} />
                                  {resumingId === job.job_id ? 'Resuming…' : 'Resume'}
                                </button>
                              ) : null}
                              <IconButton
                                icon="trash"
                                danger
                                label={removingId === job.job_id ? 'Removing…' : `Remove ${job.chapter_title || 'this job'}`}
                                disabled={removingId === job.job_id}
                                onClick={() => removingId !== job.job_id && removeJob(job.job_id)}
                              />
                            </>
                          ) : stage === 'failed' || stage === 'published' ? (
                            <>
                              {previewable ? (
                                <>
                                  {mcqButton(job)}
                                  {editButton(job)}
                                </>
                              ) : null}
                              <IconButton
                                icon="trash"
                                danger
                                label={removingId === job.job_id ? 'Removing…' : `Remove ${job.chapter_title || 'this job'}`}
                                disabled={removingId === job.job_id}
                                onClick={() => removingId !== job.job_id && removeJob(job.job_id)}
                              />
                            </>
                          ) : previewable ? (
                            <>
                              {mcqButton(job)}
                              {editButton(job)}
                            </>
                          ) : (
                            <span className="ad-muted">Working…</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <section className="sp-panel" data-testid="hod-feedback-queue">
        <div className="sp-panel-h">
          <div>
            <h3>HOD feedback — needs your action</h3>
            <p>When an HOD or faculty member edits slides and sends them back, review and regenerate from those edits here.</p>
          </div>
          {hodFeedbackItems.length ? <span className="sp-pill sp-pill--low">{hodFeedbackItems.length} waiting</span> : null}
        </div>
        {pendingError ? (
          <div className="sp-panel-b">
            <SectionState tone="err" title="Could not load feedback">{pendingError}</SectionState>
          </div>
        ) : null}
        {pendingLoading && !hodFeedbackItems.length ? (
          <div className="sp-panel-b"><SectionState title="Loading HOD feedback…" /></div>
        ) : null}
        {!pendingLoading && !pendingError && !hodFeedbackItems.length ? (
          <div className="sp-panel-b">
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="chat" size={20} /></span>
              <div>
                <b>No pending HOD edits</b>
                <small>When faculty use Save and send to admin, chapters appear here so you can edit and regenerate.</small>
              </div>
            </div>
          </div>
        ) : null}
        {hodFeedbackItems.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Department</th>
                  <th>Received</th>
                  <th className="ad-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hodFeedbackItems.map((item) => (
                  <tr key={item.job_id}>
                    <td>
                      <div className="pm-person">
                        <span className="ad-file-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                        <div>
                          <b>{item.chapter_title || '—'}</b>
                          <small>{item.changes_requested_by ? `From ${item.changes_requested_by}` : (item.source_filename || item.job_id)}</small>
                          {item.change_note ? <small className="ad-feedback-note">“{item.change_note}”</small> : null}
                        </div>
                      </div>
                    </td>
                    <td data-label="Department">{item.department_name || '—'}</td>
                    <td data-label="Received">
                      {item.changes_requested_at
                        ? new Date(item.changes_requested_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
                        })
                        : '—'}
                    </td>
                    <td>
                      <div className="ad-actions">
                        <button
                          type="button"
                          className="sd-btn sd-btn--ghost sd-btn--sm"
                          disabled={dismissingPendingId === item.job_id}
                          onClick={() => dismissingPendingId !== item.job_id
                            && dismissPending(item.job_id)}
                        >
                          {dismissingPendingId === item.job_id ? 'Dismissing…' : 'Dismiss'}
                        </button>
                        <button
                          type="button"
                          className="sd-btn sd-btn--ghost sd-btn--sm"
                          onClick={() => setHistoryJob(item)}
                        >
                          <Icon name="clock" size={14} /> History
                        </button>
                        <button
                          type="button"
                          className="sd-btn sd-btn--teal sd-btn--sm"
                          onClick={() => openPendingEdit(item)}
                        >
                          <Icon name="edit" size={14} /> Review edits
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

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
          // Regenerating clears the change request on the server.
          reloadJobs();
          reloadPending();
        }}
      />

      {linkJob ? (
        <ChapterLinkModal
          job={linkJob}
          onClose={() => setLinkJob(null)}
          onSaved={async () => { setLinkJob(null); await reloadJobs(); }}
        />
      ) : null}

      {historyJob ? <ReviewHistoryModal job={historyJob} onClose={() => setHistoryJob(null)} /> : null}

      <TipLayer />
    </ModulePage>
  );
}
