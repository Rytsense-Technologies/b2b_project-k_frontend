'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import {
  Icon,
  KpiRow,
  Mono,
  Panel,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { BandPill, BarList, DonutChart } from '@/components/shared/data-viz';
import { analyticsApi } from '@/lib/api/analytics';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList } from '@/lib/api/superadmin/http';
import { departmentHod, hodCanReview, loadCollegeStaff } from '@/components/admin/departments/departmentModel';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { formatPct } from '@/lib/superadmin/format';

const STAGE = {
  awaiting_you: { label: 'Review plan', cls: 'sp-pill--low' },
  ready_to_send: { label: 'Send to HOD', cls: 'sp-pill--teal' },
  awaiting_hod: { label: 'With HOD', cls: 'sp-pill--off' },
};

/** Same precision as Analytics and Reports: one decimal at most ("20.9%"). */
function pct(v) {
  return v == null || v === '' ? '—' : formatPct(v);
}

function shortDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Live "Needs your attention" rows for the hero side panel; a row at 0 is hidden. */
function AttentionList({ items, loading }) {
  const live = items.filter((i) => i.count > 0);
  if (loading) return <p className="ad-attn-note">Checking your college…</p>;
  if (!live.length) {
    return <p className="ad-attn-note">Nothing needs you right now. New reviews, invites and students who need help show here.</p>;
  }
  return (
    <ul className="ad-attn">
      {live.map((i) => (
        <li key={i.id}>
          <Link href={i.href}>
            <b>{countLabel(i.count)}</b>
            <span>{i.label(i.count)}</span>
            <Icon name="chev" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboardPage() {
  const { user, tenantId } = useAuth();

  // Auth state hydrates from the store before React can reconcile the
  // server-rendered HTML; render the same neutral fallback until mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const college = mounted ? (user?.college_name || user?.tenant_name || 'your college') : 'your college';

  // Live college overview (last 30 days). Totals, departments, bands, at-risk and review queue.
  const { data: overview, loading: overviewLoading, error: overviewError } = useAsyncResource(
    () => analyticsApi.college({ range: 'last_30_days' }),
    [tenantId],
  );
  // Departments without an HOD use the same rule as Academic structure (departmentHod).
  const { data: deptData } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ is_active: true, page: 1, pageSize: 100 })),
    [tenantId],
  );
  const { data: collegeStaff } = useAsyncResource(() => loadCollegeStaff(tenantId), [tenantId]);

  const totals = overview?.totals;
  const queue = overview?.review_queue;
  // Loading until the overview arrives or fails (covers the first render before the request starts).
  const first = !overview && !overviewError;

  const noHod = useMemo(() => {
    if (!deptData || !Array.isArray(collegeStaff)) return null;
    return asList(deptData, []).filter((d) => !hodCanReview(departmentHod(d, collegeStaff))).length;
  }, [deptData, collegeStaff]);

  const finals = (overview?.interview_cohort || []).filter((r) => r.final_year);
  const finalsReady = finals.filter((r) => r.status === 'ready').length;

  const deptBars = useMemo(() => (overview?.departments || [])
    .filter((d) => d.students)
    .map((d) => ({
      key: d.department_id,
      label: d.department,
      value: d.completion ?? 0,
      sub: `${countLabel(d.students)} student${d.students === 1 ? '' : 's'}`,
      href: `/admin/analytics?tab=departments&department=${encodeURIComponent(d.department_id)}`,
    }))
    .sort((a, b) => b.value - a.value), [overview]);

  const bands = overview?.score_bands;
  const atRisk = overview?.at_risk || [];

  const attention = [
    { id: 'review', count: queue?.awaiting_you || 0, href: '/admin/content', label: (n) => `chapter plan${n === 1 ? '' : 's'} waiting for your review` },
    { id: 'send', count: queue?.ready_to_send || 0, href: '/admin/content', label: (n) => `chapter${n === 1 ? '' : 's'} ready to send to the HOD` },
    { id: 'hod', count: noHod || 0, href: '/admin/structure/departments?hod=without', label: (n) => `department${n === 1 ? '' : 's'} without an HOD` },
    { id: 'pending', count: totals?.pending_students || 0, href: '/admin/students?tab=pending', label: (n) => `student invite${n === 1 ? '' : 's'} not yet activated` },
    { id: 'risk', count: atRisk.length, href: '/admin/analytics?tab=students&risk=1', label: (n) => `student${n === 1 ? '' : 's'} who may need help` },
  ];

  return (
    <div className="animate-fade-in sp pm-page ad-page ad-dash">
      <PortalHero
        eyebrow={`College admin · ${college}`}
        title={college && college !== 'your college' ? `Welcome, ${college}` : 'Welcome'}
        description="Build your academic structure, upload subject material and track how students learn. Everything you upload goes to the department HOD for review before students see it."
        secondaryHref="/admin/content"
        secondaryLabel="Upload a chapter"
        primaryHref="/admin/students"
        primaryLabel="Add students"
        sideTitle="Needs your attention"
      >
        <AttentionList items={attention} loading={first || noHod == null} />
      </PortalHero>

      <KpiRow
        label="College summary, last 30 days"
        items={[
          {
            icon: 'users',
            label: 'Active students',
            value: first ? null : (totals ? countLabel(totals.students) : '—'),
            sub: !totals ? (first ? 'Loading…' : 'Last 30 days') : totals.pending_students ? `${countLabel(totals.pending_students)} invite${totals.pending_students === 1 ? '' : 's'} to activate` : 'Everyone invited has activated',
          },
          {
            icon: 'bookOpen',
            label: 'Chapter completion',
            value: first ? null : pct(totals?.completion),
            sub: totals ? `${countLabel(totals.chapters_completed)} of ${countLabel(totals.chapters_available)} chapters` : (first ? 'Loading…' : 'Last 30 days'),
          },
          {
            icon: 'target',
            // Quiz average (as on Analytics); the mock interview average sits on the sub-line.
            label: 'Quiz average',
            value: first ? null : pct(totals?.quiz_avg),
            sub: totals ? (
              <span className="ad-kpi-band">
                {totals.quiz_avg != null ? <BandPill score={totals.quiz_avg} /> : null}
                {[
                  totals.pass_rate != null ? `${pct(totals.pass_rate)} pass` : 'No quizzes yet',
                  totals.interview_avg != null ? `Mock ${pct(totals.interview_avg)}` : null,
                ].filter(Boolean).join(' · ')}
              </span>
            ) : (first ? 'Loading…' : 'Chapter quizzes, last 30 days'),
          },
          {
            icon: 'mic',
            label: 'Interview ready',
            value: first ? null : (overview ? `${countLabel(finalsReady)} of ${countLabel(finals.length)}` : '—'),
            sub: !overview ? (first ? 'Loading…' : 'Final-year students') : finals.length ? 'Final-year students' : 'No final-year students yet',
          },
        ]}
      />

      {overviewError ? (
        <SectionState tone="err" title="Could not load learning activity">
          {overviewError?.message || 'Refresh the page to try again.'}
        </SectionState>
      ) : null}

      <div className="dv-grid">
        <Panel
          title="Completion by department"
          sub="Chapters completed by students, last 30 days"
          action={(
            <Link className="sp-link" href="/admin/analytics?tab=departments">
              Analytics <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          {first ? <p className="dv-empty">Loading…</p> : (
            <BarList
              label="Completion by department"
              items={deptBars}
              max={100}
              suffix="%"
              empty="No students placed in a department yet."
            />
          )}
        </Panel>
        <Panel
          title="Students by quiz score"
          sub={totals?.pass_rate != null ? `Each student's quiz average · ${pct(totals.pass_rate)} of quiz attempts passed` : "Each student's quiz average"}
        >
          {first ? <p className="dv-empty">Loading…</p> : (
            <DonutChart
              centerLabel="Students"
              parts={bands ? [
                { key: 'strong', label: 'Strong (80+)', value: bands.strong },
                { key: 'ok', label: 'On track (60–79)', value: bands.ok },
                { key: 'focus', label: 'Needs focus (<60)', value: bands.focus },
                { key: 'none', label: 'No attempts yet', value: bands.none },
              ] : []}
              empty="No students yet."
            />
          )}
        </Panel>
      </div>

      <div className="dv-grid">
        <Panel
          title="Content review queue"
          sub={queue
            ? `${countLabel(queue.awaiting_you)} waiting for you · ${countLabel(queue.awaiting_hod)} with the HOD · ${countLabel(queue.ready_to_send)} ready to send`
            : 'Chapters on their way to students'}
          action={(
            <Link className="sp-link" href="/admin/content">
              Open content <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          {queue?.items?.length ? (
            <ul className="ad-queue">
              {queue.items.map((j) => (
                <li key={j.job_id}>
                  <span className="sp-row-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                  <div>
                    <b>{j.chapter_title}</b>
                    <small>{[j.department, shortDate(j.since)].filter(Boolean).join(' · ')}</small>
                  </div>
                  <span className={`sp-pill ${STAGE[j.stage]?.cls || ''}`}>{STAGE[j.stage]?.label || 'In review'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
              <div>
                <b>{first ? 'Loading…' : 'Nothing waiting'}</b>
                <small>Uploaded chapters show here until they are published to students.</small>
              </div>
            </div>
          )}
        </Panel>
        <Panel
          title="Students who need attention"
          sub="Low scores or no activity, last 30 days"
          action={(
            <Link className="sp-link" href="/admin/analytics?tab=students">
              All students <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          {atRisk.length ? (
            <ul className="ad-queue ad-attn-risk">
              {atRisk.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Mono name={s.student || '?'} size="sm" />
                  <div>
                    <b>{s.student}</b>
                    <small>{s.department || 'No department'}</small>
                  </div>
                  <span className="ad-reasons">
                    {(s.reasons || []).slice(0, 2).map((r) => <span key={r} className="sp-pill sp-pill--low">{r}</span>)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="users" size={20} /></span>
              <div>
                <b>{first ? 'Loading…' : 'No one flagged'}</b>
                <small>Students with low scores or no activity in the last 30 days appear here.</small>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
