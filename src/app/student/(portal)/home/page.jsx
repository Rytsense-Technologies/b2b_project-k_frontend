'use client';

import Link from 'next/link';
import PerformanceChart from '@/components/student/dashboard/PerformanceChart';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHome, scoreBand } from '@/lib/student/dashboardModel';

/* ---------------------------------------------------------------- icons */
const Ico = {
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7" />,
  play: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  check: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
  mic: <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  clip: <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12l2 2 4-4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chev: <path d="M9 6l6 6-6 6" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

function Svg({ name, size = 18 }) {
  return (
    <svg className="sd-i" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Ico[name] || Ico.info}
    </svg>
  );
}

const SUBJECT_TONES = ['teal', 'green', 'amber', 'deep', 'sky'];

/* ---------------------------------------------------------- pieces */
function Ring({ value, tone, label }) {
  const has = Number.isFinite(value);
  const pct = has ? Math.max(0, Math.min(100, value)) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="sd-ring" role="img" aria-label={`${label}: ${has ? `${value}%` : 'no score yet'}`}>
      <svg viewBox="0 0 100 100">
        <circle className="sd-ring-track" cx="50" cy="50" r={r} />
        {pct > 0 ? (
          <circle className={`sd-ring-fill sd-ring-fill--${tone}`} cx="50" cy="50" r={r} strokeDasharray={`${(pct / 100) * c} ${c}`} />
        ) : null}
      </svg>
      <span className="sd-ring-val">{has ? `${value}%` : '—'}</span>
    </div>
  );
}

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="sd-kpi">
      <div className="sd-kpi-h"><Svg name={icon} size={16} /><span>{label}</span></div>
      <div className="sd-kpi-v">{value ?? '—'}</div>
      {sub ? <div className="sd-kpi-s">{sub}</div> : null}
    </div>
  );
}

function SectionState({ tone = 'info', title, children }) {
  return (
    <div className={`sd-state sd-state--${tone}`}>
      <Svg name="info" size={18} />
      <div>
        <b>{title}</b>
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  );
}

function HeroArt() {
  /* Flat illustration in the teal family (Brand v1.0) — student with a lecture screen. */
  return (
    <svg className="sd-hero-art" viewBox="0 0 220 170" aria-hidden="true">
      <circle cx="120" cy="84" r="78" fill="#0A3F49" />
      <rect x="62" y="30" width="116" height="72" rx="8" fill="#DDE8EA" />
      <rect x="70" y="38" width="100" height="56" rx="4" fill="#0B4B58" />
      <path d="M113 56l16 10-16 10z" fill="#FFFFFF" />
      <circle cx="96" cy="120" r="14" fill="#86AEB5" />
      <path d="M72 162c3-18 12-26 24-26s21 8 24 26z" fill="#4D8691" />
      <rect x="128" y="124" width="44" height="30" rx="4" fill="#B7CED3" />
      <path d="M136 134h28M136 142h18" stroke="#0A3F49" strokeWidth="3" strokeLinecap="round" />
      <circle cx="190" cy="28" r="6" fill="#F5821F" />
    </svg>
  );
}

