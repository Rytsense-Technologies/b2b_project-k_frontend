'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import {
  ModulePage,
  ModuleHead,
  Panel,
  Kpi,
  SegTabs,
  Icon,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { MetricList, ModernDonut, BandPill } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  dashboardApi, collegesApi, healthApi, notificationsApi, fetchData,
} from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, apiErrorMessage, isApiUnavailable, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useUrlState } from '@/hooks/useUrlState';
import { useAuth } from '@/hooks/useAuth';
import { formatCount, formatMinutes, formatPct } from '@/lib/superadmin/format';
import { overallHealth, toNumber } from '@/lib/superadmin/health';
import { isInterviewOff } from '@/lib/product/interviewOff';
import { titleCase } from '@/lib/student/learning';

/** The five ranges GET /dashboard accepts (reports.py RANGES). */
const RANGES = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'all_time', label: 'All time' },
];
const RANGE_KEYS = RANGES.map((r) => r.value);

const METRICS = [
  { value: 'completion', label: 'Completion' },
  { value: 'score', label: 'Avg score' },
  { value: 'watch', label: 'Watch time' },
  { value: 'qa', label: 'Q&A' },
];

const plural = (n, one, many) => `${formatCount(n)} ${Number(n) === 1 ? one : many}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(user) {
  const fromFirst = String(user?.first_name || '').trim().split(/\s+/)[0] || '';
  const fromName = String(user?.name || '').trim().split(/\s+/)[0] || '';
  const token = fromFirst || fromName;
  // Role labels ("Super Admin") are not a person's name.
  if (!token || /^(super|admin|college|faculty|student|hod)$/i.test(token)) return '';
  return titleCase(token);
}

/** Total from a 1-row list call, or null when the call failed (never a guessed 0). */
async function totalOf(request) {
  try {
    const d = await fetchData(request);
    if (d?.total != null) return Number(d.total);
    return asList(d, []).length;
  } catch {
    return null;
  }
}

/**
 * Real attention items from data the Super Admin already has access to: platform
 * health problems, failed deliveries, pending invites and inactive colleges.
 */
async function loadAttention() {
  const [health, pendingInvites, inactiveColleges, failedRecent] = await Promise.all([
    fetchOptional(() => healthApi.getStatus()).catch(() => null),
    totalOf(() => usersApi.getUsers({ status: 'pending', pageSize: 1 })),
    totalOf(() => collegesApi.list({ is_active: false, pageSize: 1 })),
    // Same 7-day window the retry endpoint uses, so the number matches what Retry resends.
    totalOf(() => notificationsApi.listDeliveries({ status: 'failed', days: 7, page: 1, page_size: 1 })),
  ]);
  const items = [];
  if (health) {
    overallHealth(health).items.forEach((item) => {
      items.push({ id: item.id, label: item.title, href: item.href });
    });
  }
  if (failedRecent) {
    items.push({
      id: 'failed-notifications',
      count: failedRecent,
      label: Number(failedRecent) === 1
        ? 'notification failed in the last 7 days'
        : 'notifications failed in the last 7 days',
      href: '/superadmin/notifications?status=failed&days=7',
    });
  }
  if (pendingInvites) {
    items.push({
      id: 'pending-invites',
      count: pendingInvites,
      label: Number(pendingInvites) === 1 ? 'invite not accepted yet' : 'invites not accepted yet',
      href: '/superadmin/users?tab=pending',
    });
  }
  if (inactiveColleges) {
    items.push({
      id: 'inactive-colleges',
      count: inactiveColleges,
      label: Number(inactiveColleges) === 1 ? 'college is deactivated' : 'colleges are deactivated',
      href: '/superadmin/colleges?status=false',
    });
  }
  return { items, checked: Boolean(health) || pendingInvites != null || inactiveColleges != null };
}

function AttentionList({ items, loading, checked }) {
  if (loading) return <p className="q-attn-note">Loading…</p>;
  if (!items.length) {
    return (
      <p className="q-attn-note">
        {checked ? 'You\'re up to date.' : 'Could not check the platform just now.'}
      </p>
    );
  }
  return (
    <ul className="q-attn">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href}>
            {item.count != null
              ? <b>{countLabel(item.count)}</b>
              : <span className="q-attn-mark" aria-hidden="true" />}
            <span>{item.label}</span>
            <Icon name="chev" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "48.5%" / 48.5 / "—" -> number or null. */
function pct(value) {
  return toNumber(value);
}

function DashboardView() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const name = mounted ? firstNameOf(user) : '';

  const [url, setUrl] = useUrlState({ range: 'last_30_days', metric: 'completion' });
  const range = RANGE_KEYS.includes(url.range) ? url.range : 'last_30_days';
  const metric = METRICS.some((m) => m.value === url.metric) ? url.metric : 'completion';
  const { data, loading, error, reload } = useAsyncResource(
    () => fetchOptional(() => dashboardApi.getOverview({ range })),
    [range],
  );
  const { data: attention, loading: attentionLoading, reload: reloadAttention } = useAsyncResource(loadAttention, []);
  // Live like the student pages: every minute + when the tab regains focus.
  useLiveRefresh(() => Promise.all([reload({ silent: true }), reloadAttention({ silent: true })]));

  const unavailable = !loading && data == null && !error;
  const hardError = error && !isApiUnavailable(error);
  const firstLoad = loading && !data;

  const metrics = useMemo(() => {
    const byTitle = {};
    asList(data?.metrics, []).forEach((m) => {
      const title = String(m.title || '');
      if (isInterviewOff(title)) return;
      byTitle[title.toLowerCase()] = m;
    });
    return byTitle;
  }, [data]);
  const activity = useMemo(() => asList(data?.institution_activity, []), [data]);
  const topics = asList(data?.top_qa, []);
  const pipeline = asList(data?.content_pipeline, []);

  // Watch time is not a platform metric in the API yet; the per-institution rows add up exactly.
  const watchMinutes = activity.reduce((a, r) => a + (Number(r.watch_minutes) || 0), 0);
  const mix = activity.reduce((acc, r) => ({
    qa: acc.qa + (Number(r.qa) || 0),
    assessments: acc.assessments + (Number(r.assessments) || 0),
  }), { qa: 0, assessments: 0 });

  const m = (key) => metrics[key] || null;
  // Quiz-only score: each college's quiz_avg weighted by its assessments when the rows carry it;
  // the API's platform figure otherwise. The sub line is built here so it only counts assessments.
  const quizRows = activity.filter((r) => 'quiz_avg' in r && r.quiz_avg != null && Number(r.assessments) > 0);
  const quizWeight = quizRows.reduce((a, r) => a + Number(r.assessments), 0);
  const scoreValue = activity.some((r) => 'quiz_avg' in r)
    ? (quizWeight ? `${Math.round((quizRows.reduce((a, r) => a + Number(r.quiz_avg) * Number(r.assessments), 0) / quizWeight) * 10) / 10}%` : '—')
    : m('avg assessment score')?.value;
  const avgScore = pct(scoreValue);
  const scoreSub = data ? (mix.assessments ? plural(mix.assessments, 'assessment', 'assessments') : 'No scored attempts yet') : null;
  const kpis = [
    { icon: 'building', label: 'Institutions', value: m('institutions') ? formatCount(m('institutions').value) : null, sub: m('institutions')?.trend },
    // Watch time rides on the students tile so the row stays at four tiles (spec: max 4 per row).
    { icon: 'users', label: 'Active students', value: m('active students') ? formatCount(m('active students').value) : null, sub: data ? formatMinutes(watchMinutes) : null },
    { icon: 'tick', label: 'Completion rate', value: m('completion rate')?.value, sub: m('completion rate')?.trend },
    {
      icon: 'chart',
      label: 'Avg assessment score',
      value: data ? scoreValue : null,
      sub: avgScore != null ? <><BandPill score={avgScore} /> {scoreSub}</> : scoreSub,
    },
  ];

  const comparison = useMemo(() => {
    const pick = {
      completion: (r) => r.completion,
      score: (r) => ('quiz_avg' in r ? r.quiz_avg : r.avg_score),
      watch: (r) => r.watch_minutes,
      qa: (r) => r.qa,
    }[metric];
    return activity
      .map((r) => ({
        key: String(r.id),
        label: r.institution || r.college,
        sub: r.university || r.code || null,
        value: pick(r) == null ? null : Number(pick(r)),
        href: `/superadmin/colleges/${r.id}`,
      }))
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  }, [activity, metric]);

  const isBand = metric === 'completion' || metric === 'score';
  const attentionItems = attention?.items || [];
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || 'Last 30 days';

  return (
    <ModulePage className="sa-page sa-dash">
      <ModuleHead
        actions={(
          <div className="sa-range">
            <QuirriSelect
              ariaLabel="Date range"
              value={range}
              onChange={(e) => setUrl({ range: e.target.value })}
              options={RANGES}
            />
          </div>
        )}
      />

      <PortalHero
        eyebrow="Super Admin"
        title={!mounted ? 'Dashboard' : name ? `${greeting()}, ${name}` : greeting()}
        description={`How colleges are using Quirri · ${rangeLabel.toLowerCase()}.`}
        secondaryHref="/superadmin/colleges"
        secondaryLabel="Add a college"
        primaryHref="/superadmin/users"
        primaryLabel="Add a user"
        sideTitle="Needs your attention"
      >
        <AttentionList
          items={attentionItems.slice(0, 5)}
          loading={attentionLoading && !attention}
          checked={Boolean(attention?.checked)}
        />
      </PortalHero>

      <section className="sd-kpis" aria-label="Platform summary">
        {kpis.map((k) => (
          <Kpi key={k.label} icon={k.icon} label={k.label} value={firstLoad ? null : (k.value ?? '—')} sub={firstLoad ? 'Loading…' : k.sub} />
        ))}
      </section>

      {unavailable ? (
        <SectionState title="Dashboard metrics not available">
          The dashboard API is not reachable. No sample numbers are shown.
        </SectionState>
      ) : null}
      {hardError ? (
        <SectionState
          tone="err"
          title="Could not load the dashboard"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <div className="sa-cols">
        <Panel
          title="Institution comparison"
          action={(
            <SegTabs
              label="Compare by"
              options={METRICS}
              value={metric}
              onChange={(v) => setUrl({ metric: v })}
            />
          )}
          className="sa-compare"
        >
          {firstLoad ? <p className="dv-empty">Loading institutions…</p> : (
            <MetricList
              label="Institution comparison"
              items={comparison}
              colorBy={isBand ? 'band' : 'series'}
              format={metric === 'watch' ? formatMinutes : isBand ? formatPct : undefined}
              empty="No active colleges yet."
            />
          )}
        </Panel>

        <Panel
          title="Activity mix"
          className="mdc-card"
          action={firstLoad ? null : <div className="mdc-chip"><small>Total activities</small><b>{formatCount(mix.qa + mix.assessments)}</b></div>}
        >
          {firstLoad ? <p className="dv-empty">Loading activity…</p> : (
            <ModernDonut
              compact
              title="Activity mix"
              unit="Activities"
              parts={[
                { key: 'qa', label: 'Q&A', value: mix.qa, tone: 'info' },
                { key: 'assessments', label: 'Assessments', value: mix.assessments, tone: 'good' },
              ]}
              empty="No learning activity in this range."
            />
          )}
        </Panel>
      </div>

      <Panel title="Top Q&A queries">
        {firstLoad ? <p className="dv-empty">Loading questions…</p> : (
          <MetricList
            label="Top Q&A queries"
            items={topics.map((t, i) => ({ key: `${i}-${t.topic}`, label: t.topic, sub: t.chapter || null, value: Number(t.count) || 0 }))}
            colorBy="single"
            empty="No questions asked in this range."
          />
        )}
      </Panel>

      {pipeline.length ? (
        <Panel title="Content pipeline" bodyClassName={null}>
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight sa-stack">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Institution</th>
                  <th>Stage</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((row) => {
                  const progress = Math.min(100, Math.max(0, Number(row.progress) || 0));
                  return (
                    <tr key={row.id}>
                      <td>
                        <b>{row.chapter}</b>
                        {row.meta ? <small className="sa-row-code">{row.meta}</small> : null}
                      </td>
                      <td data-label="Institution">{row.institution || '—'}</td>
                      <td data-label="Stage">{row.stage || '—'}</td>
                      <td data-label="Progress">
                        <div className="sa-progress">
                          <span className="dv-track"><span style={{ width: `${progress}%`, background: 'var(--teal-500)' }} /></span>
                          <small>{progress}%</small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </ModulePage>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={<SectionState title="Loading dashboard…" />}>
      <DashboardView />
    </Suspense>
  );
}
