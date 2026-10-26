'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import McqDocumentReview from '@/components/shared/McqDocumentReview';
import {
  ModulePage,
  ModuleHead,
  HeadChip,
  TabNav,
  Panel,
  Icon,
  SectionState,
  SearchBox,
  countLabel,
} from '@/components/shared/module-ui';
import { dataColor } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { eduVideoApi, JOB_STATUS } from '@/lib/api/admin/eduVideo';
import { mcqApi, mcqSetState } from '@/lib/api/mcq';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTabParam, useUrlSearch, useUrlState } from '@/hooks/useUrlState';

/** Tabs by question-set state; the badges are the only counts on the page. */
const TABS = [
  { value: 'awaiting', label: 'Awaiting approval' },
  { value: 'none', label: 'Needs questions' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
];

/** Question-set state → list tag. */
const SET_TAG = {
  none: { cls: 'is-muted', label: 'No questions yet' },
  generating: { cls: 'is-muted', label: 'Generating questions' },
  failed: { cls: 'is-low', label: 'Generation failed' },
  awaiting: { cls: 'is-low', label: 'Awaiting approval' },
  approved: { cls: 'is-good', label: 'Approved' },
};

const NO_SUBJECT = '__none';
const LOOKUP_CONCURRENCY = 4;
const FETCH_PAGE = 100;
const MAX_PAGES = 20;

/** Every job in scope, page by page (GET /edu_video/jobs caps page_size at 100). */
async function fetchAllJobs() {
  const first = await eduVideoApi.listJobs({ page: 1, pageSize: FETCH_PAGE });
  const items = [...asList(first, [])];
  const total = Number(first?.total) || items.length;
  const pages = Math.min(MAX_PAGES, Math.ceil(total / FETCH_PAGE));
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => eduVideoApi.listJobs({ page: i + 2, pageSize: FETCH_PAGE })),
    );
    rest.forEach((r) => items.push(...asList(r, [])));
  }
  const seen = new Set();
  return {
    items: items.filter((j) => (seen.has(j.job_id) ? false : seen.add(j.job_id))),
    total,
    scope: first?.scope,
  };
}

/** The jobs list carries the set state (`mcq_status`); older APIs fall back to per-chapter lookups. */
function stateFromJob(job) {
  const s = job?.mcq_status;
  if (s === undefined) return undefined;
  if (!s || s === 'none') return 'none';
  if (s === 'approved' || job.mcq_approved) return 'approved';
  if (s === 'awaiting_approval' || s === 'awaiting' || s === 'ready') return 'awaiting';
  if (s === 'failed') return 'failed';
  return 'generating';
}

function inTab(tab, s) {
  if (tab === 'none') return s === 'none' || s === 'failed';
  if (tab === 'awaiting') return s === 'awaiting' || s === 'generating';
  if (tab === 'approved') return s === 'approved';
  return true;
}

const subjectKey = (j) => j.subject_name || NO_SUBJECT;

/**
 * HOD / Faculty / College Admin — review generated MCQs for chapters in scope
 * and approve them for students (GET/POST /api/v1/mcq, POST .../approve).
 * The chapter list is whatever /edu_video/jobs returns for the caller (department / subject
 * scope is enforced by the API); each row shows its question-set state.
 * @param {{ notice?: React.ReactNode }} props  notice — optional scope note shown under the tabs.
 */
