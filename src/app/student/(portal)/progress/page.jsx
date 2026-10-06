'use client';

import Link from 'next/link';
import PerformanceChart from '@/components/student/dashboard/PerformanceChart';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHome } from '@/lib/student/dashboardModel';

const QUIZ_LABEL = {
  done: { text: 'Completed', cls: 'sp-pill--good' },
  open: { text: 'Ready to attempt', cls: 'sp-pill--teal' },
  unavailable: { text: 'Not ready yet', cls: '' },
  unchecked: { text: 'Open to check', cls: '' },
};

function scoreCls(n) {
  if (n == null) return '';
  if (n >= 75) return ' sp-score--good';
  if (n < 50) return ' sp-score--low';
  return '';
}

/** My progress — chapter completion, assessments and interview readiness (live data only). */
export default function StudentProgressPage() {
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHome, []);
  const isLoading = loading && !m;
  const a = m?.assessments;
  const pct = a?.available ? Math.round((a.done / a.available) * 100) : 0;

  return (
    <div className="sp animate-fade-in" aria-busy={isLoading}>
      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your progress"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      <section className="sd-kpis" aria-label="Progress summary">
        <Kpi icon="play" label="Chapters published" value={m?.counts?.lectures} sub={`${m?.counts?.subjects ?? '—'} subject${m?.counts?.subjects === 1 ? '' : 's'}`} />
        <Kpi icon="check" label="Assessments done" value={a ? `${a.done}/${a.available}` : null} sub={`${pct}% of available quizzes`} />
        <Kpi icon="trend" label="Assessment average" value={a?.avg != null ? `${Math.round(a.avg)}%` : null} sub={a?.best != null ? `Best ${a.best}%` : 'After your first quiz'} />
        <Kpi icon="mic" label="Interview average" value={m?.interviews?.avg != null ? Math.round(m.interviews.avg) : null} sub={`${m?.interviews?.total ?? 0} completed`} />
      </section>

      <section className="sd-limits" aria-label="Assessment completion">
        <span className="sd-limits-h"><Icon name="layers" size={16} /> Semester progress</span>
        <span>Assessments: <b className="is-amber">{a?.done ?? 0}/{a?.available ?? 0}</b> completed</span>
        <span className="sd-strip-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        <Link className="sd-limits-link" href="/student/subjects">
          Go to My subjects <Icon name="arrow" size={14} />
        </Link>
      </section>

      <div className="sp-panel">
        <div className="sp-panel-h">
          <div>
            <h3>Chapter progress</h3>
            <p>Every published chapter and your assessment result</p>
          </div>
          <span className="sp-pill sp-pill--teal">{m?.chapterRows?.length ?? 0} chapters</span>
        </div>
        {m?.chapterRows?.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Subject</th>
                  <th>Published</th>
                  <th>Assessment</th>
                  <th className="num">Score</th>
                </tr>
              </thead>
              <tbody>
                {m.chapterRows.map((r) => {
                  const label = QUIZ_LABEL[r.quiz] || QUIZ_LABEL.unchecked;
                  return (
                    <tr key={r.jobId}>
                      <td><b>{r.title}</b></td>
                      <td>{r.subject}</td>
                      <td>{r.published || '—'}</td>
                      <td>
                        <span className={`sp-pill ${label.cls}`}>{label.text}</span>
                        {r.quiz === 'open' || r.quiz === 'unchecked' ? (
                          <>
                            {' '}
                            <Link
                              className="sp-link"
                              href={`/student/assessment?job=${encodeURIComponent(r.jobId)}&title=${encodeURIComponent(r.title)}`}
                            >
                              Open
                            </Link>
                          </>
                        ) : null}
                      </td>
                      <td className="num">
                        {r.score != null ? (
                          <span className={`sp-score${scoreCls(r.score)}`}>{r.score}<small>%</small></span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sp-panel-b">
            <SectionState title={isLoading ? 'Loading chapters' : 'No chapters published yet'}>
              {isLoading ? null : 'Chapters appear after your HOD or faculty publishes lectures for your department.'}
            </SectionState>
          </div>
        )}
      </div>

      <section className="sd-bottom">
      <div className="sd-card sd-perf">
        <div className="sd-card-h">
          <div>
            <h3>Assessment score trend</h3>
            <p>Your chapter quiz scores in the order you took them</p>
          </div>
          <button type="button" className="sd-iconbtn" onClick={() => reload().catch(() => {})} aria-label="Refresh">
            <Icon name="refresh" size={16} />
          </button>
        </div>
        {m?.trend?.length ? (
          <PerformanceChart items={m.trend} ariaLabel="Your chapter assessment scores over time" />
        ) : (
          <SectionState title={isLoading ? 'Loading your scores' : 'No assessments taken yet'}>
            {isLoading ? null : 'Take a chapter assessment from My subjects — your scores plot here.'}
          </SectionState>
        )}
      </div>

      <div className="sp-panel">
        <div className="sp-panel-h">
          <div>
            <h3>Interview readiness</h3>
            <p>Your completed mock and full interviews</p>
          </div>
          <Link className="sd-chip" href="/student/interviews">Practise now <Icon name="chev" size={14} /></Link>
        </div>
        {m?.interviewRows?.length ? (
          <ul className="sp-rows">
            {m.interviewRows.map((r) => (
              <li key={r.id} className="sp-row">
                <span className="sp-row-ic"><Icon name={r.mode === 'full' ? 'layers' : 'mic'} size={18} /></span>
                <div className="sp-row-main">
                  <b>{r.title}</b>
                  <div className="sp-row-meta">
                    <span className="sp-pill sp-pill--teal">{r.mode === 'full' ? 'Full' : 'Mock'}</span>
                    {r.date ? <span>{r.date}</span> : null}
                  </div>
                </div>
                <div className="sp-row-side">
                  <span className={`sp-score${r.score != null && r.score >= 80 ? ' sp-score--good' : r.score != null && r.score < 65 ? ' sp-score--low' : ''}`}>
                    {r.score ?? '—'}<small>/100</small>
                  </span>
                  <Link className="sd-btn sd-btn--outline sd-btn--sm" href={`/student/interviews/report?session=${encodeURIComponent(r.id)}`}>
                    View report
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sp-panel-b">
            <SectionState title={isLoading ? 'Loading interviews' : 'No interviews yet'}>
              {isLoading ? null : 'Start a mock interview — completed reports appear here with their scores.'}
            </SectionState>
          </div>
        )}
      </div>
      </section>
    </div>
  );
}
