'use client';

import Link from 'next/link';
import { Icon } from '@/components/student/ui';
import { scoreBandKey } from '@/lib/student/interviewReport';

const HERO_TITLE = {
  good: 'Strong performance',
  mid: 'On track',
  low: 'Needs improvement',
  none: 'Report ready',
};

function ScoreRing({ value }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const band = scoreBandKey(value);
  const pct = value == null ? 0 : value;
  return (
    <div className="srp-ring" role="img" aria-label={`Interview score ${value ?? 'not available'} out of 100`}>
      <svg viewBox="0 0 148 148" aria-hidden="true">
        <circle className="trk" cx="74" cy="74" r={r} />
        {pct > 0 ? (
          <circle className={`fil fil--${band}`} cx="74" cy="74" r={r} strokeDasharray={`${(pct / 100) * c} ${c}`} />
        ) : null}
      </svg>
      <div className="srp-ring-num">
        <b>{value ?? '—'}</b>
        <small>Interview score</small>
      </div>
    </div>
  );
}

function DeltaLine({ score, previous }) {
  // undefined = previous attempt still loading; null = this is the first report.
  if (score == null || previous === undefined) return null;
  if (previous === null) {
    return <p className="srp-hero-delta"><Icon name="spark" size={18} /> Your first scored interview — this is your starting point.</p>;
  }
  const diff = score - previous;
  if (diff > 0) {
    return <p className="srp-hero-delta"><Icon name="trend" size={18} /> Up {diff} point{diff === 1 ? '' : 's'} from your last attempt ({previous}). Keep it up!</p>;
  }
  if (diff < 0) {
    const d = Math.abs(diff);
    return <p className="srp-hero-delta"><Icon name="refresh" size={18} /> Down {d} point{d === 1 ? '' : 's'} from your last attempt ({previous}). The feedback below shows what to fix.</p>;
  }
  return <p className="srp-hero-delta"><Icon name="check" size={18} /> Same score as your last attempt ({previous}).</p>;
}

/** Teal hero: band title + name, score change, AI summary, the ONE orange action, score ring. */
export default function ReportHero({ score, previous, firstName, summary, retakeHref }) {
  const band = scoreBandKey(score);
  return (
    <section className="srp-hero" aria-label="Report summary">
      <div>
        <h2>{HERO_TITLE[band]}{firstName ? `, ${firstName}` : ''}</h2>
        <DeltaLine score={score} previous={previous} />
        {summary ? <p className="srp-hero-summary">{summary}</p> : null}
        <div className="srp-hero-cta">
          <Link className="sd-btn sd-btn--amber" href={retakeHref}>
            <Icon name="refresh" size={16} /> Retake interview
          </Link>
        </div>
      </div>
      <ScoreRing value={score} />
    </section>
  );
}
