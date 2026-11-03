'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
  ModuleHead,
  HeadChip,
  KpiRow,
  TabNav,
  TabPanel,
  SegTabs,
  SearchBox,
  Panel,
  Pager,
  StatusPill,
  SectionState,
  ConfirmNote,
  countLabel,
} from '@/components/shared/module-ui';
import { ModernDonut } from '@/components/shared/data-viz';
import QuirriModal from '@/components/superadmin/QuirriModal';
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
import { mcqApi, mcqGenerateErrorMessage, mcqSetState, waitForMcqGeneration } from '@/lib/api/mcq';
import { useRetryAfter } from '@/hooks/useRetryAfter';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { FIELD_RULES } from '@/lib/validation';

const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 20000;
const PAGE_SIZE = 25;
/** GET /edu_video/jobs caps page_size at 100: walk the pages instead of stopping at the first 100. */
const FETCH_PAGE = 100;
const MAX_PAGES = 20;

/** User-facing message for a failed upload (FRONTEND_CHANGES.md §2.7). */
function uploadErrorMessage(err) {
  const status = err?.response?.status;
  if (status === 403) return 'You don’t have permission to upload content.';
  if (status === 413) return 'The upload is too large. Keep all documents together under 50 MB.';
  return apiErrorMessage(err, 'Upload failed. Please try again.');
}

/**
 * Every job matching the server-side filters (q, department, college), page by page.
 * Stages (ready / with HOD / published) come from timestamps, not `status`, so they are
 * counted and filtered on the client over the full set.
 */
async function fetchAllJobs(params) {
  const first = await eduVideoApi.listJobs({ ...params, page: 1, pageSize: FETCH_PAGE });
  const items = [...asList(first, [])];
  const total = Number(first?.total) || items.length;
  const pages = Math.min(MAX_PAGES, Math.ceil(total / FETCH_PAGE));
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => eduVideoApi.listJobs({ ...params, page: i + 2, pageSize: FETCH_PAGE })),
    );
    rest.forEach((r) => items.push(...asList(r, [])));
  }
  const seen = new Set();
  return {
    items: items.filter((j) => (seen.has(j.job_id) ? false : seen.add(j.job_id))),
    total,
  };
}

const canPreview = (job) => job?.status === JOB_STATUS.DONE && Boolean(job?.output_path);

function isJobGenerating(job) {
  const s = job?.status;
  return Boolean(s) && s !== JOB_STATUS.DONE && s !== JOB_STATUS.FAILED;
}

/**
 * Generation (`status`) runs automatically end to end (app/edu_video/pipeline.py). The human
 * workflow happens after a video exists, via timestamps:
 *   not yet rendered            -> Generating / Rendering
 *   DONE, sent_to_hod_at unset  -> Ready to send (College Admin previews, then sends)
 *   DONE, sent_to_hod_at set    -> With HOD (department review)
 *   DONE, published_at set      -> Published (live for students)
 *   FAILED                      -> Failed
 */
/** Mid-pipeline but untouched for this long: the worker is gone, not "updating on its own". */
const STALL_MS = 30 * 60 * 1000;

function isStalled(job) {
  if (!job || job.status === JOB_STATUS.FAILED || canPreview(job)) return false;
  const last = Date.parse(job.updated_at || job.created_at || '');
  return Number.isFinite(last) && Date.now() - last > STALL_MS;
}

/** Row title: the chapter title, else the uploaded file name. */
function chapterName(job) {
  return job?.chapter_title || job?.source_filename || 'Untitled chapter';
}

function shortDate(value) {
  const d = new Date(value || '');
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).replace('Sept', 'Sep');
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

const STAGE_LABEL = {
  generating: 'Generating',
  completed: 'Ready to send',
  awaiting_approval: 'With HOD',
  published: 'Published',
  failed: 'Failed',
  stalled: 'Stalled',
};

// One colour per stage, shared with the "Where chapters are" donut (modern-cards-plan):
// Generating teal · Ready to send blue · With HOD orange · Published green · Failed red.
function statusBadge(job) {
  const stage = computeStage(job);
  switch (stage) {
    case 'failed':
      return { label: 'Failed', tone: 'err', progress: null, error: job?.error || null, filterKey: 'failed' };
    case 'completed':
      return { label: STAGE_LABEL.completed, tone: 'info', progress: null, error: null, filterKey: 'completed' };
    case 'awaiting_approval':
      return { label: STAGE_LABEL.awaiting_approval, tone: 'amber', progress: null, error: null, filterKey: 'awaiting_approval' };
    case 'published':
      return { label: 'Published', tone: 'good', progress: null, error: null, filterKey: 'published' };
    case 'stalled':
      return {
        label: 'Stalled', tone: 'off', progress: null, filterKey: 'stalled',
        note: job.status === JOB_STATUS.AWAITING_REVIEW
          ? 'Waiting for a start that never came. Resume it or remove it.'
          : 'No progress for over 30 minutes. Remove it and upload again.',
      };
    default:
      return {
        label: job?.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
        tone: 'off', progress: computeJobProgress(job), error: null, filterKey: 'generating',
      };
  }
}

