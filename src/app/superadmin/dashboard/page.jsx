'use client';

import Link from 'next/link';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import PortalHero from '@/components/shared/PortalHero';
import { dashboardApi } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage, isApiUnavailable, fetchOptional } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

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
    ['active_students', 'Active Students', data?.students_note],
    ['completion_rate', 'Completion Rate', data?.completion_note],
    ['avg_assessment', 'Avg Assessment', data?.assessment_note],
    ['watch_time', 'Watch Time', data?.watch_note],
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

  return (
    <div className="animate-fade-in">
      <PortalHero
        eyebrow="Super Admin · Platform"
        title="Platform overview"
        description="Every university, college and user on Quirri, in one place. Content, health and audit trails roll up here across all tenants."
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

      {unavailable ? (
        <div className="notice info" style={{ marginBottom: 12 }}>
          <div>
            <b>Dashboard metrics not available</b>
            Tables below stay empty until the dashboard API is reachable. No sample numbers are shown.
          </div>
        </div>
      ) : null}

      {loading && !data ? <p style={{ color: 'var(--muted)', marginBottom: 12 }}>Loading dashboard…</p> : null}

      <div className="stats">
        {metrics.length ? metrics.map((m) => (
          <div className="stat" key={m.k}>
            <div className="k">{m.k}</div>
            <div className="v">{m.v}</div>
            {m.s ? <div className={`s${m.up ? ' up' : ''}`}>{m.s}</div> : null}
          </div>
        )) : (
          !loading ? (
            <div className="stat">
              <div className="k">Overview</div>
              <div className="v">—</div>
              <div className="s">No metrics returned</div>
            </div>
          ) : null
        )}
      </div>

      <div className="cols a" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Institution activity</h3>
            <Link className="link" href="/superadmin/colleges">All colleges →</Link>
          </div>
          <div className="card-sub">Learning, Q&amp;A and assessment performance per institution.</div>
          <table>
            <thead>
              <tr>
                <th>Institution</th>
                <th>Students</th>
                <th>Watch time</th>
                <th>Q&amp;A</th>
                <th>Avg score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !activity.length ? (
                <tr><td colSpan={6}>No institution activity yet.</td></tr>
              ) : null}
              {activity.map((row) => (
                <tr key={row.id || row.institution || row.college}>
                  <td>
                    <span className="strong">{row.institution || row.college || row.name}</span>
                    {row.university || row.sub ? (
                      <div className="sub">{row.university || row.sub}</div>
                    ) : null}
                  </td>
                  <td className="num">{row.students ?? row.student_count ?? '—'}</td>
                  <td className="num">{row.watch_time || row.duration || row.hours || '—'}</td>
                  <td className="num">{row.qa || row.questions || '—'}</td>
                  <td>
                    <QuirriBadge variant={pillVariant(row.score_status || 'green')} plain>
                      {row.avg_score || row.score || row.quality || '—'}
                    </QuirriBadge>
                  </td>
                  <td>
                    <QuirriBadge variant={pillVariant(row.status)}>
                      {row.status || '—'}
                    </QuirriBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-p">
          <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 3 }}>Top Q&amp;A topics</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>
            Clustered from student questions across all institutions.
          </p>
          {!loading && !topics.length ? (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>No topic data yet.</p>
          ) : null}
          {topics.map((t, i) => {
            const count = Number(t.count || t.value || 0);
            const width = Math.round((count / maxTopic) * 100);
            const colors = ['var(--blue)', 'var(--sky)', 'var(--violet)', 'var(--amber)', 'var(--green)'];
            return (
              <div className="cmp" key={t.topic || t.name || i}>
                <div className="nm">{t.topic || t.name || t.nm}</div>
                <div className="track">
                  <i style={{ width: `${width}%`, background: colors[i % colors.length] }} />
                </div>
                <div className="val">{count || t.val || '—'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Content pipeline — live</h3>
          <Link className="link" href="/superadmin/health">Platform health →</Link>
        </div>
        <div className="card-sub">AI generation jobs currently moving through the pipeline, across all institutions.</div>
        <table>
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
            {!loading && !pipeline.length ? (
              <tr><td colSpan={5}>No pipeline jobs right now.</td></tr>
            ) : null}
            {pipeline.map((row) => {
              const progress = Number(row.progress ?? row.percent ?? 0);
              return (
                <tr key={row.id || row.chapter}>
                  <td>
                    <span className="strong">{row.chapter || row.chapter_title || row.title}</span>
                    {row.meta || row.subject ? (
                      <div className="sub">{row.meta || row.subject}</div>
                    ) : null}
                  </td>
                  <td>{row.institution || row.college || '—'}</td>
                  <td>{row.stage || '—'}</td>
                  <td style={{ width: 170 }}>
                    <div className={`bar${progress >= 100 ? ' green' : ''}`}>
                      <i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                    </div>
                  </td>
                  <td>
                    <QuirriBadge variant={pillVariant(row.status)}>
                      {row.status || '—'}
                    </QuirriBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
