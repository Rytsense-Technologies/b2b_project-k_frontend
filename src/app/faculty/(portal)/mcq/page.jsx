'use client';

import { useMemo, useState } from 'react';
import McqDocumentReview from '@/components/shared/McqDocumentReview';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  Panel,
  Icon,
  SectionState,
  SearchBox,
  countLabel,
} from '@/components/shared/module-ui';
import { eduVideoApi, JOB_STATUS } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Not published' },
];

/**
 * HOD / Faculty — review generated MCQs for chapters in scope.
 * Uses GET/POST /api/v1/mcq (no separate approve endpoint yet).
 */
export default function FacultyMcqPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

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

  /* ---- client-side filters over the chapters already loaded ---- */
  const publishedCount = chapters.filter((j) => j.published_at).length;
  const inReviewCount = chapters.filter((j) => !j.published_at && j.sent_to_hod_at).length;
  const deptCount = new Set(chapters.map((j) => j.department_id || j.department_name).filter(Boolean)).size;
  const needle = search.trim().toLowerCase();
  const shown = chapters.filter((j) => {
    if (tab === 'published' && !j.published_at) return false;
    if (tab === 'pending' && j.published_at) return false;
    if (!needle) return true;
    return [j.chapter_title, j.source_filename, j.department_name]
      .some((v) => String(v || '').toLowerCase().includes(needle));
  });
  const filtering = Boolean(needle) || tab !== 'all';
  const ready = !loading || jobs.length > 0;
  const kpi = (n) => (ready && !error ? countLabel(n) : null);

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="check"
        eyebrow="Content review"
        title="MCQ review"
        lede="Review AI-generated questions for each rendered chapter. Correct answers are shown so you can check them before students take the quiz."
        actions={(
          <button type="button" className="sd-btn sd-btn--glass" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={16} /> Refresh list
          </button>
        )}
      />

      <KpiRow
        label="MCQ review summary"
        items={[
          { icon: 'book', label: 'Rendered chapters', value: kpi(chapters.length), sub: 'Ready for a question set' },
          { icon: 'clock', label: 'In your review', value: kpi(inReviewCount), sub: 'Sent, not yet published' },
          { icon: 'tick', label: 'Published', value: kpi(publishedCount), sub: 'Students can take the quiz' },
          { icon: 'layers', label: 'Departments', value: kpi(deptCount), sub: 'With rendered chapters' },
        ]}
      />

      <FilterBar label="Filter chapters">
        <SearchBox
          placeholder="Search chapter, file or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegTabs
          label="Filter by status"
          value={tab}
          onChange={setTab}
          options={STATUS_TABS.map((t) => ({
            ...t,
            count: !ready || error ? null : t.value === 'published' ? publishedCount
              : t.value === 'pending' ? chapters.length - publishedCount
                : null,
          }))}
        />
      </FilterBar>

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

      <div className="fa-split">
        <Panel
          className="fa-chapters"
          title="Chapters"
          sub={loading && !jobs.length ? 'Loading…' : `${countLabel(shown.length)} of ${countLabel(chapters.length)} shown`}
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
              <SectionState title="No matches">
                {filtering ? 'Try a different name, department or status.' : null}
              </SectionState>
            </div>
          ) : null}
          {shown.length ? (
            <ul className="pm-list">
              {shown.map((job) => {
                const active = job.job_id === selectedId;
                const tag = job.published_at
                  ? { cls: 'is-good', label: 'Published' }
                  : job.sent_to_hod_at
                    ? { cls: 'is-low', label: 'In review' }
                    : { cls: 'is-muted', label: 'Not sent yet' };
                return (
                  <li key={job.job_id}>
                    <button
                      type="button"
                      className="pm-list-btn"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setSelectedId(job.job_id)}
                    >
                      <span className="sp-chapter-n" aria-hidden="true"><Icon name="doc" size={16} /></span>
                      <div>
                        <b>{job.chapter_title || job.source_filename || 'Chapter'}</b>
                        <small>{job.department_name || '—'}</small>
                        <span className={`fa-chapter-tag ${tag.cls}`}>
                          <i className="un-dot" aria-hidden="true" /> {tag.label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Panel>

        <div className="fa-review-col">
          {selected ? (
            <>
              <div className="fa-chapter-bar">
                <span className="sp-row-ic" aria-hidden="true"><Icon name="book" size={20} /></span>
                <div>
                  <small>Chapter</small>
                  <b>{selected.chapter_title || selected.source_filename || 'Chapter'}</b>
                  <span className="fa-sub">
                    {[selected.department_name, selected.source_filename].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
                {selected.published_at ? (
                  <span className="sp-pill sp-pill--good"><i className="un-dot" aria-hidden="true" />Published to students</span>
                ) : (
                  <span className="sp-pill sp-pill--low"><i className="un-dot" aria-hidden="true" />Not published yet</span>
                )}
              </div>
              <McqDocumentReview
                jobId={selected.job_id}
                chapterTitle={selected.chapter_title || ''}
                canGenerate
              />
            </>
          ) : (
            <section className="sp-empty-hero pm-soon fa-pick">
              <div className="pm-soon-art" aria-hidden="true">
                <span className="pm-soon-ring" />
                <span className="pm-soon-tile"><Icon name="check" size={32} /></span>
                <span className="pm-soon-dot" />
              </div>
              <div className="pm-soon-copy">
                <h2>Select a chapter</h2>
                <p>Choose a chapter from the list to review its questions, or generate a question set if it does not have one yet.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
