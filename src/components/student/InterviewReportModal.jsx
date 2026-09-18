'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

const STATUS_POLL_MS = 4000;
const STATUS_MAX_MS = 3 * 60 * 1000;

const DIMENSION_LABELS = [
  { key: 'communication', label: 'Communication' },
  { key: 'answer_structure', label: 'Structure', alt: 'structure' },
  { key: 'technical_knowledge', label: 'Technical depth', alt: 'technical_depth' },
  { key: 'confidence', label: 'Confidence' },
];

function scoreTone(score) {
  if (score == null || !Number.isFinite(Number(score))) return { bg: '#EEF0F0', fg: '#4A5A60' };
  const n = Number(score);
  if (n >= 80) return { bg: '#E6F5EE', fg: '#0B5D43' };
  if (n >= 65) return { bg: '#E8F1F3', fg: '#0E5C6B' };
  return { bg: '#FDF1E2', fg: '#8A560A' };
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

function asStringList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.text || item.title || item.message || item.action || null;
      }
      return null;
    })
    .filter(Boolean);
}

function dimensionScore(breakdown, key, alt) {
  if (!breakdown || typeof breakdown !== 'object') return null;
  const v = breakdown[key] ?? (alt ? breakdown[alt] : null);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Interview report modal — polls /status then loads detail.
 */
export default function InterviewReportModal({
  open,
  sessionId,
  onClose,
  interviewType,
  completedDate,
}) {
  const [phase, setPhase] = useState('loading'); // loading | ready | failed | cancelled
  const [errorMessage, setErrorMessage] = useState('');
  const [report, setReport] = useState(null);
  const [slowHint, setSlowHint] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!open || !sessionId) return undefined;

    let cancelled = false;
    let timer = null;
    startedAt.current = Date.now();
    setPhase('loading');
    setErrorMessage('');
    setReport(null);
    setSlowHint(false);

    const loadDetail = async () => {
      try {
        const detail = await reportsApi.getLivekitReport(sessionId);
        if (cancelled) return;
        if (detail?.status === 'pending') {
          setPhase('loading');
          schedule();
          return;
        }
        setReport(detail);
        setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        setPhase('failed');
        setErrorMessage(apiErrorMessage(err, 'We could not load your report.'));
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt.current > STATUS_MAX_MS) {
        setSlowHint(true);
      }
      try {
        const statusRes = await reportsApi.getLivekitStatus(sessionId);
        if (cancelled) return;
        const status = statusRes?.status;
        if (status === 'completed') {
          await loadDetail();
          return;
        }
        if (status === 'failed') {
          setPhase('failed');
          setErrorMessage(statusRes?.error_message || 'We could not generate your report.');
          return;
        }
        if (status === 'cancelled') {
          setPhase('cancelled');
          setErrorMessage('This interview ended before a report could be created.');
          return;
        }
        schedule();
      } catch (err) {
        if (cancelled) return;
        // If status 404, still try detail once
        if (err?.response?.status === 404) {
          setPhase('failed');
          setErrorMessage(apiErrorMessage(err, 'Report not found.'));
          return;
        }
        schedule();
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(tick, STATUS_POLL_MS);
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, sessionId]);

  const dimensions = useMemo(() => {
    const breakdown = report?.score_breakdown || {};
    return DIMENSION_LABELS.map((d) => ({
      label: d.label,
      score: dimensionScore(breakdown, d.key, d.alt),
    }));
  }, [report]);

  const turns = Array.isArray(report?.turn_scores) ? report.turn_scores : [];
  const actions = asStringList(report?.action_plan || report?.recommended_next_practice);
  const overall = report?.overall_score;
  const overallRound = overall != null && Number.isFinite(Number(overall))
    ? Math.round(Number(overall))
    : null;
  const overallTone = scoreTone(overallRound);
  const durationLabel = formatDuration(report?.recording_duration_sec);
  const typeLabel = interviewType === 'mock' || report?.interview_type === 'mock'
    ? 'Mock interview'
    : interviewType === 'full' || report?.interview_type === 'full'
      ? 'Full interview'
      : 'Interview';

  const heading = report
    ? (report.position || report.title || report.summary_title || 'Interview report')
    : 'Interview report';

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={`${heading}${String(heading).toLowerCase().includes('report') ? '' : ' — interview report'}`}
      crumb={[
        typeLabel,
        formatDate(completedDate || report?.completed_date || report?.recording_started_at),
        durationLabel,
      ].filter(Boolean).join(' · ')}
      wide
      footer={(
        <QuirriBtn type="button" variant="ghost" onClick={onClose}>
          Close
        </QuirriBtn>
      )}
    >
      {phase === 'loading' ? (
        <div className="notice info" style={{ margin: 0 }}>
          <div>
            <b>Generating your report</b>
            {slowHint
              ? 'This is taking longer than usual. You can leave this open — we will keep checking.'
              : 'Scoring your answers. This usually takes under a minute.'}
          </div>
        </div>
      ) : null}

      {phase === 'failed' || phase === 'cancelled' ? (
        <div className="notice err" style={{ margin: 0 }}>
          <div>
            <b>{phase === 'cancelled' ? 'No report' : 'Could not load report'}</b>
            {errorMessage}
          </div>
        </div>
      ) : null}

      {phase === 'ready' && report ? (
        <div className="si-report">
          <div className="si-report-main">
            <div className="si-report-section-label">Per-question feedback</div>
            {!turns.length ? (
              <div className="notice info" style={{ margin: '8px 0 0' }}>
                <div>
                  <b>No question scores yet</b>
                  Detailed turn feedback was not returned for this session.
                </div>
              </div>
            ) : (
              <ul className="si-turn-list">
                {turns.map((turn, idx) => {
                  const tone = scoreTone(turn.score != null ? Number(turn.score) * (turn.score <= 10 ? 10 : 1) : null);
                  const displayScore = turn.score == null
                    ? '—'
                    : turn.score <= 10
                      ? Math.round(Number(turn.score) * 10)
                      : Math.round(Number(turn.score));
                  return (
                    <li key={turn.turn_number ?? idx} className="si-turn">
                      <div className="si-turn-q">{turn.question || `Question ${idx + 1}`}</div>
                      {turn.ai_feedback ? (
                        <p className="si-turn-fb">{turn.ai_feedback}</p>
                      ) : null}
                      <div className="si-turn-meta">
                        <span className="si-turn-tag">
                          {[turn.dimension, turn.tag, turn.category].filter(Boolean).join(' · ') || 'Feedback'}
                        </span>
                        <span className="si-score-pill" style={{ background: tone.bg, color: tone.fg }}>
                          {displayScore}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="si-report-side">
            <div className="si-overall">
              <div
                className="si-overall-ring"
                style={{
                  background: overallRound == null
                    ? 'conic-gradient(#EAEFF1 0 100%)'
                    : `conic-gradient(${overallTone.fg} 0 ${overallRound}%, #EAEFF1 ${overallRound}% 100%)`,
                }}
              >
                <div className="si-overall-inner">
                  <div className="si-overall-num">{overallRound ?? '—'}</div>
                </div>
              </div>
              <div className="si-overall-label">Overall score</div>
              {report.summary ? <p className="si-overall-summary">{report.summary}</p> : null}
            </div>

            <div className="si-dims">
              <div className="si-report-section-label">Score by dimension</div>
              {dimensions.map((d) => {
                const n = d.score == null ? null : Math.round(d.score);
                const weak = n != null && n < 70;
                return (
                  <div key={d.label} className="si-dim">
                    <div className="si-dim-row">
                      <span>{d.label}</span>
                      <span className={weak ? 'si-dim-weak' : ''}>{n ?? '—'}</span>
                    </div>
                    <div className="si-dim-track">
                      <i
                        style={{
                          width: `${n == null ? 0 : Math.min(100, Math.max(0, n))}%`,
                          background: weak ? 'var(--amber-700)' : 'var(--teal)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {actions.length ? (
              <div className="si-plan">
                <div className="si-report-section-label">Your improvement plan</div>
                <ol>
                  {actions.slice(0, 5).map((item, i) => (
                    <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </QuirriModal>
  );
}
