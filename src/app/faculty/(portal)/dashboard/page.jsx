'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import { ModulePage, KpiRow, Panel, Icon, SectionState, countLabel, initials } from '@/components/shared/module-ui';
import { MetricList, ModernDonut } from '@/components/shared/data-viz';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { analyticsApi } from '@/lib/api/analytics';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { useAuth } from '@/hooks/useAuth';
import { titleCase } from '@/lib/student/learning';
import {
  OVERDUE_DAYS, ageLabel, daysSince, pct, useFacultySubjects, useSubjectColor,
} from '@/components/faculty/facultyKit';

const queueHref = (q) => `${q.kind === 'video' ? '/faculty/videos' : '/faculty/mcq'}?job=${encodeURIComponent(q.job_id)}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** HOD / Faculty home: what is waiting for review, who needs attention, how each subject is doing. */
export default function FacultyDashboardPage() {
  const { scope } = useFacultyScope();
  const { user } = useAuth();
  // Name and time-of-day exist only in the browser: render them after mount (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, loading, error, reload } = useAsyncResource(() => facultyDirectoryApi.overview(), []);
  const insights = useAsyncResource(() => analyticsApi.department({}), []);
  const subjects = useFacultySubjects();
  const colorFor = useSubjectColor();

  const first = loading && !data;
  const a = insights.data;
  const aFirst = insights.loading && !a;
  // A failed request shows its error, never zeros that look like real data.
  const failed = Boolean(error) && !data;
  const aFailed = Boolean(insights.error) && !a;
  const errNote = (title, err, retry) => (
    <SectionState
      tone="err"
      title={title}
      action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => retry()}>Try again</button>}
    >
      {apiErrorMessage(err, 'Try again in a moment.')}
    </SectionState>
  );
  const isHod = Boolean(scope?.is_hod);
  const readOnly = Boolean(scope?.read_only);
  const dept = scope?.department_name || 'your department';
  const name = !mounted ? '' : titleCase(String(user?.name || user?.first_name || '').trim().split(/\s+/)[0] || '');
  const next = data?.queue?.[0] || null;

  const scopeLine = !scope
    ? 'Loading your scope…'
    : isHod
      ? `${dept} · whole department`
      : readOnly
        ? `${dept} · view only until your College Admin assigns you subjects`
        : (scope.subjects || []).map((s) => [s.name, s.code].filter(Boolean).join(' · ')).join(', ');

  const sideRows = [
    { label: 'Videos to review', value: data?.videos_awaiting, href: '/faculty/videos' },
    { label: 'MCQ sets to approve', value: data?.mcq_to_approve, href: '/faculty/mcq?tab=awaiting' },
    { label: 'Chapters without questions', value: data?.mcq_not_generated, href: '/faculty/mcq?tab=none' },
  ];

  // Chapter pipeline across the subjects in scope.
  const subjItems = subjects.data?.items || [];
  const sum = (k) => subjItems.reduce((n, s) => n + (Number(s[k]) || 0), 0);
  const pipeline = [
    // Tones (not CSS vars) so the SVG donut gets real colours. In progress = neutral grey (like "Generating" on SA content); No video = lighter grey so the two read apart.
    { key: 'published', label: 'Published', value: sum('published'), tone: 'good' },
    { key: 'in_review', label: 'In review', value: sum('in_review'), tone: 'warn' },
    { key: 'in_progress', label: 'In progress', value: sum('in_progress'), tone: 'neutral' },
    { key: 'no_content', label: 'No video yet', value: sum('no_content'), color: '#DDE2E5' },
  ];

  const atRisk = a?.at_risk || [];

  return (
    <ModulePage className="fa-page">
      <PortalHero
        eyebrow={scope ? (isHod ? 'Head of department' : 'Faculty') : 'Dashboard'}
        title={!mounted ? 'Dashboard' : name ? `${greeting()}, ${name}` : greeting()}
        description={scopeLine}
        secondaryHref="/faculty/subjects"
        secondaryLabel="Open subjects"
        primaryHref={next && !readOnly ? queueHref(next) : undefined}
        primaryLabel={next && !readOnly ? 'Review next' : undefined}
        sideTitle="Waiting on you"
      >
        <ul className="fa-hero-counts">
          {sideRows.map((r) => (
            <li key={r.label}>
              <Link href={r.href}>
                <span>{r.label}</span>
                <b>{data ? countLabel(r.value ?? 0) : '—'}</b>
              </Link>
            </li>
          ))}
        </ul>
      </PortalHero>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load your queue"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      ) : null}

      {failed || aFailed ? null : (
      <KpiRow
        label="Learning summary"
        items={[
          { icon: 'users', label: 'Active students', value: first ? null : countLabel(data?.students ?? 0), sub: !scope ? 'In your scope' : isHod || readOnly ? 'In your department' : 'In your subjects' },
          { icon: 'book', label: 'Chapter completion', value: aFirst ? null : pct(a?.totals?.completion), sub: 'To date' },
          { icon: 'target', label: 'Quiz average', value: aFirst ? null : pct(a?.totals?.quiz_avg), sub: aFirst ? 'Chapter quizzes' : a?.totals?.pass_rate != null ? `${pct(a.totals.pass_rate)} of attempts passed` : 'No quizzes yet' },
          { icon: 'alert', label: 'Need attention', value: aFirst ? null : countLabel(atRisk.length), sub: 'Low scores or no activity', tone: atRisk.length ? 'focus' : undefined },
        ]}
      />
      )}

      <div className="dv-grid">
        <Panel
          title="Review queue"
          sub={readOnly ? 'View only: you can open these but not publish or approve yet.' : 'Videos sent for review and question sets to approve.'}
          action={data?.queue?.length ? (
            <span className="fa-panel-links">
              <Link className="sp-link" href="/faculty/videos">Videos</Link>
              <Link className="sp-link" href="/faculty/mcq">MCQs</Link>
            </span>
          ) : null}
          bodyClassName=""
        >
          {first ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
          {data && !data.queue.length ? (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
              <div>
                <b>All caught up</b>
                <small>Chapters your College Admin sends, and question sets to approve, appear here.</small>
              </div>
            </div>
          ) : null}
          {data?.queue?.length ? (
            <ul className="fa-queue">
              {data.queue.map((q) => {
                const age = daysSince(q.since);
                const late = age != null && age > OVERDUE_DAYS;
                return (
                  <li key={`${q.kind}-${q.job_id}`}>
                    <Link href={queueHref(q)}>
                      <span className={`sp-row-ic fa-kind fa-kind--${q.kind}`} aria-hidden="true">
                        <Icon name={q.kind === 'video' ? 'video' : 'check'} size={18} />
                      </span>
                      <span className="sp-row-main">
                        <b>{q.chapter_title}</b>
                        <span className="sp-row-meta">
                          {q.kind === 'video' ? 'Video to review' : 'Questions to approve'}
                          {ageLabel(q.since) && !late ? ` · sent ${ageLabel(q.since) === 'today' ? 'today' : `${ageLabel(q.since)} ago`}` : ''}
                        </span>
                      </span>
                      {late ? <span className="sp-pill sp-pill--low">{`Waiting ${age} days`}</span> : null}
                      <span className="fa-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Panel>

        <Panel
          title="Students who need attention"
          sub="Low scores, behind on chapters or no activity in the last 30 days."
          action={atRisk.length ? <Link className="sp-link" href="/faculty/students?tab=risk">See all</Link> : null}
          bodyClassName=""
        >
          {aFirst ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
          {insights.error ? (
            <div className="sp-panel-b">
              <SectionState tone="err" title="Could not load students">{apiErrorMessage(insights.error, 'Try again.')}</SectionState>
            </div>
          ) : null}
          {a && !atRisk.length ? (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
              <div>
                <b>No one flagged</b>
                <small>Students with low scores or no learning activity show up here.</small>
              </div>
            </div>
          ) : null}
          {atRisk.length ? (
            <ul className="fa-risk">
              {atRisk.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link href={`/faculty/students?tab=risk&student=${encodeURIComponent(s.id)}`}>
                    <span className="pm-av fa-av" aria-hidden="true">{initials(s.student, 'S')}</span>
                    <span className="sp-row-main">
                      <b>{s.student}</b>
                      <span className="fa-reasons">
                        {s.reasons.map((r) => <span key={r} className="fa-reason">{r}</span>)}
                      </span>
                    </span>
                    <span className="fa-go" aria-hidden="true"><Icon name="chev" size={16} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>

      <div className="dv-grid fa-grid-top">
        <Panel title="Completion by subject" sub="Share of each subject's published chapters its learners have finished, to date.">
          {aFailed ? errNote('Could not load completion', insights.error, insights.reload) : aFirst ? <SectionState title="Loading…" /> : (
            <MetricList
              label="Completion by subject"
              suffix="%"
              empty="No subjects with published chapters yet."
              items={(a?.subjects || []).map((s) => ({
                key: s.subject_id,
                label: s.subject,
                sub: s.code || undefined,
                value: s.completion ?? 0,
                color: colorFor(s.subject_id),
              }))}
            />
          )}
        </Panel>
        <Panel title="Chapter pipeline" sub="Every chapter in your scope, by video status.">
          {subjects.error && !subjects.data ? errNote('Could not load chapters', subjects.error, subjects.reload) : subjects.loading && !subjects.data ? <SectionState title="Loading…" /> : (
            <ModernDonut compact title="Chapter pipeline" unit="Chapters" parts={pipeline} empty="No chapters in your subjects yet." />
          )}
        </Panel>
      </div>
    </ModulePage>
  );
}
