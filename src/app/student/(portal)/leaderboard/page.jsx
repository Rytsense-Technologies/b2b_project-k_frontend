'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Icon, SectionState } from '@/components/student/ui';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

function PodiumArt() {
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

export default function StudentLeaderboardPage() {
  const { data, loading, error, reload } = useAsyncResource(
    () => leaderboardApi.get({ limit: 50 }),
    [],
  );

  const items = useMemo(() => asList(data, []), [data]);
  const meRank = data?.me_rank ?? null;
  const scopeLabel = data?.scope === 'department' ? 'your department' : 'your college';

  if (loading) {
    return (
      <div className="sp animate-fade-in">
        <SectionState title="Loading leaderboard">Fetching class rankings.</SectionState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sp animate-fade-in">
        <SectionState
          tone="err"
          title="Could not load leaderboard"
          action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="sp animate-fade-in">
        <section className="sp-empty-hero">
          <PodiumArt />
          <div style={{ flex: 1, minWidth: 240 }}>
            <span className="sp-pill sp-pill--teal"><Icon name="chart" size={14} /> Waiting on scores</span>
            <h2 style={{ marginTop: 10 }}>No rankings yet</h2>
            <p>
              {data?.note
                || `Cohort ranking for ${scopeLabel} appears here after classmates submit chapter assessments.`}
            </p>
            <div className="sp-banner-cta">
              <Link className="sd-btn sd-btn--amber" href="/student/subjects">Take a chapter assessment</Link>
              <Link className="sd-btn sd-btn--ghost" href="/student/progress">View my progress</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sp animate-fade-in">
      <section className="sp-banner">
        <div className="sp-banner-ic" aria-hidden="true"><Icon name="trophy" size={26} /></div>
        <div className="sp-banner-copy">
          <div className="sp-banner-eyebrow">Leaderboard</div>
          <h2>Class rankings</h2>
          <p>
            Based on average chapter quiz scores in {scopeLabel}.
            {meRank != null ? ` You are currently #${meRank}.` : ' Complete a quiz to appear on the board.'}
          </p>
        </div>
      </section>

      <div className="sp-table-wrap" style={{ marginTop: 16 }}>
        <table className="sp-table">
          <thead>
            <tr>
              <th className="num">Rank</th>
              <th>Student</th>
              <th className="num">Avg score</th>
              <th className="num">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.user_id} style={row.is_me ? { background: 'var(--teal-50, #F1F5F6)' } : undefined}>
                <td className="num">{row.rank}</td>
                <td>{row.name}{row.is_me ? ' (you)' : ''}</td>
                <td className="num">{row.avg_score}%</td>
                <td className="num">{row.attempt_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
