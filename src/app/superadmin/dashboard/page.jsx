'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import {
  ModulePage,
  ModuleHead,
  Panel,
  Kpi,
  SegTabs,
  Icon,
  SectionState,
} from '@/components/shared/module-ui';
import { MetricList, ModernDonut, BandPill } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  dashboardApi, collegesApi, healthApi, notificationsApi, fetchData,
} from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, apiErrorMessage, isApiUnavailable, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useLiveRefresh, useTimeAgo } from '@/hooks/useLiveRefresh';
import { useUrlState } from '@/hooks/useUrlState';
import { formatCount, formatMinutes, formatPct } from '@/lib/superadmin/format';
import { overallHealth, toNumber } from '@/lib/superadmin/health';
import { isInterviewOff } from '@/lib/product/interviewOff';

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
  if (health) items.push(...overallHealth(health).items);
  if (failedRecent) {
    items.push({
      id: 'failed-notifications',
      title: `${plural(failedRecent, 'notification', 'notifications')} failed in the last 7 days`,
      body: 'Retry them from Notifications.',
      tone: 'warning',
      href: '/superadmin/notifications?status=failed&days=7',
    });
  }
  if (pendingInvites) {
    items.push({
      id: 'pending-invites',
      title: `${plural(pendingInvites, 'invite', 'invites')} not accepted yet`,
      body: 'These people have not set a password. Resend the invite if needed.',
      tone: 'info',
      href: '/superadmin/users?tab=pending',
    });
  }
  if (inactiveColleges) {
    items.push({
      id: 'inactive-colleges',
      title: `${plural(inactiveColleges, 'college is', 'colleges are')} deactivated`,
      body: 'Their people cannot sign in. Reactivate from Colleges if this is a mistake.',
      tone: 'info',
      href: '/superadmin/colleges?status=false',
    });
  }
  return { items, checked: Boolean(health) || pendingInvites != null || inactiveColleges != null };
}

function AttentionList({ items }) {
  return (
    <ul className="sa-attn-list">
      {items.map((item) => (
        <li key={item.id}>
          <span className={`sa-attn-dot is-${item.tone || 'info'}`} aria-hidden="true" />
          <div>
            <Link className="sa-attn-t" href={item.href}>{item.title}</Link>
            {item.body ? <small>{item.body}</small> : null}
          </div>
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
  const [url, setUrl] = useUrlState({ range: 'last_30_days', metric: 'completion' });
  const range = RANGE_KEYS.includes(url.range) ? url.range : 'last_30_days';
  const metric = METRICS.some((m) => m.value === url.metric) ? url.metric : 'completion';
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || 'Last 30 days';

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchOptional(() => dashboardApi.getOverview({ range })),
    [range],
  );
  const { data: attention, loading: attentionLoading, reload: reloadAttention } = useAsyncResource(loadAttention, []);
  // Live like the student pages: every minute + when the tab regains focus.
  const ago = useTimeAgo(useLiveRefresh(() => Promise.all([reload({ silent: true }), reloadAttention({ silent: true })])));

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
    { icon: 'users', label: 'Active students', value: m('active students') ? formatCount(m('active students').value) : null, sub: data ? `${formatMinutes(watchMinutes)} watched · ${rangeLabel.toLowerCase()}` : null },
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

      <p className="sa-live" title="Refreshes every minute">Live · updated {ago}</p>

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
          sub={`${METRICS.find((x) => x.value === metric)?.label} per active college · ${rangeLabel.toLowerCase()}`}
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
              empty="No active colleges yet. Colleges appear here once they are onboarded."
            />
          )}
          <div className="sa-panel-foot">
            <Link className="sp-link" href="/superadmin/reports">
              Open institution report <Icon name="arrow" size={14} />
            </Link>
          </div>
        </Panel>

        <Panel title="Attention needed" sub="What to act on, and where to fix it.">
          {attentionItems.length ? <AttentionList items={attentionItems.slice(0, 6)} /> : (
            <p className="sa-attn-none">
              {attentionLoading && !attention
                ? 'Checking the platform…'
                : attention?.checked
                  ? 'Nothing needs attention. Services, invites, colleges and notifications look normal.'
                  : 'Could not check the platform right now. It will try again in a minute.'}
            </p>
          )}
          {data && !pipeline.length ? (
            <p className="sa-attn-note"><Icon name="layers" size={14} /> No chapters generating right now.</p>
          ) : null}
        </Panel>
      </div>

      <div className="dv-grid">
        <Panel title="Top Q&A queries" sub={`Most-asked questions to the AI tutor · ${rangeLabel.toLowerCase()}`}>
          {firstLoad ? <p className="dv-empty">Loading questions…</p> : (
            <MetricList
              label="Top Q&A queries"
              items={topics.map((t, i) => ({ key: `${i}-${t.topic}`, label: t.topic, sub: t.chapter || null, value: Number(t.count) || 0 }))}
              colorBy="single"
              empty="No questions asked in this range."
            />
          )}
        </Panel>
        <Panel
          title="Activity mix"
          sub={`Q&A turns and assessments · ${rangeLabel.toLowerCase()}`}
          className="mdc-card"
          action={firstLoad ? null : <div className="mdc-chip"><small>Total activities</small><b>{formatCount(mix.qa + mix.assessments)}</b></div>}
        >
          {firstLoad ? <p className="dv-empty">Loading activity…</p> : (
            <ModernDonut
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

      {pipeline.length ? (
        <Panel
          title="Content pipeline"
          sub="Chapters being turned into lectures and assessments right now."
          bodyClassName={null}
        >
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
          <div className="sa-panel-foot sa-panel-foot--pad">
            <Link className="sp-link" href="/superadmin/content">Open Upload &amp; content <Icon name="arrow" size={14} /></Link>
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
