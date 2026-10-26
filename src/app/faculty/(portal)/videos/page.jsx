'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import EduVideoPlanEditor from '@/components/shared/EduVideoPlanEditor';
import ReviewHistoryModal from '@/components/shared/ReviewHistoryModal';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  ModulePage,
  ModuleHead,
  TabNav,
  TabPanel,
  Panel,
  Pager,
  IconButton,
  Icon,
  SectionState,
  SearchBox,
  ConfirmNote,
  countLabel,
} from '@/components/shared/module-ui';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { eduVideoApi, JOB_STATUS, computeJobProgress, summarizeEduVideoError } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import {
  scopeChip, ReadOnlyNote, SubjectTag, ageLabel, useFacultySubjects, useSubjectColor,
} from '@/components/faculty/facultyKit';

const POLL_ACTIVE_MS = 4000;
const POLL_IDLE_MS = 20000;
const PAGE_SIZE = 20;     // rows per tab page

const canPreview = (job) => job?.status === JOB_STATUS.DONE && Boolean(job?.output_path);

function isJobGenerating(job) {
  const s = job?.status;
  return Boolean(s) && s !== JOB_STATUS.DONE && s !== JOB_STATUS.FAILED;
}

function progressBadge(job) {
  if (job.status === JOB_STATUS.FAILED) return { label: 'Failed', tone: 'err', progress: null, error: job.error };
  if (!canPreview(job)) {
    return {
      label: job.status === JOB_STATUS.RENDERING ? 'Rendering' : 'Generating',
      tone: 'teal', progress: computeJobProgress(job), error: null,
    };
  }
  return { label: 'Not sent yet', tone: 'off', progress: null, error: null };
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

// Tab → GET /edu_video/jobs review_state (definitions: backend job_tracker.list_jobs).
const REVIEW_STATE = { review: 'to_review', changes: 'changes_requested', progress: 'in_progress', published: 'published' };

const TABS = [
  { value: 'review', label: 'To review' },
  { value: 'changes', label: 'Changes requested' },
  { value: 'progress', label: 'In progress' },
  { value: 'published', label: 'Published' },
];

/** One chapter row: icon tile · title + meta · status · actions. */
function ChapterRow({ icon = 'video', iconTone = '', title, meta, status, actions, children }) {
  return (
    <li className="fa-row">
      <span className={`sp-row-ic${iconTone ? ` sp-row-ic--${iconTone}` : ''}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="fa-row-main">
        <b>{title}</b>
        <div className="sp-row-meta">{meta}</div>
        {children}
      </div>
      {status ? <div className="fa-row-status">{status}</div> : null}
      {actions ? <div className="fa-row-actions">{actions}</div> : null}
    </li>
  );
}

function RowMeta({ job, when, whenLabel, color }) {
  const age = when && whenLabel === 'Sent' ? ageLabel(when) : null;
  return (
    <>
      {job.subject_name ? <SubjectTag name={job.subject_name} color={color} /> : (
        <span className="sd-meta-i"><Icon name="book" size={14} /> Not linked to a subject</span>
      )}
      {job.chapter_path ? <span className="sd-meta-i">{job.chapter_path}</span> : null}
      {when ? (
        <span className="sd-meta-i">
          <Icon name="clock" size={14} /> {whenLabel} {formatWhen(when)}
          {age && age !== 'today' ? ` · ${age} ago` : ''}
        </span>
      ) : null}
    </>
  );
}

/** Pill for a chapter the viewer may open but not act on (staff_scope). */
function ViewOnly() {
  return <span className="sp-pill sp-pill--off"><Icon name="lock" size={12} /> View only</span>;
}

export default function FacultyVideosPage() {
  const { scope } = useFacultyScope();
  const colorFor = useSubjectColor();
  const subjects = useFacultySubjects();
  const [tab, setTab] = useTabParam(TABS.map((t) => t.value), 'review');
  const [url, setUrl] = useUrlState({ q: '', subject: '', job: '' });
  const [search, setSearch] = useState(url.q);
  const [page, setPage] = useState(1);
  const [publishingId, setPublishingId] = useState(null);
  const [confirmJob, setConfirmJob] = useState(null);
  const [previewJob, setPreviewJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [historyJob, setHistoryJob] = useState(null);
  const { show, hide, TipLayer } = useQuirriTip();

  // Search box writes to ?q= after a short pause.
  useEffect(() => {
    const t = setTimeout(() => { if (search !== url.q) setUrl({ q: search }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => { setPage(1); }, [tab, url.q, url.subject]);

  const filters = { subjectId: url.subject || undefined, q: url.q.trim() || undefined };

  // Server paging per tab (GET /edu_video/jobs?review_state=…&subject_id=…&q=…&page=…); to_review is oldest-sent first.
  // Tag each response with its request so a tab switch never shows the previous tab's rows with this tab's actions.
  const listKey = `${tab}|${url.subject}|${url.q}|${page}`;
  const list = useAsyncResource(
    () => eduVideoApi.listJobs({ ...filters, reviewState: REVIEW_STATE[tab], page, pageSize: PAGE_SIZE })
      .then((res) => ({ key: listKey, res })),
    [tab, url.subject, url.q, page],
  );
  const listData = list.data?.key === listKey ? list.data.res : null;
  // Tab counts: one page_size=1 request per state (also gives "Review next").
  const counts = useAsyncResource(
    () => Promise.all(TABS.map((t) => eduVideoApi.listJobs({ ...filters, reviewState: REVIEW_STATE[t.value], page: 1, pageSize: 1 })))
      .then((res) => Object.fromEntries(TABS.map((t, i) => [t.value, res[i]]))),
    [url.subject, url.q],
  );
  const rows = useMemo(() => asList(listData, []), [listData]);
  const total = Number(listData?.total) || 0;
  const reloadAll = (opts) => Promise.all([list.reload(opts), counts.reload(opts)]);

  // Deep link (dashboard, subjects, notifications): /faculty/videos?job=<id> opens its preview —
  // only once the job is confirmed to have a finished video; otherwise say so instead of an empty player.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !url.job) return;
    deepLinked.current = true;
    const id = url.job;
    eduVideoApi.getStatus(id)
      .then((st) => {
        if (canPreview(st)) setPreviewJob({ job_id: id });
        else {
          toast.error('This chapter has no video to preview yet.');
          setUrl({ job: '' });
        }
      })
      .catch(() => {
        toast.error('That chapter could not be found. It may have been removed.');
        setUrl({ job: '' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url.job]);

  const closePreview = () => {
    setPreviewJob(null);
    if (url.job) setUrl({ job: '' });
  };

  // Live refresh without flipping loading. Faster while generation is active; slower when idle.
  const pollInFlight = useRef(false);
  const reloadRef = useRef(reloadAll);
  const rowsRef = useRef(rows);
  reloadRef.current = reloadAll;
  rowsRef.current = rows;

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
      if (pollInFlight.current) {
        schedule(POLL_ACTIVE_MS);
        return;
      }
      pollInFlight.current = true;
      reloadRef.current({ silent: true })
        .catch(() => {})
        .finally(() => {
          pollInFlight.current = false;
          if (!cancelled) schedule(rowsRef.current.some(isJobGenerating) ? POLL_ACTIVE_MS : POLL_IDLE_MS);
        });
    };
    schedule(POLL_IDLE_MS);
    const onVis = () => {
      if (!document.hidden && !pollInFlight.current) schedule(250);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const publish = async (job) => {
    setPublishingId(job.job_id);
    try {
      // POST /jobs/{id}/publish — makes the chapter visible to students. 400s unless sent and unpublished.
      await eduVideoApi.publish(job.job_id);
      toast.success('Published. Students can now watch this chapter.');
      setConfirmJob(null);
      await reloadAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not publish this chapter.'));
    } finally {
      setPublishingId(null);
    }
  };

  const subjectOptions = useMemo(
    () => (subjects.data?.items || []).map((s) => ({ value: s.id, label: s.code ? `${s.name} · ${s.code}` : s.name })),
    [subjects.data],
  );

  const ready = Boolean(listData) && !list.error;
  const filtering = Boolean(url.q || url.subject);
  const readOnly = Boolean(scope?.read_only);
  const nextUp = asList(counts.data?.review, [])[0] || null;
  const where = !scope ? 'your scope' : scope.is_hod ? 'your department' : scope.subject_limited ? 'your subjects' : 'your department';
  const clear = () => { setSearch(''); setUrl({ q: '', subject: '' }); };

  const panelMeta = {
    review: { title: 'To review', sub: 'Preview each chapter, edit slides and send edits back if needed, then publish.', empty: 'Nothing to review', note: 'Chapters your College Admin sends will appear here.' },
    changes: { title: 'Changes requested', sub: 'Sent back to the College Admin. They regenerate the video, then it returns to To review.', empty: 'No open change requests', note: 'When you send slide edits back, the chapter waits here.' },
    progress: { title: 'In progress', sub: 'Being generated, or ready but not yet sent by the College Admin. Nothing to do yet.', empty: 'Nothing in progress', note: 'Chapters being generated show here until they are ready.' },
    published: { title: 'Published', sub: `Live for students in ${where}.`, empty: 'Nothing published yet', note: 'Chapters you publish will appear here.' },
  }[tab];

  const historyBtn = (job) => (
    <IconButton icon="clock" label={`Review history of ${job.chapter_title || 'this chapter'}`} onClick={() => setHistoryJob(job)} />
  );
  const previewBtn = (job) => (
    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setPreviewJob(job)}>
      <Icon name="eye" size={16} /> Preview
    </button>
  );

  const renderRow = (job) => {
    const color = colorFor(job.subject_name);
    const state = tab;
    if (state === 'review') {
      return (
        <ChapterRow
          key={job.job_id}
          title={job.chapter_title || '—'}
          meta={<RowMeta job={job} when={job.sent_to_hod_at} whenLabel="Sent" color={color} />}
          status={<span className="sp-pill sp-pill--low"><i className="un-dot" aria-hidden="true" />Awaiting review</span>}
          actions={(
            <>
              {previewBtn(job)}
              {historyBtn(job)}
              {job.can_review === false ? <ViewOnly /> : (
                <>
                  <IconButton icon="edit" label={`Edit slides for ${job.chapter_title || 'this chapter'}`} onClick={() => setEditJob(job)} />
                  <button
                    type="button"
                    className="sd-btn sd-btn--teal sd-btn--sm"
                    onClick={() => setConfirmJob(job)}
                    disabled={publishingId === job.job_id}
                  >
                    <Icon name="send" size={16} /> Publish
                  </button>
                </>
              )}
            </>
          )}
        />
      );
    }
    if (state === 'changes') {
      return (
        <ChapterRow
          key={job.job_id}
          icon="edit"
          title={job.chapter_title || '—'}
          meta={<RowMeta job={job} when={job.sent_to_hod_at} whenLabel="Sent" color={color} />}
          status={<span className="sp-pill sp-pill--teal"><i className="un-dot" aria-hidden="true" />With College Admin</span>}
          actions={<>{previewBtn(job)}{historyBtn(job)}</>}
        >
          <div className="fa-change">
            <small>
              {`Requested${job.changes_requested_by ? ` by ${job.changes_requested_by}` : ''} · ${formatWhen(job.changes_requested_at)}`}
            </small>
            {job.change_note ? <p>{job.change_note}</p> : null}
          </div>
        </ChapterRow>
      );
    }
    if (state === 'published') {
      return (
        <ChapterRow
          key={job.job_id}
          iconTone="good"
          title={job.chapter_title || '—'}
          meta={<RowMeta job={job} when={job.published_at} whenLabel="Published" color={color} />}
          status={<span className="sp-pill sp-pill--good"><i className="un-dot" aria-hidden="true" />Published</span>}
          actions={(
            <>
              {previewBtn(job)}
              {historyBtn(job)}
            </>
          )}
        />
      );
    }
    const badge = progressBadge(job);
    const err = badge.error ? summarizeEduVideoError(badge.error) : null;
    return (
      <ChapterRow
        key={job.job_id}
        icon={badge.tone === 'err' ? 'alert' : 'refresh'}
        iconTone="muted"
        title={job.chapter_title || '—'}
        meta={(
          <>
            <RowMeta job={job} color={color} />
            {err ? (
              <span
                className="fa-err"
                onMouseEnter={(e) => { if (err.detail) show(e, err.detail, 'top'); }}
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
  };

  return (
    <ModulePage className="fa-page">
      <ModuleHead
        chips={scopeChip(scope)}
        actions={nextUp ? (
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setPreviewJob(nextUp)}>
            <Icon name="play" size={16} /> {readOnly || nextUp.can_review === false ? 'Preview next' : 'Review next'}
          </button>
        ) : null}
      />

      <ReadOnlyNote scope={scope} what="chapter videos" />

      <div className="fa-tabs-fit fa-tabs-fit--2x2">
      <TabNav
        label="Video review"
        idBase="fa-videos"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ ...t, count: counts.data ? Number(counts.data[t.value]?.total) || 0 : null }))}
      />
      </div>

      {list.error ? (
        <SectionState
          tone="err"
          title="Could not load videos"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reloadAll().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(list.error, 'Please try again.')}
        </SectionState>
      ) : null}

      <TabPanel value={tab} current={tab} idBase="fa-videos">
        <Panel
          title={panelMeta.title}
          sub={panelMeta.sub}
          bodyClassName=""
          toolbar={(
            <>
              <SearchBox placeholder="Search chapter or file…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {subjectOptions.length > 1 ? (
                <div className="fa-filter-select">
                  <QuirriSelect
                    ariaLabel="Filter by subject"
                    value={url.subject}
                    onChange={(e) => setUrl({ subject: e.target.value })}
                    placeholder={scope?.subject_limited ? 'All my subjects' : 'All subjects'}
                    options={[{ value: '', label: scope?.subject_limited ? 'All my subjects' : 'All subjects' }, ...subjectOptions]}
                  />
                </div>
              ) : null}
              {filtering ? <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clear}>Clear</button> : null}
            </>
          )}
        >
          {!ready && !list.error ? <div className="sp-panel-b"><SectionState title="Loading chapters…" /></div> : null}
          {ready && !rows.length ? (
            <div className="sp-panel-b">
              <SectionState title={filtering ? 'No matches' : panelMeta.empty}>
                {filtering ? 'No chapters match these filters. Try another name or subject.' : panelMeta.note}
              </SectionState>
            </div>
          ) : null}
          {ready && rows.length ? <ul className="fa-rows">{rows.map(renderRow)}</ul> : null}
          <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} noun="chapters" />
        </Panel>
      </TabPanel>

      <QuirriModal
        open={Boolean(confirmJob)}
        onClose={() => { if (!publishingId) setConfirmJob(null); }}
        title="Publish to students?"
        crumb={confirmJob?.chapter_title || undefined}
        busy={Boolean(publishingId)}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmJob(null)} disabled={Boolean(publishingId)}>Cancel</button>
            <div className="right">
              <button
                type="button"
                className="sd-btn sd-btn--amber"
                onClick={() => confirmJob && publish(confirmJob)}
                disabled={Boolean(publishingId)}
              >
                <Icon name="send" size={16} /> {publishingId ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </>
        )}
      >
        <ConfirmNote icon="send" title="Students will see this chapter straight away">
          Students can watch it as soon as it is published. There is no unpublish step, and a published chapter can&apos;t be sent back for changes.
        </ConfirmNote>
      </QuirriModal>

      <VideoPreviewModal
        open={Boolean(previewJob)}
        onClose={closePreview}
        title={previewJob?.chapter_title
          || rows.find((j) => j.job_id === previewJob?.job_id)?.chapter_title
          || asList(counts.data?.review, []).find((j) => j.job_id === previewJob?.job_id)?.chapter_title
          || 'Video preview'}
        src={previewJob ? eduVideoApi.getDownloadUrl(previewJob.job_id) : null}
      />
      <EduVideoPlanEditor
        open={Boolean(editJob)}
        job={editJob}
        mode="reviewer"
        onClose={() => setEditJob(null)}
        onSaved={() => reloadAll()}
      />
      {historyJob ? (
        <ReviewHistoryModal
          job={historyJob}
          canComment={historyJob.can_review !== false}
          onClose={() => setHistoryJob(null)}
        />
      ) : null}
      <TipLayer />
    </ModulePage>
  );
}