/* ---------------------------------------------------------- page */
export default function StudentHomePage() {
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHome, []);
  const isLoading = loading && !m;

  const a = m?.assessments;
  const delta = m?.score?.previous != null && m?.score?.current != null ? m.score.current - m.score.previous : null;
  const trendCopy = delta == null
    ? 'Take a couple of chapter assessments to see how your scores move.'
    : delta > 0 ? 'Your assessment score has improved.'
      : delta < 0 ? 'Your last score dipped a little — revise that chapter.'
        : 'Your assessment score is holding steady.';
  const progressPct = a?.available ? Math.round((a.done / a.available) * 100) : 0;

  return (
    <div className={`sd animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      {error && !m ? (
        <div className="sd-alert" role="alert">
          <SectionState tone="err" title="Could not load your home">
            {apiErrorMessage(error, 'Please try again in a moment.')}
          </SectionState>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload().catch(() => {})}>
            <Svg name="refresh" size={16} /> Try again
          </button>
        </div>
      ) : null}

      {/* ---------------- Welcome + up next ---------------- */}
      <section className="sd-top">
        <div className="sd-hero">
          <div className="sd-hero-copy">
            <h2>Welcome back{m?.name ? `, ${m.name}` : ''}!</h2>
            <p>
              Pick up where you left off — watch lectures built from your syllabus, ask the AI tutor,
              take chapter assessments, or practise a mock interview.
            </p>
            <div className="sd-hero-cta">
              <Link className="sd-btn sd-btn--light" href="/student/subjects">Continue learning</Link>
              <Link className="sd-btn sd-btn--amber" href="/student/interviews">Start mock interview</Link>
            </div>
          </div>
          <HeroArt />
        </div>

        <aside className="sd-focus" aria-labelledby="sd-focus-h">
          <div className="sd-focus-h">
            <span className="sd-focus-ic"><Svg name="clip" size={18} /></span>
            <h3 id="sd-focus-h">Up next: assessments</h3>
          </div>
          {m?.upNext?.length ? (
            <ul className="sd-next">
              {m.upNext.map((q) => (
                <li key={q.jobId}>
                  <Link href={`/student/assessment?job=${encodeURIComponent(q.jobId)}&title=${encodeURIComponent(q.title)}`}>
                    <span>
                      <b>{q.title}</b>
                      {q.subject ? <small>{q.subject}</small> : null}
                    </span>
                    <Svg name="chev" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sd-focus-empty">
              {isLoading
                ? 'Checking your chapter quizzes…'
                : a?.done
                  ? 'You are all caught up — every available chapter quiz is done.'
                  : 'Chapter quizzes appear here once your faculty publishes them.'}
            </p>
          )}
        </aside>
      </section>

      {/* ---------------- KPIs ---------------- */}
      <section className="sd-kpis" aria-label="Learning summary">
        <Kpi icon="book" label="My subjects" value={m?.counts?.subjects} sub={m?.deptName || 'Your department'} />
        <Kpi icon="play" label="Lectures published" value={m?.counts?.lectures} sub="Video lectures to watch" />
        <Kpi
          icon="check"
          label="Assessments done"
          value={a ? `${a.done}${a.available ? `/${a.available}` : ''}` : null}
          sub={a?.best != null ? `Best score ${a.best}%` : 'One attempt per chapter'}
        />
        <Kpi
          icon="mic"
          label="Interviews completed"
          value={m?.interviews?.total}
          sub={m?.interviews?.avg != null ? `Average score ${Math.round(m.interviews.avg)}` : 'Mock and full interviews'}
        />
      </section>

      {/* ---------------- Progress strip ---------------- */}
      <section className="sd-limits" aria-label="Assessment progress">
        <span className="sd-limits-h"><Svg name="layers" size={16} /> Semester progress</span>
        <span>Assessments: <b className="is-amber">{a?.done ?? 0}/{a?.available ?? 0}</b> completed</span>
        <span className="sd-strip-bar" aria-hidden="true"><i style={{ width: `${progressPct}%` }} /></span>
        <Link className="sd-limits-link" href="/student/progress">
          View my progress <Svg name="arrow" size={14} />
        </Link>
      </section>

      {/* ---------------- Scores + trend ---------------- */}
      <section className="sd-mid">
        <div className="sd-scores">
          <div className="sd-score-block">
            <h3>Assessment average</h3>
            <Ring value={a?.avg} tone="mist" label="Assessment average" />
          </div>
          <div className="sd-score-block">
            <h3>Interview average</h3>
            <Ring value={m?.interviews?.avg} tone="amber" label="Interview average" />
          </div>
          <p className="sd-scores-note">
            Your chapter assessment and mock interview averages, updated each time Quirri scores a new attempt.
          </p>
        </div>

        <div className="sd-card sd-perf">
          <div className="sd-card-h">
            <h3>Assessment score trend</h3>
            <button type="button" className="sd-iconbtn" onClick={() => reload().catch(() => {})} aria-label="Refresh">
              <Svg name="refresh" size={16} />
            </button>
          </div>

          <div className="sd-perf-sum">
            <div>
              <div className="sd-big">{m?.score?.previous != null ? `${m.score.previous}%` : '—'}</div>
              <div className="sd-lbl">Previous Quiz</div>
            </div>
            <Svg name="arrow" size={28} />
            <div>
              <div className="sd-big is-good">{m?.score?.current != null ? `${m.score.current}%` : '—'}</div>
              <div className="sd-lbl is-good">Latest Quiz</div>
            </div>
            <div className="sd-perf-note">
              <b>{trendCopy}</b>
              <span>Revisit a chapter lecture or ask the AI tutor before your next assessment.</span>
            </div>
          </div>

          {m?.trend?.length ? (
            <PerformanceChart items={m.trend} ariaLabel="Your chapter assessment scores over time" />
          ) : (
            <SectionState title={isLoading ? 'Loading your scores' : 'No assessments taken yet'}>
              {isLoading ? null : 'Open a subject and take a chapter assessment — your scores plot here.'}
            </SectionState>
          )}
        </div>
      </section>

      {/* ---------------- Recent lectures + subject progress ---------------- */}
      <section className="sd-bottom">
        <div className="sd-card">
          <div className="sd-card-h">
            <div>
              <h3>Recent lectures</h3>
              <p>Latest 3 published chapters</p>
            </div>
            <Link className="sd-chip" href="/student/subjects">
              View all subjects <Svg name="chev" size={14} />
            </Link>
          </div>

          {m?.recentLectures?.length ? (
            <ul className="sd-recent">
              {m.recentLectures.map((l) => (
                <li key={l.jobId}>
                  <Link href="/student/subjects" className="sd-recent-row">
                    <div className="sd-recent-main">
                      <b>{l.title}</b>
                      <span className="sd-recent-mode">{l.subject}</span>
                      <div className="sd-recent-meta">
                        {l.duration ? <span className="sd-meta-i"><Svg name="clock" size={12} /> {l.duration}</span> : null}
                        {l.published ? <span>{l.published}</span> : null}
                        {l.quiz === 'open' ? <span className="sd-fb">Quiz open</span> : null}
                        {l.quiz === 'done' ? <span className="sd-fb sd-fb--done">Quiz done</span> : null}
                      </div>
                    </div>
                    <div className={`sd-recent-score sd-tone--${scoreBand(l.score).key}`}>
                      <b>{l.score != null ? <>{l.score}<small>%</small></> : '—'}</b>
                      <span>Quiz score</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <SectionState title={isLoading ? 'Loading lectures' : 'Nothing published yet'}>
              {isLoading ? null : 'Lectures appear here after your HOD or faculty publishes them for your department.'}
            </SectionState>
          )}
        </div>

        <div className="sd-card">
          <div className="sd-card-h">
            <div>
              <h3>Subject progress</h3>
              <p>Chapter assessments completed per subject</p>
            </div>
            <span className="sd-chip sd-chip--static"><Svg name="trend" size={14} /> This semester</span>
          </div>

          {m?.subjects?.length ? (
            <ul className="sd-skills">
              {m.subjects.map((s, i) => (
                <li key={s.key} className={`sd-skill sd-skill--${SUBJECT_TONES[i % SUBJECT_TONES.length]}`}>
                  <span className="sd-skill-ic"><Svg name="book" size={18} /></span>
                  <span className="sd-skill-name">
                    {s.name}
                    <small>
                      {s.chapterCount} chapter{s.chapterCount === 1 ? '' : 's'}
                      {s.quizAvailable ? ` · ${s.quizDone}/${s.quizAvailable} quizzes` : ''}
                      {s.avgScore != null ? ` · avg ${Math.round(s.avgScore)}%` : ''}
                    </small>
                  </span>
                  <span className="sd-skill-val">{s.completion != null ? `${s.completion}%` : '—'}</span>
                  <span className="sd-skill-bar" aria-hidden="true"><i style={{ width: `${s.completion ?? 0}%` }} /></span>
                </li>
              ))}
            </ul>
          ) : (
            <SectionState title={isLoading ? 'Loading subjects' : 'No subjects yet'}>
              {isLoading ? null : 'Your subjects appear once lectures are published for your department.'}
            </SectionState>
          )}
        </div>
      </section>
    </div>
  );
}
