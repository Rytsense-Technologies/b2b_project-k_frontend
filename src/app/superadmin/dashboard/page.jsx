'use client';

import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import {
  ModulePage,
  KpiRow,
  Panel,
  Kpi,
  Icon,
  SectionState,
  initials,
} from '@/components/shared/module-ui';
import { dashboardApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, isApiUnavailable, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const METRIC_ICONS = ['building', 'users', 'tick', 'chart', 'clock'];

/** Expected platform metrics — shown as "—" until the dashboard API reports them. */
const METRIC_PLACEHOLDERS = [
  { k: 'Institutions', icon: 'building' },
  { k: 'Active students', icon: 'users' },
  { k: 'Completion rate', icon: 'tick' },
  { k: 'Avg assessment', icon: 'chart' },
];

const SHORTCUTS = [
  { href: '/superadmin/universities', icon: 'book', title: 'Universities', body: 'Top of the academic hierarchy' },
  { href: '/superadmin/colleges', icon: 'building', title: 'Colleges', body: 'Onboard colleges and their admins' },
  { href: '/superadmin/departments', icon: 'tree', title: 'Departments', body: 'Departments under each college' },
  { href: '/superadmin/users', icon: 'users', title: 'Platform users', body: 'Everyone, across every institution' },
];

const TONE = { green: 'sp-pill--good', amber: 'sp-pill--low', red: 'sp-pill--err', blue: 'sp-pill--teal', grey: '' };

function pickMetrics(data) {
  const fromArray = asList(data?.metrics, []);
  if (fromArray.length) {
    return fromArray.map((m) => ({
      k: m.title || m.k || m.label,
      v: m.value ?? m.v,
      s: m.trend || m.s || m.subtitle,
      up: m.trendUp || String(m.trend || '').includes('+'),
    }));
  }
  const keys = [
    ['institutions', 'Institutions', data?.institutions_note],
    ['active_students', 'Active students', data?.students_note],
    ['completion_rate', 'Completion rate', data?.completion_note],
    ['avg_assessment', 'Avg assessment', data?.assessment_note],
    ['watch_time', 'Watch time', data?.watch_note],
  ];
  return keys
    .filter(([key]) => data?.[key] != null)
    .map(([key, label, note]) => ({
      k: label,
      v: data[key],
      s: note || '',
    }));
}

function pillVariant(status) {
  const v = String(status || '').toLowerCase();
  if (v.includes('healthy') || v.includes('active') || v.includes('ok')) return 'green';
  if (v.includes('low') || v.includes('push') || v.includes('pending') || v.includes('amber')) return 'amber';
  if (v.includes('fail') || v.includes('retry') || v.includes('error')) return 'red';
  if (v.includes('generat')) return 'blue';
  return 'grey';
}

function Pill({ status, children, dot = true }) {
  return (
    <span className={`sp-pill ${TONE[pillVariant(status)]}`.trim()}>
      {dot ? <i className="un-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Empty panel body: Teal 300 outline icon, title, one line. */
function PanelEmpty({ icon, title, children }) {
  return (
    <div className="sa-empty">
      <span className="sa-empty-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data, loading, error } = useAsyncResource(
    () => fetchOptional(() => dashboardApi.getOverview({ range: 'last_30_days' })),
    [],
  );

  const unavailable = !loading && data == null && !error;
  const hardError = error && !isApiUnavailable(error);

  const metrics = pickMetrics(data);
  const activity = asList(
    data?.institution_activity || data?.learning_activity || data?.institutions_activity,
    [],
  );
  const topics = asList(data?.top_qa || data?.top_topics || data?.qa_topics, []);
  const pipeline = asList(data?.content_pipeline || data?.pipeline || data?.jobs, []);
  const maxTopic = Math.max(...topics.map((t) => Number(t.count || t.value || 0)), 1);

  const kpis = metrics.length
    ? metrics.map((m, i) => ({ icon: METRIC_ICONS[i % METRIC_ICONS.length], label: m.k, value: m.v, sub: m.s || null }))
    : METRIC_PLACEHOLDERS.map((m) => ({ icon: m.icon, label: m.k, value: null, sub: loading ? 'Loading…' : 'Not reported yet' }));

  return (
    <ModulePage className="sa-page sa-dash">
      <PortalHero
        eyebrow="Super Admin · Platform"
        title="Platform overview"
        description="Every university, college and user on Quirri, in one place. Content and health signals roll up here across all tenants."
        secondaryHref="/superadmin/universities"
        secondaryLabel="Onboard a university"
        primaryHref="/superadmin/health"
        primaryLabel="View platform health"
        sideTitle="Attention needed"
        sideBadge={hardError ? 'Error' : unavailable ? 'Soon' : 'Live'}
        sideItems={hardError ? [{
          id: 'err',
          title: 'Could not load dashboard signals',
          body: apiErrorMessage(error, 'Please try again.'),
          tone: 'error',
        }] : unavailable ? [{
          id: 'soon',
          title: 'Platform analytics not live yet',
          body: 'Dashboard APIs are not available. Manage universities, colleges, and users from their modules.',
          tone: 'info',
        }] : [{
          id: 'empty',
          title: 'Counts are live',
          body: 'Institution and user totals come from the platform database. Watch time, Q&A topics, and pipeline jobs appear when learning analytics ship.',
          tone: 'info',
        }]}
      />

      {kpis.length > 4 ? (
        <section className="sd-kpis sa-kpis--5" aria-label="Platform summary">
          {kpis.map((k) => <Kpi key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} />)}
        </section>
      ) : (
        <KpiRow label="Platform summary" items={kpis} />
      )}

      {unavailable ? (
        <SectionState title="Dashboard metrics not available">
          Panels below stay empty until the dashboard API is reachable. No sample numbers are shown.
        </SectionState>
      ) : null}

      {hardError ? (
        <SectionState tone="err" title="Could not load the dashboard">
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <div className="sa-cols">
        <Panel
          title="Institution activity"
          sub="Learning, Q&A and assessment performance per institution."
          action={<Link className="sp-link" href="/superadmin/colleges">All colleges <Icon name="arrow" size={14} /></Link>}
          bodyClassName={null}
        >
          {activity.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th className="num">Students</th>
                    <th className="num">Watch time</th>
                    <th className="num">Q&amp;A</th>
                    <th>Avg score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((row) => {
                    const name = row.institution || row.college || row.name;
                    return (
                      <tr key={row.id || row.institution || row.college}>
                        <td>
                          <div className="pm-person">
                            <span className="un-mono un-mono--sm">{initials(name)}</span>
                            <div>
                              <b>{name}</b>
                              {row.university || row.sub ? <small>{row.university || row.sub}</small> : null}
                            </div>
                          </div>
                        </td>
                        <td className="num">{row.students ?? row.student_count ?? '—'}</td>
                        <td className="num">{row.watch_time || row.duration || row.hours || '—'}</td>
                        <td className="num">{row.qa || row.questions || '—'}</td>
                        <td>
                          <Pill status={row.score_status || 'green'} dot={false}>
                            {row.avg_score || row.score || row.quality || '—'}
                          </Pill>
                        </td>
                        <td><Pill status={row.status}>{row.status || '—'}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <PanelEmpty icon="building" title={loading ? 'Loading activity…' : 'No institution activity yet'}>
              {loading ? null : 'Per-institution learning, Q&A and scores appear here once students start using Quirri.'}
            </PanelEmpty>
          )}
        </Panel>

        <Panel title="Top Q&A topics" sub="Clustered from student questions across all institutions.">
          {topics.length ? (
            <div className="sa-bars">
              {topics.map((t, i) => {
                const count = Number(t.count || t.value || 0);
                const width = Math.round((count / maxTopic) * 100);
                return (
                  <div className="cmp" key={t.topic || t.name || i}>
                    <div className="nm">{t.topic || t.name || t.nm}</div>
                    <div className="track">
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <div className="val">{count || t.val || '—'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <PanelEmpty icon="chat" title={loading ? 'Loading topics…' : 'No topic data yet'}>
              {loading ? null : 'Common question themes show up once students ask the AI tutor.'}
            </PanelEmpty>
          )}
        </Panel>
      </div>

      <Panel
        title="Content pipeline"
        sub="AI generation jobs currently moving through the pipeline, across all institutions."
        action={<Link className="sp-link" href="/superadmin/health">Platform health <Icon name="arrow" size={14} /></Link>}
        bodyClassName={null}
      >
        {pipeline.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table sa-table-tight">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Institution</th>
                  <th>Stage</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((row) => {
                  const progress = Number(row.progress ?? row.percent ?? 0);
                  return (
                    <tr key={row.id || row.chapter}>
                      <td>
                        <div className="pm-person">
                          <span className="sp-row-ic"><Icon name="video" size={18} /></span>
                          <div>
                            <b>{row.chapter || row.chapter_title || row.title}</b>
                            {row.meta || row.subject ? <small>{row.meta || row.subject}</small> : null}
                          </div>
                        </div>
                      </td>
                      <td>{row.institution || row.college || '—'}</td>
                      <td>{row.stage || '—'}</td>
                      <td>
                        <div className="sa-progress">
                          <div className={`bar${progress >= 100 ? ' green' : ''}`}>
                            <i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                          </div>
                          <small>{Math.min(100, Math.max(0, progress))}%</small>
                        </div>
                      </td>
                      <td><Pill status={row.status}>{row.status || '—'}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <PanelEmpty icon="layers" title={loading ? 'Loading pipeline…' : 'No pipeline jobs right now'}>
            {loading ? null : 'Chapters being turned into lectures and assessments appear here while they process.'}
          </PanelEmpty>
        )}
      </Panel>

      <section className="sa-shortcuts" aria-label="Manage the platform">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="sa-shortcut">
            <span className="sp-row-ic"><Icon name={s.icon} size={18} /></span>
            <span className="sa-shortcut-t">
              <b>{s.title}</b>
              <small>{s.body}</small>
            </span>
            <Icon name="chev" size={16} className="sa-shortcut-go" />
          </Link>
        ))}
      </section>
    </ModulePage>
  );
}