function McqReview({ notice = null, chips: chipsProp = null, colorFor = null }) {
  const [explicitTab, setTab] = useTabParam(TABS.map((t) => t.value), '');
  const [url, setUrl] = useUrlState({ job: '', subject: '', dept: '', q: '' });
  const [search, setSearch] = useUrlSearch(url.q, (v) => setUrl({ q: v }));
  // Subject colour keyed by subject id (same as every other page); the caller can resolve
  // name → id (faculty pages pass useSubjectColor) while the jobs list carries only the name.
  const subjectColor = (job) => {
    const key = job?.subject_id || job?.subject_name;
    if (!key) return 'var(--neutral-300)';
    return colorFor ? colorFor(key) : dataColor(key);
  };
  // Selection is local (instant) and mirrored to ?job= for deep links.
  const [selectedId, setSelectedId] = useState(url.job);
  const [setStates, setSetStates] = useState({});
  const detailRef = useRef(null);

  const { data, loading, error, reload } = useAsyncResource(() => fetchAllJobs(), []);
  const jobs = useMemo(() => asList(data, []), [data]);
  // HOD / Faculty responses carry a `scope` block; they only ever see one department.
  const scope = data?.scope || null;
  const singleDepartment = Boolean(scope);

  const chapters = useMemo(
    () => jobs
      .filter((j) => j.status === JOB_STATUS.DONE || j.output_path || j.published_at)
      .sort((a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0)
        - (Date.parse(a.updated_at || a.created_at || '') || 0)),
    [jobs],
  );

  // Question-set state per chapter: from the list when present, otherwise looked up a few at a time.
  const lookupRun = useRef(0);
  useEffect(() => {
    const run = lookupRun.current + 1;
    lookupRun.current = run;
    const known = {};
    const missing = [];
    chapters.forEach((j) => {
      const s = stateFromJob(j);
      if (s !== undefined) known[j.job_id] = s;
      else missing.push(j.job_id);
    });
    if (Object.keys(known).length) setSetStates((prev) => ({ ...prev, ...known }));
    if (!missing.length) return undefined;
    let cancelled = false;
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < missing.length) {
        const id = missing[next];
        next += 1;
        let state = 'unknown';
        try {
          // eslint-disable-next-line no-await-in-loop
          state = mcqSetState(await mcqApi.getOrNull(id));
        } catch {
          state = 'unknown';
        }
        if (cancelled || lookupRun.current !== run) return;
        setSetStates((prev) => (prev[id] === state ? prev : { ...prev, [id]: state }));
      }
    };
    Array.from({ length: Math.min(LOOKUP_CONCURRENCY, missing.length) }, worker);
    return () => { cancelled = true; };
  }, [chapters]);

  const onSetStateChange = useCallback((jobId, state) => {
    setSetStates((prev) => (prev[jobId] === state ? prev : { ...prev, [jobId]: state }));
  }, []);

  /* ---- filters over the chapters in scope ---- */
  const stateOf = (j) => setStates[j.job_id];
  const statesKnown = chapters.every((j) => stateOf(j) !== undefined);

  const departments = useMemo(() => {
    const m = new Map();
    chapters.forEach((j) => { if (j.department_id) m.set(String(j.department_id), j.department_name || 'Department'); });
    return [...m.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [chapters]);
  const showDept = !singleDepartment && departments.length > 1;

  const byDept = chapters.filter((j) => !showDept || !url.dept || String(j.department_id) === url.dept);
  const subjects = useMemo(() => {
    const m = new Map();
    byDept.forEach((j) => m.set(subjectKey(j), j.subject_name || 'Not linked to a subject'));
    return [...m.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => (a.value === NO_SUBJECT) - (b.value === NO_SUBJECT) || a.label.localeCompare(b.label));
  }, [byDept]);

  const needle = search.trim().toLowerCase();
  const filtered = byDept.filter((j) => {
    if (url.subject && subjectKey(j) !== url.subject) return false;
    if (!needle) return true;
    return [j.chapter_title, j.source_filename, j.subject_name, j.department_name]
      .some((v) => String(v || '').toLowerCase().includes(needle));
  });
  const counts = filtered.reduce((acc, j) => {
    const s = stateOf(j);
    TABS.forEach((t) => { if (s !== undefined && inTab(t.value, s)) acc[t.value] += 1; });
    return acc;
  }, { awaiting: 0, none: 0, approved: 0, all: 0 });
  // No ?tab=: open "Awaiting approval" when it has work, else the first tab that does.
  const listReady = !loading || jobs.length > 0;
  const tab = explicitTab
    || (!listReady || !statesKnown ? 'awaiting' : (['awaiting', 'none', 'approved'].find((v) => counts[v] > 0) || 'all'));
  const shown = filtered.filter((j) => inTab(tab, stateOf(j)));

  // Group the visible chapters by subject (unlinked chapters last).
  const groups = useMemo(() => {
    const m = new Map();
    shown.forEach((j) => {
      const k = subjectKey(j);
      if (!m.has(k)) m.set(k, { key: k, label: j.subject_name || 'Not linked to a subject', color: subjectColor(j), rows: [] });
      m.get(k).rows.push(j);
    });
    return [...m.values()].sort((a, b) => (a.key === NO_SUBJECT) - (b.key === NO_SUBJECT) || a.label.localeCompare(b.label));
  }, [shown]);
  const ordered = groups.flatMap((g) => g.rows);

  const selected = ordered.find((j) => j.job_id === selectedId) || null;
  const select = (id, { scroll = false } = {}) => {
    setSelectedId(id);
    setUrl({ job: id });
    if (scroll && typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  };

  // The detail pane is never empty on wide screens: open the first chapter in the current view.
  const firstId = ordered[0]?.job_id || '';
  useEffect(() => {
    if (selected || !firstId || !statesKnown) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches) return;
    setSelectedId(firstId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstId, Boolean(selected), statesKnown]);

  const ready = !loading || jobs.length > 0;
  const filtering = Boolean(needle || url.subject || url.dept);
  const tabCount = (v) => (!ready || error || !statesKnown ? null : countLabel(counts[v]));

  const readOnly = Boolean(scope?.read_only);
  const chips = chipsProp || (readOnly
    ? <HeadChip icon="lock" tone="grey">View only</HeadChip>
    : scope?.subject_limited
      ? <HeadChip icon="book">Your subjects</HeadChip>
      : null);

  const toolbar = (
    <>
      <SearchBox placeholder="Search chapter or subject" value={search} onChange={(e) => setSearch(e.target.value)} />
      {showDept ? (
        <QuirriSelect
          ariaLabel="Filter by department"
          value={url.dept}
          onChange={(e) => setUrl({ dept: e.target.value, subject: '' })}
          options={[{ value: '', label: 'All departments' }, ...departments]}
        />
      ) : null}
      {subjects.length > 1 ? (
        <QuirriSelect
          ariaLabel="Filter by subject"
          value={url.subject}
          onChange={(e) => setUrl({ subject: e.target.value })}
          options={[{ value: '', label: 'All subjects' }, ...subjects]}
        />
      ) : null}
    </>
  );

  const emptyCopy = {
    awaiting: 'No question sets are waiting for approval.',
    none: 'Every rendered chapter has a question set.',
    approved: 'No question sets approved yet.',
    all: 'Chapters appear here once their video has finished rendering.',
  };

  return (
    <ModulePage className="fa-page mq-page">
      {chips ? <ModuleHead chips={chips} /> : null}

      <TabNav
        tabs={TABS.map((t) => ({ ...t, count: tabCount(t.value) }))}
        value={tab}
        onChange={setTab}
        label="Question sets"
        idBase="mq"
      />

      {notice}

      {error ? (
        <SectionState
          tone="err"
          title="Could not load chapters"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {error && !jobs.length ? null : (
      <div className={`fa-split mq-split${ordered.length ? '' : ' is-single'}`} role="tabpanel" id={`mq-panel-${tab}`} aria-labelledby={`mq-${tab}`}>
        <Panel
          className="fa-chapters mq-chapters"
          title="Chapters"
          sub={loading && !jobs.length ? 'Loading…' : `${countLabel(shown.length)} ${shown.length === 1 ? 'chapter' : 'chapters'}${filtering ? ' match' : ''}`}
          toolbar={toolbar}
          bodyClassName=""
        >
          {loading && !jobs.length ? (
            <div className="sp-panel-b"><SectionState title="Loading chapters…" /></div>
          ) : null}
          {ready && !error && !chapters.length ? (
            <div className="sp-panel-b">
              <SectionState title="No rendered chapters yet">
                Chapters appear here once their video has finished rendering.
              </SectionState>
            </div>
          ) : null}
          {ready && chapters.length > 0 && !shown.length ? (
            <div className="sp-panel-b">
              <SectionState title={filtering ? 'No matches' : 'Nothing here'}>
                {filtering ? 'Try a different name or subject.' : emptyCopy[tab]}
              </SectionState>
            </div>
          ) : null}
          {groups.length ? (
            <div className="mq-groups">
              {groups.map((g) => (
                <section key={g.key} className="mq-group" aria-label={g.label}>
                  <h4 className="mq-group-h">
                    <i
                      className="mq-dot"
                      style={{ background: g.key === NO_SUBJECT ? 'var(--neutral-300)' : g.color }}
                      aria-hidden="true"
                    />
                    <span>{g.label}</span>
                    <small>{g.rows.length}</small>
                  </h4>
                  <ul className="pm-list">
                    {g.rows.map((job) => {
                      const active = job.job_id === selected?.job_id;
                      const s = stateOf(job);
                      const tag = SET_TAG[s] || { cls: 'is-muted', label: s === 'unknown' ? 'Status unavailable' : 'Checking…' };
                      const n = Number(job.mcq_question_count) || 0;
                      const meta = [
                        showDept ? job.department_name : null,
                        n ? `${n} question${n === 1 ? '' : 's'}` : null,
                        job.can_review === false ? 'View only' : null,
                      ].filter(Boolean).join(' · ');
                      return (
                        <li key={job.job_id}>
                          <button
                            type="button"
                            className="pm-list-btn"
                            aria-current={active ? 'true' : undefined}
                            onClick={() => select(job.job_id, { scroll: true })}
                          >
                            <span className="sp-chapter-n" aria-hidden="true"><Icon name="doc" size={16} /></span>
                            <div>
                              <b>{job.chapter_title || job.source_filename || 'Chapter'}</b>
                              {meta ? <small>{meta}</small> : null}
                              <span className={`fa-chapter-tag ${tag.cls}`}>
                                <i className="un-dot" aria-hidden="true" /> {tag.label}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </Panel>

        <div className="fa-review-col" ref={detailRef}>
          {selected ? (
            <>
              <div className="fa-chapter-bar">
                <span className="sp-row-ic" aria-hidden="true"><Icon name="book" size={20} /></span>
                <div>
                  <small>Chapter</small>
                  <b>{selected.chapter_title || selected.source_filename || 'Chapter'}</b>
                  <span className="fa-sub mq-sub">
                    {selected.subject_name ? (
                      <span className="mq-subject">
                        <i className="mq-dot" style={{ background: subjectColor(selected) }} aria-hidden="true" />
                        {selected.subject_name}
                      </span>
                    ) : null}
                    <span>{[showDept || !singleDepartment ? selected.department_name : null, selected.source_filename].filter(Boolean).join(' · ') || '—'}</span>
                  </span>
                </div>
                {selected.published_at ? (
                  <span className="sp-pill sp-pill--good"><i className="un-dot" aria-hidden="true" />Video published</span>
                ) : (
                  <span className="sp-pill sp-pill--off"><i className="un-dot" aria-hidden="true" />Video not published</span>
                )}
              </div>
              {selected.can_review === false ? (
                <p className="ad-muted fa-viewonly"><Icon name="lock" size={14} /> View only — this chapter isn&apos;t in your subjects, or you have no subjects yet.</p>
              ) : null}
              <McqDocumentReview
                key={selected.job_id}
                jobId={selected.job_id}
                chapterTitle={selected.chapter_title || ''}
                canGenerate={selected.can_review !== false}
                canApprove={selected.can_review !== false}
                onStateChange={onSetStateChange}
                knownEmpty={stateOf(selected) === 'none'}
              />
            </>
          ) : ordered.length ? (
            <section className="sp-panel mq-pick">
              <div className="sp-panel-b">
                <SectionState title="Select a chapter">
                  Pick a chapter to review its questions, or generate a set if it has none.
                </SectionState>
              </div>
            </section>
          ) : null}
        </div>
      </div>
      )}
    </ModulePage>
  );
}

/** Tabs and selection read the URL, so the workspace renders inside a Suspense boundary. */
export default function McqReviewWorkspace(props) {
  return (
    <Suspense fallback={<SectionState title="Loading MCQ review…" />}>
      <McqReview {...props} />
    </Suspense>
  );
}
