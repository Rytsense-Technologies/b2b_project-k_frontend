'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import EduVideoPlanEditor from '@/components/shared/EduVideoPlanEditor';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  Panel,
  IconButton,
  Icon,
  SectionState,
  SearchBox,
  countLabel,
} from '@/components/shared/module-ui';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { eduVideoApi, JOB_STATUS, computeJobProgress, summarizeEduVideoError } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';

const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 20000;

const canPreview = (job) => job?.status === JOB_STATUS.DONE && Boolean(job?.output_path);

function isJobGenerating(job) {
  const s = job?.status;
  return Boolean(s) && s !== JOB_STATUS.DONE && s !== JOB_STATUS.FAILED;
}

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
  if (job.status === JOB_STATUS.FAILED) return { label: 'Failed', tone: 'err', progress: null, error: job.error };
  if (!canPreview(job)) {
    return {
      label: job.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
      tone: 'teal', progress: computeJobProgress(job), error: null,
    };
  }
  return { label: 'Rendered', tone: 'teal', progress: null, error: null };
}

/** 5 Oct 2026 · 9:00 am */
function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${date} · ${time}`;
}

const deptKey = (job) => job?.department_id || job?.department_name || '';

const VIEW_TABS = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Awaiting review' },
  { value: 'progress', label: 'In progress' },
  { value: 'published', label: 'Published' },
];

/** One chapter row: icon tile · title + meta · status · actions. */
function ChapterRow({ icon = 'video', iconTone = '', title, meta, status, actions }) {
  return (
    <li className="fa-row">
      <span className={`sp-row-ic${iconTone ? ` sp-row-ic--${iconTone}` : ''}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="fa-row-main">
        <b>{title}</b>
        <div className="sp-row-meta">{meta}</div>
      </div>
      {status ? <div className="fa-row-status">{status}</div> : null}
      {actions ? <div className="fa-row-actions">{actions}</div> : null}
    </li>
  );
}

function RowMeta({ job, when, whenLabel }) {
  return (
    <>
      {job.source_filename ? (
        <span className="sd-meta-i"><Icon name="doc" size={14} /> {job.source_filename}</span>
      ) : null}
      <span className="sd-meta-i"><Icon name="building" size={14} /> {job.department_name || 'No department'}</span>
      {when ? (
        <span className="sd-meta-i"><Icon name="clock" size={14} /> {whenLabel} {formatWhen(when)}</span>
      ) : null}
    </>
  );
}

