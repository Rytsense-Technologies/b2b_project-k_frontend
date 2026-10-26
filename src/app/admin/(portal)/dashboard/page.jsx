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
import { BandPill, MetricList, ModernDonut } from '@/components/shared/data-viz';
import { analyticsApi } from '@/lib/api/analytics';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList } from '@/lib/api/superadmin/http';
import { departmentHod, hodCanReview, loadCollegeStaff } from '@/components/admin/departments/departmentModel';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { formatPct } from '@/lib/superadmin/format';
import { titleCase } from '@/lib/student/learning';

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
  if (loading) return <p className="q-attn-note">Loading…</p>;
  if (!live.length) {
    return <p className="q-attn-note">You&apos;re up to date.</p>;
  }
  return (
    <ul className="q-attn">
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
  const firstName = mounted ? (() => {
    const fromFirst = String(user?.first_name || '').trim().split(/\s+/)[0] || '';
    const fromName = String(user?.name || '').trim().split(/\s+/)[0] || '';
    const token = fromFirst || fromName;
    if (!token || /^(super|admin|college|faculty|student|hod)$/i.test(token)) return '';
    return titleCase(token);
  })() : '';

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
        title={firstName ? `Welcome, ${firstName}` : (mounted ? 'Welcome' : 'Dashboard')}
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
            sub: !totals ? (first ? 'Loading…' : null) : totals.pending_students ? `${countLabel(totals.pending_students)} invite${totals.pending_students === 1 ? '' : 's'} to activate` : null,
          },
          {
            icon: 'bookOpen',
            label: 'Chapter completion',
            value: first ? null : pct(totals?.completion),
            sub: totals ? `${countLabel(totals.chapters_completed)} of ${countLabel(totals.chapters_available)} chapters` : (first ? 'Loading…' : null),
          },
          {
            icon: 'target',
            // Quiz average (as on Analytics); the pass rate sits on the sub-line.
            label: 'Quiz average',
            value: first ? null : pct(totals?.quiz_avg),
            sub: totals ? (
              <span className="ad-kpi-band">
                {totals.quiz_avg != null ? <BandPill score={totals.quiz_avg} /> : null}
                {totals.pass_rate != null ? `${pct(totals.pass_rate)} pass` : 'No quizzes yet'}
              </span>
            ) : (first ? 'Loading…' : null),
          },
          {
            icon: 'chat',
            label: 'Tutor questions',
            value: first ? null : (totals ? countLabel(totals.qa) : '—'),
            sub: !totals ? (first ? 'Loading…' : null) : totals.qa ? null : 'No tutor questions yet',
          },
        ]}
      />

      {overviewError ? (
        <SectionState tone="err" title="Could not load learning activity">
          {overviewError?.message || 'Refresh the page to try again.'}
        </SectionState>
      ) : null}

      <div className="dv-grid ad-grid-start">
        <Panel title="Completion by department">
          {first ? <p className="dv-empty">Loading…</p> : (
            <MetricList
              label="Completion by department"
              items={deptBars}
              suffix="%"
              empty="No students placed in a department yet."
            />
          )}
        </Panel>
        <Panel title="Students by quiz score">
          {first ? <p className="dv-empty">Loading…</p> : (
            <ModernDonut
              compact
              unit="Students"
              title="Students by quiz score"
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
            : null}
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
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Students who need attention">
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
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
