'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Icon,
  ModuleHead,
  ModulePage,
  Panel,
  SearchBox,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { BandPill, Distribution, ScoreMeter } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { useUrlState } from '@/hooks/useUrlState';
import {
  FacultyScopeChip, ReadOnlyNote, pct, useFacultySubjects, useSubjectColor,
} from '@/components/faculty/facultyKit';

const STATUS = {
  published: { label: 'Published', cls: 'sp-pill--good' },
  in_review: { label: 'Awaiting review', cls: 'sp-pill--low' },
  in_progress: { label: 'Being prepared', cls: 'sp-pill--teal' },
  no_content: { label: 'No video yet', cls: 'sp-pill--off' },
};

function Pill({ status }) {
  const s = STATUS[status] || STATUS.no_content;
  return <span className={`sp-pill ${s.cls}`}><i className="un-dot" aria-hidden="true" />{s.label}</span>;
}

const pipelineParts = (s) => [
  { label: 'Published', value: s.published || 0, color: 'var(--progress)' },
  { label: 'In review', value: s.in_review || 0, color: 'var(--cat-3)' },
  { label: 'In progress', value: s.in_progress || 0, color: 'var(--cat-1)' },
  { label: 'No video', value: s.no_content || 0, color: 'var(--band-none)' },
];

