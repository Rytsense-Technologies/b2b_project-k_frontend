'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QuirriModal from '@/components/superadmin/QuirriModal';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import { Icon, SectionState } from '@/components/student/ui';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import '@/styles/student-leaderboard.css';

/*
 * Student leaderboard (SOW §6.4.4): cohort ranking on correct MCQ scores,
 * refreshed live (every minute and whenever the tab regains focus) so a new
 * submission shows up without a reload. Students always see their own
 * position, even outside the top list.
 */
const REFRESH_MS = 15000;
const LIMIT = 100;

function tone(score) {
  if (score == null) return 'mid';
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'S';
}

function titleCase(name = '') {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

function ScoreCell({ score }) {
  const t = tone(score);
  return (
    <span className="slb-scorecell">
      <span className={`slb-bar is-${t}`} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }} /></span>
      <b className={`slb-tone--${t}`}>{score != null ? `${score}%` : '—'}</b>
    </span>
  );
}

function Hero({ me, participants, scopeLabel, filtered, onHowItWorks }) {
  if (!me) {
    return (
      <section className="slb-hero" aria-label="Your position">
        <div className="slb-rank"><small>Rank</small><b>—</b></div>
        <div>
          <h2>You&apos;re not ranked yet</h2>
          <p>
            {filtered
              ? 'You haven’t submitted this assessment. Take it to join this ranking.'
              : `Submit a chapter assessment to appear on the ${scopeLabel} leaderboard.`}
          </p>
        </div>
        <div className="slb-hero-cta">
          <Link className="sd-btn sd-btn--amber" href="/student/subjects"><Icon name="play" size={16} /> Take a chapter assessment</Link>
          <button type="button" className="sd-btn sd-btn--glass sd-btn--sm" onClick={onHowItWorks}><Icon name="info" size={14} /> How ranking works</button>
        </div>
      </section>
    );
  }
  const top = me.rank === 1;
  const message = top
    ? `You’re at the top of ${scopeLabel}. Keep it up!`
    : me.gap_to_next != null
      ? `${me.gap_to_next} percentage point${me.gap_to_next === 1 ? '' : 's'} behind rank #${me.next_rank}. One strong assessment can close it.`
      : 'Keep taking assessments to move up.';
  return (
    <section className="slb-hero" aria-label="Your position">
      <div className={`slb-rank${top ? ' is-top' : ''}`} role="img" aria-label={`Your rank: ${me.rank} of ${participants}`}>
        <small>Rank</small><b>#{me.rank}</b>
      </div>
      <div>
        <h2>You’re #{me.rank} of {participants} in {scopeLabel}</h2>
        <p>{message}</p>
        <div className="slb-hero-stats">
          <span className="slb-chip"><Icon name="trend" size={14} /> {top ? <b>Top of the class</b> : <>Ahead of <b>{Math.max(0, participants - me.rank)}</b> classmate{participants - me.rank === 1 ? '' : 's'}</>}</span>
          <span className="slb-chip"><Icon name="target" size={14} /> Average <b>{me.avg_score}%</b></span>
          <span className="slb-chip"><Icon name="check" size={14} /> <b>{me.correct}/{me.questions}</b> correct</span>
          <span className="slb-chip"><Icon name="doc" size={14} /> <b>{me.attempt_count}</b> assessment{me.attempt_count === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div className="slb-hero-cta">
        <Link className="sd-btn sd-btn--amber" href="/student/subjects"><Icon name="play" size={16} /> Take a chapter assessment</Link>
        <button type="button" className="sd-btn sd-btn--glass sd-btn--sm" onClick={onHowItWorks}><Icon name="info" size={14} /> How ranking works</button>
      </div>
    </section>
  );
}

function LeaderboardInner() {
  const [url, setUrl] = useUrlState({ job: '', q: '' });
  const [howOpen, setHowOpen] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [, setTick] = useState(0);

  const loader = useCallback(async () => {
    const res = await leaderboardApi.get({ limit: LIMIT, jobId: url.job || undefined });
    setFetchedAt(Date.now());
    return res;
  }, [url.job]);
  const { data, loading, error, reload } = useAsyncResource(loader, [url.job]);

  // Live: every 15 s while visible, on focus, and instantly when an
  // assessment is submitted in another tab (BroadcastChannel from the quiz).
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') reload().catch(() => {}); };
    const id = setInterval(refresh, REFRESH_MS);
    const clock = setInterval(() => setTick((t) => t + 1), 15000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    let channel = null;
    try {
      channel = new BroadcastChannel('quirri-learning');
      channel.onmessage = (e) => { if (e?.data?.type === 'assessment-submitted') reload().catch(() => {}); };
    } catch { channel = null; }
    return () => {
      clearInterval(id); clearInterval(clock);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      if (channel) channel.close();
    };
  }, [reload]);

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const me = data?.me || null;
  const participants = data?.participants ?? data?.total ?? items.length;
  const cohort = data?.cohort_size ?? null;
  const scopeLabel = data?.scope === 'department' ? 'your department' : 'your college';
  const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
  const selected = assessments.find((a) => a.job_id === url.job);

  const search = url.q.trim().toLowerCase();
  const rows = search ? items.filter((r) => r.name.toLowerCase().includes(search)) : items;
  const meInList = items.some((r) => r.is_me);
  const podium = !search ? items.slice(0, 3) : [];
  const participation = cohort ? Math.round((participants / cohort) * 100) : null;

  const options = [{ value: '', label: 'All assessments' }, ...assessments.map((a) => ({ value: a.job_id, label: a.title || 'Chapter assessment' }))];

  if (loading && !data) {
    return <div className="slb"><SectionState title="Loading leaderboard…">Fetching your class rankings.</SectionState></div>;
  }
  if (error && !data) {
    return (
      <div className="slb">
        <SectionState tone="err" title="Could not load the leaderboard" action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={14} /> Try again</button>}>
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      </div>
    );
  }

  return (
    <div className="slb animate-fade-in">
      <Hero me={me} participants={participants} scopeLabel={scopeLabel} filtered={Boolean(url.job)} onHowItWorks={() => setHowOpen(true)} />

      <section className="slb-kpis" aria-label="Cohort summary">
        <div className="slb-card slb-kpi">
          <div className="slb-kpi-h"><Icon name="users" size={16} /> Participating</div>
          <b>{participants}{cohort ? ` / ${cohort}` : ''}</b>
          <div className="slb-meter" aria-hidden="true"><i style={{ width: `${participation ?? 0}%` }} /></div>
          <small>{participation != null ? `${participation}% of ${scopeLabel} ranked` : 'Students with a submitted assessment'}</small>
        </div>
        <div className="slb-card slb-kpi">
          <div className="slb-kpi-h"><Icon name="chart" size={16} /> Class average</div>
          <b className={data?.class_avg != null ? `slb-tone--${tone(data.class_avg)}` : ''}>{data?.class_avg != null ? `${data.class_avg}%` : '—'}</b>
          <small>{me && data?.class_avg != null ? (me.avg_score >= data.class_avg ? `You’re ${Math.round((me.avg_score - data.class_avg) * 10) / 10} pts above` : `You’re ${Math.round((data.class_avg - me.avg_score) * 10) / 10} pts below`) : 'Average of ranked students'}</small>
        </div>
        <div className="slb-card slb-kpi">
          <div className="slb-kpi-h"><Icon name="trophy" size={16} /> Top score</div>
          <b className={data?.top_score != null ? `slb-tone--${tone(data.top_score)}` : ''}>{data?.top_score != null ? `${data.top_score}%` : '—'}</b>
          <small>{items[0] ? titleCase(items[0].name) : 'No scores yet'}</small>
        </div>
        <div className="slb-card slb-kpi">
          <div className="slb-kpi-h"><Icon name="clock" size={16} /> Last submission</div>
          <b>{formatDate(data?.updated_at)}</b>
          <small>{selected ? selected.title : 'Across all assessments'}</small>
        </div>
      </section>

      <div className="slb-filter" role="search" aria-label="Filter leaderboard">
        <QuirriSelect ariaLabel="Assessment" value={url.job} options={options} onChange={(e) => setUrl({ job: e.target.value })} disabled={!assessments.length} />
        <label className="slb-search">
          <Icon name="search" size={18} />
          <input type="search" value={url.q} onChange={(e) => setUrl({ q: e.target.value })} placeholder="Search classmates…" aria-label="Search classmates" />
        </label>
        <div className="slb-live" aria-live="polite">
          <span><i aria-hidden="true" /> Live · updated {timeAgo(fetchedAt)}</span>
          <button type="button" className="sd-btn sd-btn--light sd-btn--sm" onClick={() => reload().catch(() => {})} aria-label="Refresh leaderboard">
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      {!items.length ? (
        <SectionState
          title={url.job ? 'No one has submitted this assessment yet' : 'No rankings yet'}
          action={url.job ? <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setUrl({ job: '' })}>Show all assessments</button> : null}
        >
          {data?.note || `Rankings for ${scopeLabel} appear as soon as classmates submit chapter assessments.`}
        </SectionState>
      ) : (
        <>
          {podium.length ? (
            <section className="slb-podium" aria-label="Top students">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((p) => (
                <article key={p.user_id} className={`slb-card slb-pod is-${p.rank}${p.is_me ? ' is-me' : ''}`}>
                  <span className="slb-medal" aria-label={`Rank ${p.rank}`}>{p.rank}</span>
                  <span className={`slb-av${p.is_me ? ' is-me' : ''}`} aria-hidden="true">{initials(p.name)}</span>
                  <div>
                    <b>{titleCase(p.name)}{p.is_me ? <span className="slb-you">You</span> : null}</b>
                    <span>{p.correct}/{p.questions} correct · {p.attempt_count} assessment{p.attempt_count === 1 ? '' : 's'}</span>
                  </div>
                  <strong className={`slb-tone--${tone(p.avg_score)}`}>{p.avg_score}%</strong>
                </article>
              ))}
            </section>
          ) : null}

          <section className="slb-card slb-table-card" aria-labelledby="slb-table-h">
            <div className="slb-table-h">
              <div>
                <h3 id="slb-table-h">{selected ? selected.title : 'All students'}</h3>
                <p>{search ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for “${url.q.trim()}”` : `${participants} ranked student${participants === 1 ? '' : 's'} in ${scopeLabel}`}</p>
              </div>
            </div>

            {!rows.length ? (
              <div style={{ padding: 24 }}><SectionState title="No classmates match your search">Try another name.</SectionState></div>
            ) : (
              <>
                <div className="slb-table-wrap">
                  <table className="slb-table">
                    <thead>
                      <tr>
                        <th scope="col">Rank</th>
                        <th scope="col">Student</th>
                        <th scope="col" className="num">Average score</th>
                        <th scope="col" className="num">Correct</th>
                        <th scope="col" className="num">Assessments</th>
                        <th scope="col" className="num">Last submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.user_id} className={r.is_me ? 'is-me' : ''} aria-current={r.is_me ? 'true' : undefined}>
                          <td><span className={`slb-rankcell is-${r.rank}`}>{r.rank}</span></td>
                          <td>
                            <span className="slb-student">
                              <span className={`slb-av${r.is_me ? ' is-me' : ''}`} aria-hidden="true">{initials(r.name)}</span>
                              <span><b>{titleCase(r.name)}</b>{r.is_me ? <span className="slb-you">You</span> : null}</span>
                            </span>
                          </td>
                          <td className="num"><ScoreCell score={r.avg_score} /></td>
                          <td className="num">{r.correct}/{r.questions}</td>
                          <td className="num">{r.attempt_count}</td>
                          <td className="num slb-muted">{formatDate(r.last_submitted_at)}</td>
                        </tr>
                      ))}
                      {!search && me && !meInList ? (
                        <>
                          <tr className="is-sep"><td colSpan={6}>…</td></tr>
                          <tr className="is-me" aria-current="true">
                            <td><span className="slb-rankcell">{me.rank}</span></td>
                            <td><span className="slb-student"><span className="slb-av is-me" aria-hidden="true">{initials(me.name)}</span><span><b>{titleCase(me.name)}</b><span className="slb-you">You</span></span></span></td>
                            <td className="num"><ScoreCell score={me.avg_score} /></td>
                            <td className="num">{me.correct}/{me.questions}</td>
                            <td className="num">{me.attempt_count}</td>
                            <td className="num slb-muted">{formatDate(me.last_submitted_at)}</td>
                          </tr>
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <ol className="slb-cards" aria-label="Rankings">
                  {[...rows, ...(!search && me && !meInList ? [me] : [])].map((r) => (
                    <li key={r.user_id} className={r.is_me ? 'is-me' : ''}>
                      <span className={`slb-rankcell is-${r.rank}`}>{r.rank}</span>
                      <span className={`slb-av${r.is_me ? ' is-me' : ''}`} aria-hidden="true">{initials(r.name)}</span>
                      <span>
                        <b>{titleCase(r.name)}</b>{r.is_me ? <span className="slb-you">You</span> : null}
                        <small>{r.correct}/{r.questions} correct · {r.attempt_count} assessment{r.attempt_count === 1 ? '' : 's'}</small>
                      </span>
                      <b className={`slb-tone--${tone(r.avg_score)}`}>{r.avg_score}%</b>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </>
      )}

      <QuirriModal open={howOpen} onClose={() => setHowOpen(false)} title="How ranking works">
        <ul className="slb-rules">
          <li><Icon name="target" size={18} /><span><b>Correct scores decide your rank.</b> Your rank is your average score across the chapter assessments you have submitted.</span></li>
          <li><Icon name="check" size={18} /><span><b>Ties</b> are broken by total correct answers, then by who reached the score first. Students with exactly the same result share a rank.</span></li>
          <li><Icon name="users" size={18} /><span><b>Your cohort</b> is the students of {scopeLabel}. Only submitted assessments count.</span></li>
          <li><Icon name="refresh" size={18} /><span><b>Live updates.</b> The board refreshes on its own every minute and as soon as you come back to this tab, so a new submission shows up right away.</span></li>
          <li><Icon name="layers" size={18} /><span><b>Per assessment.</b> Pick an assessment above to see the ranking for that chapter only.</span></li>
        </ul>
      </QuirriModal>
    </div>
  );
}

export default function StudentLeaderboardPage() {
  return (
    <Suspense fallback={<div className="slb"><SectionState title="Loading leaderboard…" /></div>}>
      <LeaderboardInner />
    </Suspense>
  );
}
