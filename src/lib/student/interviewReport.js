'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

/*
 * Interview report loading — same polling contract as InterviewReportModal:
 * GET /reports/livekit/{id}/status every 4s until completed | failed | cancelled,
 * then GET /reports/livekit/{id}.
 */
const STATUS_POLL_MS = 4000;
const STATUS_MAX_MS = 3 * 60 * 1000;

export const DIMENSION_LABELS = [
  { key: 'communication', label: 'Communication', icon: 'chat' },
  { key: 'answer_structure', label: 'Structure', alt: 'structure', icon: 'layers' },
  { key: 'technical_knowledge', label: 'Technical depth', alt: 'technical_depth', icon: 'book' },
  { key: 'confidence', label: 'Confidence', icon: 'spark' },
];

export function asStringList(items) {
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

/** Turn scores may be 0–10 or 0–100 — normalise to 0–100. */
export function turnScore100(score) {
  if (score == null || !Number.isFinite(Number(score))) return null;
  const n = Number(score);
  return n <= 10 ? Math.round(n * 10) : Math.round(n);
}

export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDurationSec(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return null;
  const total = Math.round(sec);
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`;
}

export function scoreBandKey(n) {
  if (n == null) return 'none';
  if (n >= 80) return 'good';
  if (n >= 65) return 'mid';
  return 'low';
}

export function useInterviewReport(sessionId) {
  const [phase, setPhase] = useState('loading'); // loading | ready | failed | cancelled
  const [errorMessage, setErrorMessage] = useState('');
  const [report, setReport] = useState(null);
  const [slowHint, setSlowHint] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!sessionId) return undefined;

    let cancelled = false;
    let timer = null;
    startedAt.current = Date.now();
    setPhase('loading');
    setErrorMessage('');
    setReport(null);
    setSlowHint(false);

    const schedule = () => {
      clearTimeout(timer);
      // eslint-disable-next-line no-use-before-define
      timer = setTimeout(tick, STATUS_POLL_MS);
    };

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

    async function tick() {
      if (cancelled) return;
      if (Date.now() - startedAt.current > STATUS_MAX_MS) setSlowHint(true);
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
        if (err?.response?.status === 404) {
          setPhase('failed');
          setErrorMessage(apiErrorMessage(err, 'Report not found.'));
          return;
        }
        schedule();
      }
    }

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  const dimensions = useMemo(() => {
    const breakdown = report?.score_breakdown || {};
    return DIMENSION_LABELS.map((d) => ({
      label: d.label,
      icon: d.icon,
      score: dimensionScore(breakdown, d.key, d.alt),
    }));
  }, [report]);

  return { phase, errorMessage, report, slowHint, dimensions };
}