/** Subjects in scope with each chapter's content status and learning numbers (analytics, joined by id). */
export default function FacultySubjectsPage() {
  const { scope } = useFacultyScope();
  const colorFor = useSubjectColor();
  const [url, setUrl] = useUrlState({ q: '', program: '' });
  const [open, setOpen] = useState(() => new Set());
  const { data, loading, error, reload } = useFacultySubjects();
  const insights = useAsyncResource(() => analyticsApi.department({}), []);

  const items = useMemo(() => data?.items || [], [data]);
  const learning = useMemo(() => {
    const m = new Map();
    (insights.data?.subjects || []).forEach((s) => m.set(s.subject_id, s));
    return m;
  }, [insights.data]);
  const programs = useMemo(() => [...new Set(items.map((s) => s.program).filter(Boolean))].sort(), [items]);

  const needle = url.q.trim().toLowerCase();
  const shown = items.filter((s) => (!url.program || s.program === url.program) && (!needle
    || [s.name, s.code, s.program, s.semester, ...s.teachers, ...s.chapters.map((c) => c.title)]
      .some((v) => String(v || '').toLowerCase().includes(needle))));
  const total = (k) => items.reduce((n, s) => n + (s[k] || 0), 0);
  const chapters = items.reduce((n, s) => n + s.chapters.length, 0);
  const first = loading && !data;
  const single = items.length === 1;
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toReview = total('in_review');
  const unlinked = data?.unlinked || [];

  return (
    <ModulePage className="fa-page">
      <ModuleHead
        chips={<FacultyScopeChip scope={scope} />}
      />

      <ReadOnlyNote scope={scope} what="chapters" />

      {error ? (
        <SectionState
          tone="err"
          title="Could not load subjects"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {error && !data ? null : (
      <Panel
        title={scope?.subject_limited ? 'Your subjects' : 'Subjects'}
        sub={data ? [
          `${countLabel(items.length)} subject${items.length === 1 ? '' : 's'}`,
          `${countLabel(chapters)} chapter${chapters === 1 ? '' : 's'}`,
          chapters ? `${Math.round((100 * total('published')) / chapters)}% published` : null,
          shown.length !== items.length ? `${countLabel(shown.length)} shown` : null,
        ].filter(Boolean).join(' · ') : null}
        action={toReview ? (
          <Link className="sp-pill sp-pill--low fa-pill-link" href="/faculty/videos">{`${countLabel(toReview)} awaiting review`}</Link>
        ) : null}
        toolbar={items.length > 1 ? (
          <>
            <SearchBox placeholder="Search subject, programme, teacher or chapter…" value={url.q} onChange={(e) => setUrl({ q: e.target.value })} />
            {programs.length > 1 ? (
              <div className="fa-filter-select">
                <QuirriSelect
                  ariaLabel="Filter by programme"
                  value={url.program}
                  onChange={(e) => setUrl({ program: e.target.value })}
                  options={[{ value: '', label: 'All programmes' }, ...programs.map((p) => ({ value: p, label: p }))]}
                />
              </div>
            ) : null}
            {url.q || url.program ? (
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ q: '', program: '' })}>Clear</button>
            ) : null}
          </>
        ) : null}
      >
        {first ? <SectionState title="Loading subjects…" /> : null}
        {data && !items.length ? (
          <SectionState title={scope?.subject_limited ? 'No subjects assigned yet' : 'No subjects in your department yet'}>
            {scope?.subject_limited
              ? 'Ask your College Admin to assign your subjects under Staff › Assign subjects.'
              : 'Your College Admin adds programmes, semesters and subjects under Academic structure.'}
          </SectionState>
        ) : null}
        {data && items.length && !shown.length ? <SectionState title="No matches">Try another subject, programme or chapter.</SectionState> : null}

        {shown.length ? (
          <ul className={`fa-subj-grid${single ? ' is-single' : ''}`}>
            {shown.map((s) => {
              const isOpen = single || open.has(s.id) || Boolean(needle);
              const color = colorFor(s.id);
              const l = learning.get(s.id);
              return (
                <li key={s.id} className="fa-subj-card">
                  <div className="fa-subj-h">
                    <span className="fa-subj-disc" style={{ background: color }} aria-hidden="true"><Icon name="book" size={18} /></span>
                    <div className="fa-subj-t">
                      <b>{s.name}{s.code ? <small>{` · ${s.code}`}</small> : null}</b>
                      <small>{`${s.program} · ${s.semester}`}</small>
                      <small>{s.teachers.length ? `Taught by ${s.teachers.join(', ')}` : 'No teacher assigned'}</small>
                    </div>
                  </div>
                  <dl className="fa-subj-stats">
                    <div><dt>Chapters</dt><dd>{countLabel(s.chapters.length)}</dd></div>
                    <div><dt>Learners</dt><dd>{insights.data ? countLabel(l?.learners ?? 0) : '—'}</dd></div>
                    <div><dt>Completion</dt><dd>{l?.completion != null ? <ScoreMeter value={l.completion} label="Completion" /> : '—'}</dd></div>
                    <div><dt>Avg quiz score</dt><dd>{l?.avg_score != null ? <span className="fa-score"><b>{pct(l.avg_score)}</b><BandPill score={l.avg_score} /></span> : '—'}</dd></div>
                  </dl>
                  <Distribution label={`${s.name} chapter pipeline`} parts={pipelineParts(s)} empty="No chapters yet." />
                  {s.chapters.length ? (
                    <button type="button" className="fa-subj-toggle" aria-expanded={isOpen} onClick={() => toggle(s.id)} disabled={single}>
                      <span className={`sa-acad-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true"><Icon name="chev" size={16} /></span>
                      {`${isOpen ? 'Chapters' : 'Show chapters'} (${countLabel(s.chapters.length)})`}
                      {s.in_review ? <span className="sp-pill sp-pill--low">{`${countLabel(s.in_review)} to review`}</span> : null}
                    </button>
                  ) : null}
                  {isOpen && s.chapters.length ? (
                    <ol className="fa-chapter-list">
                      {s.chapters.map((c) => (
                        <li key={c.id}>
                          <span className="pm-step-n">{c.position}</span>
                          <b>{c.title}</b>
                          <Pill status={c.status} />
                          {c.status === 'in_review' ? (
                            <Link
                              className="sp-link"
                              href={c.job_id ? `/faculty/videos?job=${encodeURIComponent(c.job_id)}` : '/faculty/videos'}
                            >
                              Review <Icon name="arrow" size={14} />
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Panel>
      )}

      {unlinked.length ? (
        <Panel
          title="Not linked to a subject"
          sub="Department content your College Admin hasn't placed under a subject yet."
          action={<Link className="sp-link" href="/faculty/videos">Open in Video review</Link>}
          bodyClassName=""
        >
          <ul className="fa-chapter-list fa-chapter-list--flat">
            {unlinked.map((j) => (
              <li key={j.job_id}>
                <span className="fa-subj-dot" aria-hidden="true" />
                <b>{j.title}</b>
                <Pill status={j.status} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </ModulePage>
  );
}
