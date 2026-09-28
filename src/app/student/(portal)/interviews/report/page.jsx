'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon, SectionState } from '@/components/student/ui';
import {
  asStringList,
  formatDate,
  formatDurationSec,
  scoreBandKey,
  turnScore100,
  useInterviewReport,
} from '@/lib/student/interviewReport';

const BAND_LABEL = {
  good: 'Strong performance',
  mid: 'On track',
  low: 'Needs practice',
  none: 'Not scored',
};

function ScoreRing({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const band = scoreBandKey(value);
  return (
    <div className="sp-result-ring" role="img" aria-label={`Overall score ${value ?? 'not available'} out of 100`}>
      <svg viewBox="0 0 120 120">
        <circle className="trk" cx="60" cy="60" r={r} />
        {pct > 0 ? (
          <circle
            className={`fil ${band === 'low' ? 'is-low' : 'is-good'}`}
            cx="60"
            cy="60"
            r={r}
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
        ) : null}
      </svg>
      <span className="num">
        {value ?? '—'}
        <small>Overall</small>
      </span>
    </div>
  );
}

function ReportInner() {
  const params = useSearchParams();
  const sessionId = params.get('session') || params.get('report') || '';
  const { phase, errorMessage, report, slowHint, dimensions } = useInterviewReport(sessionId);

  if (!sessionId) {
    return (
      <div className="sp">
        <SectionState
          tone="err"
          title="No report selected"
          action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href="/student/interviews/reports">Go to My reports</Link>}
        >
          Open a report from My reports.
        </SectionState>
      </div>
    );
  }

  const back = (
    <Link className="sp-back" href="/student/interviews/reports">
      <Icon name="back" size={16} /> All reports
    </Link>
  );

  if (phase === 'loading') {
    return (
      <div className="sp animate-fade-in">
        {back}
        <section className="iv-generating" aria-live="polite">
          <span className="iv-generating-orb" aria-hidden="true"><Icon name="spark" size={26} /></span>
          <div>
            <h2>Generating your report</h2>
            <p>
              {slowHint
                ? 'This is taking longer than usual. You can stay on this page — we will keep checking.'
                : 'Quirri is scoring your answers. This usually takes under a minute.'}
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (phase === 'failed' || phase === 'cancelled' || !report) {
    return (
      <div className="sp animate-fade-in">
        {back}
        <SectionState
          tone="err"
          title={phase === 'cancelled' ? 'No report' : 'Could not load report'}
          action={<Link className="sd-btn sd-btn--amber sd-btn--sm" href="/student/interviews">Start a new interview</Link>}
        >
          {errorMessage || 'Please try again.'}
        </SectionState>
      </div>
    );
  }

  const overall = report.overall_score != null && Number.isFinite(Number(report.overall_score))
    ? Math.round(Number(report.overall_score))
    : null;
  const band = scoreBandKey(overall);
  const turns = Array.isArray(report.turn_scores) ? report.turn_scores : [];
  const actions = asStringList(report.action_plan || report.recommended_next_practice);
  const typeLabel = report.interview_type === 'full' ? 'Full interview' : report.interview_type === 'mock' ? 'Mock interview' : 'Interview';
  const heading = report.position || report.title || report.summary_title || 'Interview report';
  const date = formatDate(report.completed_date || report.recording_started_at);
  const duration = formatDurationSec(report.recording_duration_sec);

  return (
    <div className="sp animate-fade-in">
      {back}

      <section className="sp-result iv-report-hero" aria-label="Report summary">
        <ScoreRing value={overall} />
        <div className="sp-result-copy">
          <div className="sp-banner-eyebrow">Interview report</div>
          <h2>{heading}</h2>
          <div className="sp-banner-meta">
            <span className="sp-pill sp-pill--glass"><Icon name={report.interview_type === 'full' ? 'layers' : 'mic'} size={14} /> {typeLabel}</span>
            {date ? <span className="sp-pill sp-pill--glass"><Icon name="calendar" size={14} /> {date}</span> : null}
            {duration ? <span className="sp-pill sp-pill--glass"><Icon name="clock" size={14} /> {duration}</span> : null}
            <span className={`sp-pill ${band === 'good' ? 'sp-pill--good' : band === 'low' ? 'sp-pill--low' : 'sp-pill--teal'}`}>{BAND_LABEL[band]}</span>
          </div>
          {report.summary ? <p className="iv-summary">{report.summary}</p> : null}
        </div>
        <div className="iv-report-cta">
          <Link className="sd-btn sd-btn--amber" href="/student/interviews">
            <Icon name="refresh" size={16} /> Practise again
          </Link>
        </div>
      </section>

      <section className="iv-dims" aria-label="Score by dimension">
        {dimensions.map((d) => {
          const n = d.score == null ? null : Math.round(d.score);
          const weak = n != null && n < 70;
          return (
            <div key={d.label} className={`iv-dim${weak ? ' is-weak' : ''}`}>
              <div className="iv-dim-h">
                <span className="iv-dim-ic"><Icon name={d.icon} size={16} /></span>
                <span>{d.label}</span>
                <b>{n ?? '—'}</b>
              </div>
              <span className="iv-dim-bar" aria-hidden="true">
                <i style={{ width: `${n == null ? 0 : Math.min(100, Math.max(0, n))}%` }} />
              </span>
              <small>{n == null ? 'Not scored' : weak ? 'Focus area' : 'Strength'}</small>
            </div>
          );
        })}
      </section>

      <div className="iv-report-body">
        <section className="sp-panel">
          <div className="sp-panel-h">
            <div>
              <h3>Question-by-question feedback</h3>
              <p>{turns.length ? `${turns.length} question${turns.length === 1 ? '' : 's'} scored` : 'Detailed feedback for each answer'}</p>
            </div>
          </div>
          {!turns.length ? (
            <div className="sp-panel-b">
              <SectionState title="No question scores yet">
                Detailed turn feedback was not returned for this session.
              </SectionState>
            </div>
          ) : (
            <ol className="iv-turns">
              {turns.map((turn, idx) => {
                const s100 = turnScore100(turn.score);
                const tb = scoreBandKey(s100);
                const tags = [turn.dimension, turn.tag, turn.category].filter(Boolean);
                return (
                  <li key={turn.turn_number ?? idx} className="iv-turn">
                    <div className="iv-turn-h">
                      <span className="iv-turn-n">Q{idx + 1}</span>
                      <b>{turn.question || `Question ${idx + 1}`}</b>
                      <span className={`iv-score-chip iv-score-chip--${tb}`}>{s100 ?? '—'}</span>
                    </div>
                    {turn.ai_feedback ? (
                      <div className="sp-explain">
                        <Icon name="spark" size={16} />
                        <div><b>Feedback</b>{turn.ai_feedback}</div>
                      </div>
                    ) : null}
                    {tags.length ? (
                      <div className="sp-row-meta">
                        {tags.map((t) => <span key={t} className="sp-pill">{String(t).replace(/_/g, ' ')}</span>)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="sp">
          <section className="sd-focus" aria-labelledby="iv-plan-h">
            <div className="sd-focus-h">
              <span className="sd-focus-ic"><Icon name="trend" size={18} /></span>
              <h3 id="iv-plan-h">Your improvement plan</h3>
            </div>
            {actions.length ? (
              <ol className="iv-plan">
                {actions.slice(0, 5).map((item, i) => (
                  <li key={`${i}-${item.slice(0, 24)}`}><span>{i + 1}</span>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="sd-focus-empty">No improvement plan was returned for this session.</p>
            )}
          </section>

          <section className="sp-panel">
            <div className="sp-panel-b sp">
              <b className="iv-next-h">Ready for another round?</b>
              <p className="iv-next-p">Practise the same role again to see your score move.</p>
              <div className="sp-banner-cta">
                <Link className="sd-btn sd-btn--outline sd-btn--sm" href="/student/interviews">New interview</Link>
                <Link className="sd-btn sd-btn--ghost sd-btn--sm" href="/student/interviews/reports">All reports</Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function StudentInterviewReportPage() {
  return (
    <Suspense fallback={<div className="sp"><SectionState title="Loading report…" /></div>}>
      <ReportInner />
    </Suspense>
  );
}