/** Kebab menu for secondary row actions. Fixed-position so table scroll areas never clip it. */
function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const list = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onDoc = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    // preventScroll: focusing must not scroll the page, or the scroll listener closes the menu (390px bug).
    menuRef.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!list.length) return null;

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    const w = 224;
    const h = list.length * 40 + 16;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
    const top = r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4;
    setPos({ top, left });
    setOpen(true);
  };

  const onMenuKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Tab') return;
    const btns = [...menuRef.current.querySelectorAll('button:not(:disabled)')];
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    e.preventDefault();
    const i = btns.indexOf(document.activeElement);
    const next = btns[(i + (e.key === 'ArrowDown' ? 1 : btns.length - 1)) % btns.length];
    next?.focus();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="un-icon-btn cs-kebab"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div ref={menuRef} className="cs-menu" role="menu" aria-label={label} style={{ top: pos.top, left: pos.left }} onKeyDown={onMenuKey}>
          {list.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={`cs-menu-item${it.danger ? ' is-danger' : ''}`}
              disabled={it.disabled}
              onClick={() => {
                // Focus the row's ⋯ button first so the dialog this opens returns focus to it.
                btnRef.current?.focus();
                setOpen(false);
                it.onClick();
              }}
            >
              <Icon name={it.icon} size={16} />
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/**
 * Shared content upload + generation studio (SOW §6.1 / §6.2 / §6.3).
 * @param {{ platformScope?: boolean }} props
 *   platformScope — Super Admin: Library / Upload / Review feedback across colleges.
 *   college scope (default) — College Admin: Chapters / Upload / Change requests, pinned to the session tenant.
 */
function ContentStudio({ platformScope = false }) {
  const { tenantId: sessionTenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();

  const TAB_VALUES = platformScope ? ['library', 'upload', 'feedback'] : ['chapters', 'upload', 'changes'];
  const [tab, setTab] = useTabParam(TAB_VALUES, TAB_VALUES[0]);
  const listTab = TAB_VALUES[0];
  const feedbackTab = TAB_VALUES[2];

  // List filters live in the URL (shareable, Back-safe).
  const [filters, setFilters] = useUrlState({ q: '', college: '', dept: '', prog: '', stage: '', page: '1' });
  const [searchDraft, setSearchDraft] = useState(filters.q);
  useEffect(() => { setSearchDraft(filters.q); }, [filters.q]);
  useEffect(() => {
    const next = searchDraft.trim();
    if (next === filters.q) return undefined;
    const t = setTimeout(() => setFilters({ q: next, page: '1' }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  // Upload form state
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

  const [removingId, setRemovingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [generatingMcqId, setGeneratingMcqId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [linkJob, setLinkJob] = useState(null);
  const [historyJob, setHistoryJob] = useState(null);
  const [dismissingPendingId, setDismissingPendingId] = useState(null);
  // Confirmations for destructive / approval-clearing actions.
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmMcq, setConfirmMcq] = useState(null); // { job, state }
  const [checkingMcqId, setCheckingMcqId] = useState(null);
  const generateRetry = useRetryAfter();
  const [openErrorId, setOpenErrorId] = useState(null);
  const [resumingId, setResumingId] = useState(null);

  const { data: collegeData, loading: collegeLoading, error: collegeError } = useAsyncResource(
    () => (platformScope
      ? fetchData(() => collegesApi.list({ page: 1, pageSize: 100, is_active: true }))
      : Promise.resolve({ items: [] })),
    [platformScope],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);
  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.id), label: c.name || c.code || String(c.id) })),
    [colleges],
  );

  // Upload form: departments of the chosen college (SA) or the session college (CA).
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
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.name || d.code || String(d.id) })),
    [departments],
  );

  // List filter: departments of the filtered college (SA); CA reuses the form list.
  const { data: filterDeptData } = useAsyncResource(
    () => (platformScope && filters.college
      ? fetchData(() => departmentsApi.list({ page: 1, pageSize: 100, is_active: true, college_id: filters.college }))
      : Promise.resolve(null)),
    [platformScope, filters.college],
  );
  const filterDepartments = platformScope ? asList(filterDeptData, []) : departments;

  // Start the upload form on the college the library is filtered to.
  useEffect(() => {
    if (platformScope && tab === 'upload' && !collegeId && filters.college) setCollegeId(filters.college);
  }, [platformScope, tab, collegeId, filters.college]);

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

  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    reload: reloadJobs,
  } = useAsyncResource(
    () => fetchAllJobs({
      q: filters.q || undefined,
      departmentId: filters.dept || undefined,
      tenantId: platformScope ? (filters.college || undefined) : undefined,
    }),
    [platformScope, filters.college, filters.dept, filters.q],
  );
  const jobs = useMemo(() => asList(jobsData, []), [jobsData]);

  // Open change requests from the HOD / Faculty (cleared by regenerate / publish / dismiss).
  const feedbackItems = useMemo(
    () => jobs
      .filter((job) => Boolean(job?.changes_requested_at) && !job?.published_at)
      .sort((a, b) => (Date.parse(b.changes_requested_at) || 0) - (Date.parse(a.changes_requested_at) || 0)),
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
    const busy = () => jobsRef.current.some((j) => isJobGenerating(j) && !isStalled(j));
    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(tick, ms);
    };
    function tick() {
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
          if (!cancelled) schedule(busy() ? POLL_ACTIVE_MS : POLL_IDLE_MS);
        });
    }
    schedule(busy() ? POLL_ACTIVE_MS : POLL_IDLE_MS);
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

  const openFeedbackEdit = (job) => {
    setEditJob({ ...job, status: job.status || JOB_STATUS.DONE });
  };

  const dismissPending = async (jobId) => {
    setDismissingPendingId(jobId);
    try {
      await eduVideoApi.dismissChanges(jobId);
      toast.success('Change request dismissed. The chapter stays with the HOD.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not clear this change request.'));
    } finally {
      setDismissingPendingId(null);
    }
  };

  // A legacy job parked at AWAITING_REVIEW: POST /jobs/{id}/submit starts rendering it.
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

  // POST /jobs/{id}/send-to-hod — only valid once the video is DONE (the server 400s otherwise).
  const sendToHod = async (jobId) => {
    setSendingId(jobId);
    try {
      await eduVideoApi.sendToHod(jobId);
      toast.success('Sent to the department HOD for approval.');
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send this chapter to the department HOD.'));
    } finally {
      setSendingId(null);
    }
  };

  // A set that already exists is replaced (and its approval cleared) by generate: confirm first.
  const requestGenerateMcq = async (job) => {
    if (generatingMcqId || checkingMcqId || generateRetry.disabled) return;
    setCheckingMcqId(job.job_id);
    let state = 'none';
    try {
      state = mcqSetState(await mcqApi.getOrNull(job.job_id));
    } catch {
      state = 'none';
    } finally {
      setCheckingMcqId(null);
    }
    if (state === 'approved' || state === 'awaiting') setConfirmMcq({ job, state });
    else generateMcq(job.job_id);
  };

  const generateMcq = async (jobId) => {
    if (generatingMcqId || generateRetry.disabled) return;
    setConfirmMcq(null);
    setGeneratingMcqId(jobId);
    const readyToast = (doc) => {
      const count = doc?.generated_count || doc?.questions?.length || 0;
      toast.success(
        count
          ? `MCQs ready (${count} questions). The HOD can review them under MCQ review.`
          : 'MCQs generated. The HOD can review them under MCQ review.',
      );
    };
    try {
      readyToast(await mcqApi.generate(jobId));
    } catch (err) {
      if (err?.response?.status === 409) {
        // Already generating (another click / another admin): wait for that run instead of failing.
        const waitId = toast.loading(mcqGenerateErrorMessage(err));
        const doc = await waitForMcqGeneration(jobId);
        toast.dismiss(waitId);
        if (doc?.status === 'ready') readyToast(doc);
        else if (doc?.status === 'failed') toast.error(doc.error || 'MCQ generation failed for this chapter.');
        else toast('Still generating — check MCQ review in a few minutes.');
      } else {
        generateRetry.arm(err);
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
        throw new Error('The upload finished but the chapter was not created. Please try again.');
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
      setTab(listTab);
      await reloadJobs();
    } catch (err) {
      const msg = uploadErrorMessage(err);
      setFileError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const removeJob = async (job) => {
    const jobId = job.job_id;
    setConfirmRemove(null);
    setRemovingId(jobId);
    try {
      await eduVideoApi.deleteJob(jobId);
      toast.success(`${chapterName(job)} removed.`);
      await reloadJobs();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove this chapter.'));
    } finally {
      setRemovingId(null);
    }
  };

  const collegeNameOf = (job) => job.college_name
    || job.tenant_name
    || colleges.find((c) => String(c.id) === String(job.tenant_id || ''))?.name
    || '';

  const canSubmit = Boolean(
    (!platformScope || collegeId)
    && departmentId
    && chapterTitle.trim()
    && docCheck.valid
    && !uploading,
  );

  // chapter_path is "Programme · Semester · Subject" for linked content.
  const programmeOf = (j) => (j.chapter_path ? String(j.chapter_path).split(' · ')[0] : '');
  const programmeNames = [...new Set(jobs.map(programmeOf).filter(Boolean))].sort();

  const stageCounts = useMemo(() => jobs.reduce((acc, j) => {
    const key = statusBadge(j).filterKey;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [jobs]);

  const filteredJobs = jobs
    .filter((j) => !filters.stage || statusBadge(j).filterKey === filters.stage)
    .filter((j) => !filters.prog
      || (filters.prog === '__none' ? !j.chapter_id : programmeOf(j) === filters.prog));
  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(filters.page) || 1));
  const pageJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const jobsReady = !(jobsLoading && !jobs.length);
  const hasFilters = Boolean(filters.q || filters.dept || filters.prog || filters.stage || (platformScope && filters.college));
  const clearFilters = () => {
    setSearchDraft('');
    setFilters({ q: '', college: '', dept: '', prog: '', stage: '', page: '1' });
  };

  const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'generating', label: STAGE_LABEL.generating },
    { value: 'completed', label: STAGE_LABEL.completed },
    { value: 'awaiting_approval', label: STAGE_LABEL.awaiting_approval },
    { value: 'published', label: STAGE_LABEL.published },
    { value: 'failed', label: STAGE_LABEL.failed },
    ...(stageCounts.stalled ? [{ value: 'stalled', label: STAGE_LABEL.stalled }] : []),
  ];

  const filterCollegeName = platformScope && filters.college
    ? collegeOptions.find((c) => c.value === String(filters.college))?.label || 'Selected college'
    : '';

  /* ---------- Row actions: one visible action + a menu for the rest ---------- */
  const mcqItem = (job) => ({
    label: generateRetry.disabled
      ? `Wait ${generateRetry.seconds}s`
      : generatingMcqId === job.job_id ? 'Generating MCQs…' : 'Generate MCQs',
    icon: 'spark',
    disabled: Boolean(generatingMcqId) || checkingMcqId === job.job_id || generateRetry.disabled,
    onClick: () => requestGenerateMcq(job),
  });
  const slidesItem = (job) => ({ label: 'Edit slides', icon: 'edit', onClick: () => setEditJob(job) });
  const linkItem = (job) => ({
    label: job.chapter_id ? 'Change chapter link' : 'Link to a chapter',
    icon: 'tree',
    onClick: () => setLinkJob(job),
  });
  const historyItem = (job) => ({ label: 'Review history', icon: 'clock', onClick: () => setHistoryJob(job) });
  const previewItem = (job) => ({ label: 'Preview video', icon: 'play', onClick: () => setPreviewJob(job) });
  const removeItem = (job) => ({
    label: removingId === job.job_id ? 'Removing…' : 'Remove chapter',
    icon: 'trash',
    danger: true,
    disabled: removingId === job.job_id,
    onClick: () => setConfirmRemove(job),
  });

  const previewButton = (job) => (
    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setPreviewJob(job)}>
      <Icon name="play" size={14} /> Preview
    </button>
  );

  const rowActions = (job, stage) => {
    const previewable = canPreview(job);
    let primary = null;
    let menu = [];
    if (stage === 'completed') {
      primary = (
        <button
          type="button"
          className="sd-btn sd-btn--teal sd-btn--sm"
          disabled={sendingId === job.job_id}
          onClick={() => sendingId !== job.job_id && sendToHod(job.job_id)}
        >
          <Icon name="send" size={14} />
          {sendingId === job.job_id ? 'Sending…' : 'Send to HOD'}
        </button>
      );
      menu = [previewItem(job), slidesItem(job), mcqItem(job), linkItem(job), job.sent_to_hod_at ? historyItem(job) : null];
    } else if (stage === 'awaiting_approval') {
      primary = previewButton(job);
      menu = [slidesItem(job), mcqItem(job), linkItem(job), historyItem(job)];
    } else if (stage === 'published') {
      primary = previewButton(job);
      menu = [mcqItem(job), linkItem(job), historyItem(job), removeItem(job)];
    } else if (stage === 'stalled') {
      primary = job.status === JOB_STATUS.AWAITING_REVIEW ? (
        <button
          type="button"
          className="sd-btn sd-btn--teal sd-btn--sm"
          disabled={resumingId === job.job_id}
          onClick={() => resumingId !== job.job_id && resumeJob(job.job_id)}
        >
          <Icon name="refresh" size={14} />
          {resumingId === job.job_id ? 'Resuming…' : 'Resume'}
        </button>
      ) : null;
      menu = [removeItem(job)];
    } else if (stage === 'failed') {
      primary = previewable ? previewButton(job) : null;
      menu = [
        previewable ? slidesItem(job) : null,
        previewable ? mcqItem(job) : null,
        previewable ? linkItem(job) : null,
        job.sent_to_hod_at ? historyItem(job) : null,
        removeItem(job),
      ];
    } else if (previewable) {
      primary = previewButton(job);
      menu = [slidesItem(job), mcqItem(job), linkItem(job)];
    } else {
      primary = <span className="ad-muted">Working…</span>;
    }
    return (
      <div className="ad-actions">
        {primary}
        <RowMenu label={`More actions for ${chapterName(job)}`} items={menu} />
      </div>
    );
  };

  const statusCell = (job, badge) => (
    <>
      <StatusPill active on={badge.label} tone={badge.tone} />
      {typeof badge.progress === 'number' ? (
        <div className="ad-progress" aria-label={`${badge.progress}% done`}>
          <span className="ad-progress-bar"><i style={{ width: `${badge.progress}%` }} /></span>
          <small>{badge.progress}%</small>
        </div>
      ) : null}
      {badge.error ? (() => {
        const { summary, detail } = summarizeEduVideoError(badge.error);
        const full = detail && detail !== summary ? detail : '';
        const expanded = openErrorId === job.job_id;
        return (
          <div className="ad-job-err edu-video-error">
            <span id={`err-${job.job_id}`}>{expanded && full ? full : summary}</span>
            {full ? (
              <button
                type="button"
                className="ad-err-toggle"
                aria-expanded={expanded}
                aria-controls={`err-${job.job_id}`}
                onClick={() => setOpenErrorId(expanded ? null : job.job_id)}
              >
                {expanded ? 'Hide technical details' : 'Show technical details'}
              </button>
            ) : null}
          </div>
        );
      })() : null}
      {badge.note ? <div className="ad-muted sa-job-note">{badge.note}</div> : null}
    </>
  );

  const listToolbar = (
    <>
      <SearchBox
        placeholder="Search chapter or file"
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
      />
      {platformScope ? (
        <QuirriSelect
          ariaLabel="Filter by college"
          value={filters.college}
          onChange={(e) => setFilters({ college: e.target.value, dept: '', prog: '', page: '1' })}
          placeholder={collegeLoading ? 'Loading colleges…' : 'All colleges'}
          options={[{ value: '', label: 'All colleges' }, ...collegeOptions]}
        />
      ) : null}
      {!platformScope || filters.college ? (
        <QuirriSelect
          ariaLabel="Filter by department"
          value={filters.dept}
          onChange={(e) => setFilters({ dept: e.target.value, page: '1' })}
          placeholder="All departments"
          options={[
            { value: '', label: 'All departments' },
            ...filterDepartments.map((d) => ({ value: String(d.id), label: d.name || d.code || String(d.id) })),
          ]}
        />
      ) : null}
      {programmeNames.length || jobs.some((j) => !j.chapter_id) ? (
        <QuirriSelect
          ariaLabel="Filter by programme"
          value={filters.prog}
          onChange={(e) => setFilters({ prog: e.target.value, page: '1' })}
          placeholder="All programmes"
          options={[
            { value: '', label: 'All programmes' },
            ...programmeNames.map((n) => ({ value: n, label: n })),
            { value: '__none', label: 'Not linked to a chapter' },
          ]}
        />
      ) : null}
      {hasFilters ? (
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>
      ) : null}
      <div className="cs-seg-row">
        <SegTabs
          label="Filter by status"
          options={STATUS_TABS}
          value={filters.stage}
          onChange={(v) => setFilters({ stage: v, page: '1' })}
        />
      </div>
    </>
  );

  const scopeNote = platformScope
    ? (filterCollegeName || 'All colleges')
    : null;

  const tabs = [
    { value: listTab, label: platformScope ? 'Library' : 'Chapters', count: jobsReady ? countLabel(jobs.length) : null },
    { value: 'upload', label: 'Upload' },
    {
      value: feedbackTab,
      label: platformScope ? 'Review feedback' : 'Change requests',
      count: jobsReady && feedbackItems.length ? countLabel(feedbackItems.length) : null,
    },
  ];

  return (
    <ModulePage className="ad-page cs-page">
      <ModuleHead
        chips={scopeNote ? <HeadChip icon="building">{scopeNote}</HeadChip> : null}
        actions={tab !== 'upload' ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setTab('upload')}>
            <Icon name="upload" size={16} /> Upload chapter
          </button>
        ) : null}
      />

      <TabNav tabs={tabs} value={tab} onChange={setTab} label="Content sections" idBase="cs" />

      <TabPanel value={listTab} current={tab} idBase="cs">
        {platformScope ? (
          <Panel
            title="Where chapters are"
            sub={filterCollegeName ? `${filterCollegeName} · every uploaded chapter` : 'Every uploaded chapter on the platform'}
            action={jobsReady ? (
              <div className="mdc-chip"><small>Total chapters</small><b>{(jobs.length || 0).toLocaleString('en-IN')}</b></div>
            ) : null}
          >
            {jobsReady ? (
              <ModernDonut
                title="Chapters by stage"
                unit="Chapters"
                empty="No chapters uploaded yet."
                parts={[
                  // Stage is status, not category data: grey while generating, red for failed (modern-cards-plan).
                  { key: 'generating', label: STAGE_LABEL.generating, value: stageCounts.generating || 0, tone: 'neutral' },
                  { key: 'completed', label: STAGE_LABEL.completed, value: stageCounts.completed || 0, tone: 'info' },
                  { key: 'awaiting_approval', label: STAGE_LABEL.awaiting_approval, value: stageCounts.awaiting_approval || 0, tone: 'warn' },
                  { key: 'published', label: STAGE_LABEL.published, value: stageCounts.published || 0, tone: 'good' },
                  { key: 'failed', label: STAGE_LABEL.failed, value: (stageCounts.failed || 0) + (stageCounts.stalled || 0), tone: 'bad' },
                ]}
              />
            ) : <p className="dv-empty">Loading…</p>}
          </Panel>
        ) : (
          <KpiRow
            label="Content summary"
            items={[
              { icon: 'clock', label: STAGE_LABEL.generating, value: jobsReady ? countLabel(stageCounts.generating || 0) : null, sub: 'Updates on its own' },
              {
                icon: 'play',
                label: STAGE_LABEL.completed,
                value: jobsReady ? countLabel(stageCounts.completed || 0) : null,
                sub: 'Preview, then send to the HOD',
                tone: stageCounts.completed ? 'focus' : undefined,
              },
              { icon: 'send', label: STAGE_LABEL.awaiting_approval, value: jobsReady ? countLabel(stageCounts.awaiting_approval || 0) : null, sub: 'Department review' },
              { icon: 'tick', label: STAGE_LABEL.published, value: jobsReady ? countLabel(stageCounts.published || 0) : null, sub: 'Live for students' },
            ]}
          />
        )}

        <Panel
          title={platformScope ? 'Library' : 'Chapters'}
          sub={hasFilters
            ? `${countLabel(filteredJobs.length)} of ${countLabel(jobs.length)} chapters match`
            : 'Every uploaded chapter and where it is in review'}
          toolbar={listToolbar}
          bodyClassName={null}
        >
          {jobsError ? (
            <div className="sp-panel-b">
              <SectionState
                tone="err"
                title="Could not load chapters"
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
            <div className="sp-panel-b"><SectionState title="Loading chapters…" /></div>
          ) : null}

          {!jobsLoading && !jobsError && !jobs.length ? (
            <div className="sp-panel-b">
              <SectionState
                title={hasFilters ? 'No chapters match these filters' : 'No chapters yet'}
                action={hasFilters ? (
                  <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>
                ) : null}
              >
                {hasFilters ? 'Try a different search or department.' : 'Uploaded chapters show here with their generation and review status.'}
              </SectionState>
            </div>
          ) : null}

          {!jobsLoading && jobs.length && !filteredJobs.length ? (
            <div className="sp-panel-b">
              <SectionState
                title="No chapters match these filters"
                action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button>}
              >
                Try a different status or programme.
              </SectionState>
            </div>
          ) : null}

          {pageJobs.length ? (
            <>
              <div className="sp-table-wrap">
                <table className="sp-table un-table ad-jobs ad-stack cs-jobs">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>{platformScope ? 'College › Department' : 'Department › Subject'}</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th className="ad-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageJobs.map((job) => {
                      const badge = statusBadge(job);
                      const where = platformScope
                        ? [collegeNameOf(job), job.department_name].filter(Boolean).join(' › ')
                        : [job.department_name, job.subject_name].filter(Boolean).join(' › ');
                      return (
                        <tr key={job.job_id}>
                          <td>
                            <div className="pm-person">
                              <span className="ad-file-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                              <div>
                                <b>{chapterName(job)}</b>
                                {job.chapter_title && job.source_filename ? <small>{job.source_filename}</small> : null}
                              </div>
                            </div>
                          </td>
                          <td data-label={platformScope ? 'College' : 'Department'}>
                            <div className="cs-where">
                              <span>{where || '—'}</span>
                              <small className={job.chapter_id ? '' : 'is-muted'}>
                                {job.chapter_path || 'Not linked to a chapter'}
                              </small>
                            </div>
                          </td>
                          <td data-label="Status" className="cs-status">{statusCell(job, badge)}</td>
                          <td data-label="Updated" className="cs-date">{shortDate(job.updated_at || job.created_at)}</td>
                          <td>{rowActions(job, badge.filterKey)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager
                page={page}
                pageSize={PAGE_SIZE}
                total={filteredJobs.length}
                shown={pageJobs.length}
                onPage={(p) => setFilters({ page: String(p) })}
                noun="chapters"
              />
            </>
          ) : null}
        </Panel>
      </TabPanel>

      <TabPanel value="upload" current={tab} idBase="cs">
        <Panel
          title="New chapter upload"
          sub={platformScope
            ? 'Choose a college and department, name the chapter and add the source material.'
            : 'Choose a department, name the chapter and add the source material.'}
          className="ad-upload"
        >
          <ol className="cs-steps" aria-label="How generation works">
            <li><span className="pm-step-n">1</span><div><b>Upload</b><small>The video is drafted and generated for you.</small></div></li>
            <li><span className="pm-step-n">2</span><div><b>Preview</b><small>When it reads Ready to send, check the video and slides.</small></div></li>
            <li><span className="pm-step-n">3</span><div><b>Send to HOD</b><small>Once the HOD approves, students can watch it.</small></div></li>
          </ol>

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
              Generation runs in the background. Follow it under {platformScope ? 'Library' : 'Chapters'}.
            </p>
            <button
              type="button"
              className="sd-btn sd-btn--amber"
              disabled={!canSubmit}
              onClick={handleUpload}
              aria-label="Upload and generate"
              onMouseEnter={(e) => {
                if (!canSubmit) show(e, 'Select a department, chapter title, and valid documents first', 'top');
              }}
              onMouseLeave={hide}
              onFocus={(e) => {
                if (!canSubmit) show(e, 'Select a department, chapter title, and valid documents first', 'top');
              }}
              onBlur={hide}
            >
              <Icon name="upload" size={16} />
              {uploading ? 'Uploading…' : 'Upload and generate'}
            </button>
          </div>
        </Panel>
      </TabPanel>

      <TabPanel value={feedbackTab} current={tab} idBase="cs">
        <Panel
          title={platformScope ? 'Review feedback' : 'Change requests'}
          sub="The HOD edited slides and sent the chapter back. Review the edits and regenerate, or dismiss."
          bodyClassName={null}
        >
          {jobsLoading && !jobs.length ? (
            <div className="sp-panel-b"><SectionState title="Loading change requests…" /></div>
          ) : null}
          {jobsError ? (
            <div className="sp-panel-b">
              <SectionState tone="err" title="Could not load change requests">{apiErrorMessage(jobsError, 'Please try again.')}</SectionState>
            </div>
          ) : null}
          {jobsReady && !jobsError && !feedbackItems.length ? (
            <div className="sp-panel-b">
              <div className="ad-empty">
                <span className="ad-empty-ic" aria-hidden="true"><Icon name="chat" size={20} /></span>
                <div>
                  <b>No change requests</b>
                  <small>When the HOD sends slide edits back, the chapter shows here so you can regenerate it.</small>
                </div>
              </div>
            </div>
          ) : null}
          {feedbackItems.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th>{platformScope ? 'College › Department' : 'Department'}</th>
                    <th>Received</th>
                    <th className="ad-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackItems.map((item) => (
                    <tr key={item.job_id}>
                      <td>
                        <div className="pm-person">
                          <span className="ad-file-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                          <div>
                            <b>{chapterName(item)}</b>
                            <small>{item.changes_requested_by ? `From ${item.changes_requested_by}` : (item.source_filename || '')}</small>
                            {item.change_note ? <small className="ad-feedback-note">“{item.change_note}”</small> : null}
                          </div>
                        </div>
                      </td>
                      <td data-label="Department">
                        {(platformScope
                          ? [collegeNameOf(item), item.department_name].filter(Boolean).join(' › ')
                          : item.department_name) || '—'}
                      </td>
                      <td data-label="Received">
                        {item.changes_requested_at
                          ? new Date(item.changes_requested_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
                          }).replace('Sept', 'Sep')
                          : '—'}
                      </td>
                      <td>
                        <div className="ad-actions">
                          <button
                            type="button"
                            className="sd-btn sd-btn--ghost sd-btn--sm"
                            disabled={dismissingPendingId === item.job_id}
                            onClick={() => dismissingPendingId !== item.job_id && dismissPending(item.job_id)}
                          >
                            {dismissingPendingId === item.job_id ? 'Dismissing…' : 'Dismiss'}
                          </button>
                          <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setHistoryJob(item)}>
                            <Icon name="clock" size={14} /> History
                          </button>
                          <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => openFeedbackEdit(item)}>
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
        </Panel>
      </TabPanel>

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

      <QuirriModal
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        title={confirmRemove ? `Remove ${chapterName(confirmRemove)}?` : 'Remove chapter?'}
        crumb={confirmRemove ? [platformScope ? collegeNameOf(confirmRemove) : null, confirmRemove.department_name].filter(Boolean).join(' · ') || undefined : undefined}
        initialFocus=".modal-f .sd-btn--ghost"
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
            <div className="right">
              <button
                type="button"
                className="sd-btn sd-btn--danger"
                disabled={Boolean(confirmRemove && removingId === confirmRemove.job_id)}
                onClick={() => confirmRemove && removeJob(confirmRemove)}
              >
                <Icon name="trash" size={16} /> Remove chapter
              </button>
            </div>
          </>
        )}
      >
        {confirmRemove ? (
          confirmRemove.published_at ? (
            <ConfirmNote danger icon="alert" title="Students lose access to this chapter">
              This chapter is published. Removing it takes the video and its quiz away from students
              straight away, and it cannot be undone.
            </ConfirmNote>
          ) : confirmRemove.sent_to_hod_at ? (
            <ConfirmNote danger icon="alert" title="The review stops">
              The HOD is reviewing this chapter. Removing it ends that review and deletes
              the video. This cannot be undone.
            </ConfirmNote>
          ) : (
            <ConfirmNote danger icon="trash" title="The video and its slides are deleted">
              You can upload the chapter again at any time. This cannot be undone.
            </ConfirmNote>
          )
        ) : null}
      </QuirriModal>

      <QuirriModal
        open={Boolean(confirmMcq)}
        onClose={() => setConfirmMcq(null)}
        title="Replace this chapter’s questions?"
        crumb={confirmMcq ? chapterName(confirmMcq.job) : undefined}
        initialFocus=".modal-f .sd-btn--ghost"
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmMcq(null)}>Keep current questions</button>
            <div className="right">
              <button
                type="button"
                className="sd-btn sd-btn--teal"
                disabled={generateRetry.disabled}
                onClick={() => confirmMcq && generateMcq(confirmMcq.job.job_id)}
              >
                <Icon name="spark" size={16} /> {generateRetry.disabled ? `Wait ${generateRetry.seconds}s` : 'Generate new questions'}
              </button>
            </div>
          </>
        )}
      >
        {confirmMcq?.state === 'approved' ? (
          <ConfirmNote danger icon="alert" title="The approved quiz is replaced">
            New questions replace the approved set and the approval is cleared. Students cannot take
            this quiz until the HOD approves the new set.
          </ConfirmNote>
        ) : (
          <ConfirmNote icon="refresh" title="The current questions are replaced">
            This chapter already has a question set waiting for approval. Generating again replaces it.
          </ConfirmNote>
        )}
      </QuirriModal>

      <TipLayer />
    </ModulePage>
  );
}

/** Tabs and filters read the URL, so the studio renders inside a Suspense boundary. */
export default function EduVideoContentStudio({ platformScope = false } = {}) {
  return (
    <Suspense fallback={<SectionState title="Loading content…" />}>
      <ContentStudio platformScope={platformScope} />
    </Suspense>
  );
}
