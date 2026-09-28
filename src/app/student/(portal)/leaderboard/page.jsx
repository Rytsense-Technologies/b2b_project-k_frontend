'use client';

import Link from 'next/link';
import { Icon } from '@/components/student/ui';

function PodiumArt() {
  /* Flat teal-family illustration (Brand v1.0) — no real ranking data. */
  return (
    <svg className="sp-empty-art" viewBox="0 0 200 150" aria-hidden="true">
      <circle cx="100" cy="72" r="66" fill="#F1F5F6" />
      <rect x="30" y="86" width="44" height="44" rx="6" fill="#B7CED3" />
      <rect x="78" y="62" width="44" height="68" rx="6" fill="#0E5C6B" />
      <rect x="126" y="100" width="44" height="30" rx="6" fill="#86AEB5" />
      <text x="100" y="104" textAnchor="middle" fontSize="22" fontWeight="700" fill="#FFFFFF">1</text>
      <text x="52" y="114" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0A3F49">2</text>
      <text x="148" y="121" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0A3F49">3</text>
      <circle cx="100" cy="40" r="12" fill="#F5821F" />
      <path d="M94 40l4 4 8-8" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Leaderboard — cohort ranking API is not live yet.
 * Honest empty state (no sample rankings), with how ranking will work.
 */
export default function StudentLeaderboardPage() {
  return (
    <div className="sp animate-fade-in">
      <section className="sp-empty-hero">
        <PodiumArt />
        <div style={{ flex: 1, minWidth: 240 }}>
          <span className="sp-pill sp-pill--teal"><Icon name="lock" size={14} /> Not available yet</span>
          <h2 style={{ marginTop: 10 }}>Your class leaderboard is coming</h2>
          <p>
            Cohort ranking for chapter assessments appears here once your college turns it on.
            Nothing is shown until real scores from your class are available.
          </p>
          <div className="sp-banner-cta">
            <Link className="sd-btn sd-btn--amber" href="/student/subjects">Take a chapter assessment</Link>
            <Link className="sd-btn sd-btn--ghost" href="/student/progress">View my progress</Link>
          </div>
        </div>
      </section>

      <div className="sp-section-h">
        <div>
          <h3>How ranking will work</h3>
          <p>Your position is based only on assessments in your own class.</p>
        </div>
      </div>
      <div className="sp-steps">
        <div className="sp-step">
          <span className="sp-step-n">1</span>
          <div><b>Watch the lecture</b><span>Each published chapter unlocks its quiz.</span></div>
        </div>
        <div className="sp-step">
          <span className="sp-step-n">2</span>
          <div><b>Take the assessment</b><span>One attempt per chapter, scored by Quirri.</span></div>
        </div>
        <div className="sp-step">
          <span className="sp-step-n">3</span>
          <div><b>See where you stand</b><span>Your rank appears here once your college enables it.</span></div>
        </div>
      </div>
    </div>
  );
}
