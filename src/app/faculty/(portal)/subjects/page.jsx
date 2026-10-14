'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FilterBar,
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Panel,
  SearchBox,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import ScopeNotice from '@/components/faculty/ScopeNotice';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';

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

/** Subjects in scope (Academic structure) with each chapter's content status. */
export default function FacultySubjectsPage() {
  const { scope } = useFacultyScope();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const { data, loading, error, reload } = useAsyncResource(() => facultyDirectoryApi.subjects(), []);
  const items = useMemo(() => data?.items || [], [data]);
  const needle = search.trim().toLowerCase();
  const shown = items.filter((s) => !needle
    || [s.name, s.code, s.program, s.semester, ...s.chapters.map((c) => c.title)].some((v) => String(v || '').toLowerCase().includes(needle)));
  const total = (k) => items.reduce((n, s) => n + (s[k] || 0), 0);
  const chapters = items.reduce((n, s) => n + s.chapters.length, 0);
  const first = loading && !data;
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="book"
        eyebrow="Teaching"
        title="Subjects"
        lede="Subjects in your scope, their chapters, and how far each chapter's video is through review."
        actions={(
          <Link className="sd-btn sd-btn--glass" href="/faculty/videos">
            <Icon name="video" size={16} /> Open video review
          </Link>
        )}
      />

      <ScopeNotice scope={scope} what="chapters" />

      <KpiRow
        label="Subjects summary"
        items={[
          { icon: 'book', label: 'Subjects', value: first ? null : countLabel(items.length), sub: scope?.subject_limited ? 'Assigned to you' : 'In your department' },
          { icon: 'doc', label: 'Chapters', value: first ? null : countLabel(chapters), sub: 'Across these subjects' },
          { icon: 'tick', label: 'Published', value: first ? null : countLabel(total('published')), sub: 'Live for students' },
          { icon: 'clock', label: 'Awaiting review', value: first ? null : countLabel(total('in_review')), sub: 'Sent by your College Admin' },
        ]}
      />

      <FilterBar label="Find a subject">
        <SearchBox placeholder="Search subject, programme or chapter…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load subjects"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}
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
        <ul className="fa-subjects">
          {shown.map((s) => {
            const isOpen = open.has(s.id) || Boolean(needle);
            return (
              <li key={s.id} className="sp-panel">
                <button type="button" className="fa-subject-h" aria-expanded={isOpen} onClick={() => toggle(s.id)}>
                  <span className={`sa-acad-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true"><Icon name="chev" size={16} /></span>
                  <span className="fa-subject-main">
                    <b>{s.name}{s.code ? <small> · {s.code}</small> : null}</b>
                    <small>{`${s.program} · ${s.semester}`}{s.teachers.length ? ` · Taught by ${s.teachers.join(', ')}` : ''}</small>
                  </span>
                  <span className="fa-subject-counts">
                    <span className="sp-pill sp-pill--good">{countLabel(s.published)} published</span>
                    {s.in_review ? <span className="sp-pill sp-pill--low">{countLabel(s.in_review)} to review</span> : null}
                    <span className="sp-pill">{`${countLabel(s.chapters.length)} chapter${s.chapters.length === 1 ? '' : 's'}`}</span>
                  </span>
                </button>
                {isOpen ? (
                  s.chapters.length ? (
                    <ol className="fa-chapter-list">
                      {s.chapters.map((c) => (
                        <li key={c.id}>
                          <span className="pm-step-n">{c.position}</span>
                          <b>{c.title}</b>
                          <Pill status={c.status} />
                          {c.status === 'in_review' ? <Link className="sp-link" href="/faculty/videos">Review <Icon name="arrow" size={14} /></Link> : null}
                        </li>
                      ))}
                    </ol>
                  ) : <p className="ad-muted fa-chapter-empty">No chapters in this subject yet.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {data?.unlinked?.length ? (
        <Panel title="Not linked to a subject" sub="Department content your College Admin hasn't placed under a chapter yet." bodyClassName={null}>
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead><tr><th>Chapter</th><th>Status</th></tr></thead>
              <tbody>
                {data.unlinked.map((j) => (
                  <tr key={j.job_id}>
                    <td><b>{j.title}</b></td>
                    <td data-label="Status"><Pill status={j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </ModulePage>
  );
}