export default function FacultyVideosPage() {
  const [publishingId, setPublishingId] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [view, setView] = useState('all');
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

  // Live-refresh without flipping loading (that was re-rendering the page
  // every poll). Faster while generation is active; slower when idle.
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

  /* ---- client-side filters over the jobs already loaded ---- */
  const departments = useMemo(() => {
    const seen = new Map();
    jobs.forEach((j) => {
      const key = deptKey(j);
      if (key && !seen.has(key)) seen.set(key, j.department_name || 'Department');
    });
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [jobs]);

  const needle = search.trim().toLowerCase();
  const matches = (j) => {
    if (dept && deptKey(j) !== dept) return false;
    if (!needle) return true;
    return [j.chapter_title, j.source_filename, j.department_name]
      .some((v) => String(v || '').toLowerCase().includes(needle));
  };
  const shownReview = reviewQueue.filter(matches);
  const shownProgress = inProgress.filter(matches);
  const shownPublished = published.filter(matches);
  const filtering = Boolean(needle || dept);

  const showReview = view === 'all' || view === 'review';
  const showProgress = (view === 'all' && inProgress.length > 0) || view === 'progress';
  const showPublished = view === 'all' || view === 'published';

  const ready = (!jobsLoading || jobs.length > 0) && !(jobsError && !jobs.length);
  const kpi = (n) => (ready && !jobsError ? countLabel(n) : null);
  const nextUp = reviewQueue[0] || null;

  const emptyNote = (base) => (filtering ? 'No chapters match these filters. Try a different name or department.' : base);

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="video"
        eyebrow="Content review"
        title="Video review"
        lede="Chapters your College Admin sends land here. Preview each one, fix slides if needed, then publish. Nothing reaches students until you do."
        chips={(
          <>
            <span>Generated</span>
            <Icon name="chev" size={14} />
            <span>Sent by College Admin</span>
            <Icon name="chev" size={14} />
            <span className="is-on">Your review</span>
            <Icon name="chev" size={14} />
            <span>Published</span>
          </>
        )}
        actions={nextUp ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setPreviewJob(nextUp)}>
            <Icon name="play" size={16} /> Preview next chapter
          </button>
        ) : null}
      />

      <KpiRow
        label="Video review summary"
        items={[
          { icon: 'clock', label: 'Awaiting your review', value: kpi(reviewQueue.length), sub: 'Sent by your College Admin' },
          { icon: 'refresh', label: 'In progress', value: kpi(inProgress.length), sub: 'Generating or not yet sent' },
          { icon: 'tick', label: 'Published', value: kpi(published.length), sub: 'Live for students' },
          { icon: 'layers', label: 'Departments', value: kpi(departments.length), sub: 'With chapters in your scope' },
        ]}
      />

      <FilterBar label="Filter chapters">
        <SearchBox
          placeholder="Search chapter, file or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {departments.length > 1 ? (
          <div className="fa-filter-select">
            <QuirriSelect
              ariaLabel="Filter by department"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="All departments"
              options={[{ value: '', label: 'All departments' }, ...departments]}
            />
          </div>
        ) : null}
        <SegTabs
          label="Show"
          value={view}
          onChange={setView}
          options={VIEW_TABS.map((t) => ({
            ...t,
            count: !ready ? null : t.value === 'review' ? reviewQueue.length
              : t.value === 'progress' ? inProgress.length
                : t.value === 'published' ? published.length
                  : null,
          }))}
        />
      </FilterBar>

      {jobsError ? (
        <SectionState
          tone="err"
          title="Could not load videos"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reloadJobs().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(jobsError, 'Please try again.')}
        </SectionState>
      ) : null}

      {jobsLoading && !jobs.length ? <SectionState title="Loading chapters…" /> : null}

      {ready && showReview ? (
        <Panel
          title="Awaiting your review"
          sub="Preview a chapter and edit slides if needed (Save & send to admin), then publish — or send edits back for the College Admin to regenerate."
          action={<span className="sp-pill sp-pill--low">{countLabel(shownReview.length)} to review</span>}
          bodyClassName=""
        >
          {!shownReview.length ? (
            <div className="sp-panel-b">
              <SectionState title={filtering ? 'No matches' : 'Nothing to review'}>
                {emptyNote('Chapters your College Admin sends will appear here.')}
              </SectionState>
            </div>
          ) : (
            <ul className="fa-rows">
              {shownReview.map((job) => (
                <ChapterRow
                  key={job.job_id}
                  title={job.chapter_title || '—'}
                  meta={<RowMeta job={job} when={job.sent_to_hod_at} whenLabel="Sent" />}
                  status={<span className="sp-pill sp-pill--low"><i className="un-dot" aria-hidden="true" />Awaiting review</span>}
                  actions={(
                    <>
                      <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setPreviewJob(job)}>
                        <Icon name="eye" size={16} /> Preview
                      </button>
                      <IconButton icon="edit" label={`Edit slides for ${job.chapter_title || 'this chapter'}`} onClick={() => setEditJob(job)} />
                      <button
                        type="button"
                        className="sd-btn sd-btn--teal sd-btn--sm"
                        onClick={() => publishingId !== job.job_id && publish(job.job_id)}
                        disabled={publishingId === job.job_id}
                      >
                        <Icon name="send" size={16} />
                        {publishingId === job.job_id ? 'Publishing…' : 'Publish to students'}
                      </button>
                    </>
                  )}
                />
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      {ready && showProgress ? (
        <Panel
          title="In progress"
          sub="Still drafting or rendering at the College Admin's side. Nothing to do here yet."
          bodyClassName=""
        >
          {!shownProgress.length ? (
            <div className="sp-panel-b">
              <SectionState title={filtering ? 'No matches' : 'Nothing in progress'}>
                {emptyNote('Chapters being generated will show here until they are ready.')}
              </SectionState>
            </div>
          ) : (
            <ul className="fa-rows">
              {shownProgress.map((job) => {
                const badge = statusBadge(job);
                const err = badge.error ? summarizeEduVideoError(badge.error) : null;
                return (
                  <ChapterRow
                    key={job.job_id}
                    icon={badge.tone === 'err' ? 'alert' : 'refresh'}
                    iconTone="muted"
                    title={job.chapter_title || '—'}
                    meta={(
                      <>
                        <RowMeta job={job} />
                        {err ? (
                          <span
                            className="fa-err"
                            onMouseEnter={(e) => {
                              if (err.detail) show(e, err.detail, 'top');
                            }}
                            onMouseLeave={hide}
                          >
                            {err.summary}
                          </span>
                        ) : null}
                      </>
                    )}
                    status={(
                      <div className="fa-status-stack">
                        <span className={`sp-pill sp-pill--${badge.tone}`}>
                          <i className="un-dot" aria-hidden="true" />
                          {badge.label}
                        </span>
                        {typeof badge.progress === 'number' ? (
                          <span className="fa-progress" aria-label={`${badge.progress}% done`}>
                            <span className="fa-progress-bar"><i style={{ width: `${badge.progress}%` }} /></span>
                            <small>{badge.progress}%</small>
                          </span>
                        ) : null}
                      </div>
                    )}
                  />
                );
              })}
            </ul>
          )}
        </Panel>
      ) : null}

      {ready && showPublished ? (
        <Panel
          title="Published"
          sub="Live for students in this college."
          action={<span className="sp-pill sp-pill--good">{countLabel(shownPublished.length)} live</span>}
          bodyClassName=""
        >
          {!shownPublished.length ? (
            <div className="sp-panel-b">
              <SectionState title={filtering ? 'No matches' : 'Nothing published yet'}>
                {emptyNote('Chapters you publish will appear here.')}
              </SectionState>
            </div>
          ) : (
            <ul className="fa-rows">
              {shownPublished.map((job) => (
                <ChapterRow
                  key={job.job_id}
                  iconTone="good"
                  title={job.chapter_title || '—'}
                  meta={<RowMeta job={job} when={job.published_at} whenLabel="Published" />}
                  status={<span className="sp-pill sp-pill--good"><i className="un-dot" aria-hidden="true" />Published</span>}
                  actions={(
                    <>
                      <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setPreviewJob(job)}>
                        <Icon name="eye" size={16} /> Preview
                      </button>
                      <IconButton icon="edit" label={`Edit slides for ${job.chapter_title || 'this chapter'}`} onClick={() => setEditJob(job)} />
                      <a
                        className="un-icon-btn"
                        href={eduVideoApi.getDownloadUrl(job.job_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Download ${job.chapter_title || 'video'}`}
                      >
                        <Icon name="download" size={16} />
                      </a>
                    </>
                  )}
                />
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

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
    </ModulePage>
  );
}
