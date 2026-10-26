'use client';

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { Icon, SectionState } from '@/components/student/ui';
import { BANDS, BandPill, ModernDonut, bandFor } from '@/components/shared/data-viz';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import '@/styles/student-leaderboard.css';

/*
 * Student leaderboard (SOW §6.4.4): cohort ranking on correct MCQ scores,
 * refreshed live (every 15 s and whenever the tab regains focus) so a new
 * submission shows up without a reload. Students always see their own
 * position, even outside the top list.
 * Layout — quirri-b2c-student-ui skill (15 Oct 2026): your-position white card ·
 * teal filter bar (applies on Search / Enter, Clear resets) · meta line + stat cluster ·
 * score bands card · stacked white rows · pager (10 per page). No teal hero (filters exist).
 */
const REFRESH_MS = 15000;
const LIMIT = 100;
const PAGE_SIZE = 10;

/** Podium only when it adds something: three or more ranked students. */
const PODIUM_MIN = 3;

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

/** Class-average comparison; "0 pts above" reads as "at the class average" (S21). */
function classAvgNote(me, classAvg) {
  if (!me || classAvg == null) return 'Average of ranked students';
  const diff = Math.round((Number(me.avg_score) - Number(classAvg)) * 10) / 10;
  if (!Number.isFinite(diff)) return 'Average of ranked students';
  if (Math.abs(diff) < 0.5) return 'You’re at the class average';
  const pts = Math.round(Math.abs(diff));
  return `You’re ${pts} point${pts === 1 ? '' : 's'} ${diff > 0 ? 'above' : 'below'} average`;
}

const rankTier = (rank) => (rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : 'rn');

function Position({ me, participants, scopeLabel, filtered, classAvg, onHowItWorks }) {
  if (!me) {
    return (
      <section className="slb-card slb-pos" aria-label="Your position">
        <div className="slb-rank"><small>Rank</small><b>—</b></div>
        <div className="slb-pos-copy">
          <h2>You&apos;re not ranked yet</h2>
          <p>
            {filtered
              ? 'You haven’t submitted this assessment. Take it to join this ranking.'
              : `Submit a chapter assessment to appear on the ${scopeLabel} leaderboard.`}
          </p>
        </div>
        <div className="slb-pos-cta">
          <Link className="slb-btn slb-btn--primary" href="/student/subjects"><Icon name="play" size={16} /> Take a chapter assessment</Link>
          <button type="button" className="slb-btn" onClick={onHowItWorks}><Icon name="info" size={16} /> How ranking works</button>
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
  const ahead = Math.max(0, participants - me.rank);
  return (
    <section className="slb-card slb-pos" aria-label="Your position">
      <div className={`slb-rank is-${rankTier(me.rank)}`} role="img" aria-label={`Your rank: ${me.rank} of ${participants}`}>
        <small>Rank</small><b>#{me.rank}</b>
      </div>
      <div className="slb-pos-copy">
        <h2>You’re #{me.rank} of {participants} in {scopeLabel}</h2>
        <p>{message} <span className="slb-muted">{classAvgNote(me, classAvg)}.</span></p>
        <div className="sb-stats slb-pos-stats" aria-label="Your numbers">
          <div className="sb-stat"><b>{me.avg_score}%</b><span>Average</span></div>
          <i className="sb-rule" aria-hidden="true" />
          <div className="sb-stat"><b>{me.correct}/{me.questions}</b><span>Correct</span></div>
          <i className="sb-rule" aria-hidden="true" />
          <div className="sb-stat"><b>{me.attempt_count}</b><span>Assessment{me.attempt_count === 1 ? '' : 's'}</span></div>
          {/* Rank #1 is already the headline; only show "behind" when it adds something. */}
          {!top ? (
            <>
              <i className="sb-rule" aria-hidden="true" />
              <div className="sb-stat"><b>{ahead}</b><span>{`Classmate${ahead === 1 ? '' : 's'} behind`}</span></div>
            </>
          ) : null}
          {me.percentile != null && participants > 1 ? (
            <>
              <i className="sb-rule" aria-hidden="true" />
              <div className="sb-stat"><b>{me.percentile}%</b><span>At or above</span></div>
            </>
          ) : null}
        </div>
      </div>
      <div className="slb-pos-cta">
        {/* Already ranked: more lectures + their assessments move you up. */}
        <Link className="slb-btn slb-btn--primary" href="/student/subjects"><Icon name="bookOpen" size={16} /> Continue learning</Link>
        <button type="button" className="slb-btn" onClick={onHowItWorks}><Icon name="info" size={16} /> How ranking works</button>
      </div>
    </section>
  );
}

function RankRow({ r }) {
  return (
    <li className={`sb-row slb-row${r.is_me ? ' is-me' : ''}`} aria-current={r.is_me ? 'true' : undefined}>
      <span className={`slb-rankcell is-${rankTier(r.rank)}`}>{r.rank}</span>
      <span className="slb-row-main">
        <span className="sb-row__title">{titleCase(r.name)}{r.is_me ? <span className="slb-you">You</span> : null}</span>
        <span className="sb-row__sub">
          {r.correct}/{r.questions} correct · {r.attempt_count} assessment{r.attempt_count === 1 ? '' : 's'} · Last {formatDate(r.last_submitted_at)}
        </span>
      </span>
      <span className="slb-row-band"><BandPill score={r.avg_score} /></span>
      <span className="sb-row__score">{r.avg_score != null ? `${r.avg_score}%` : '—'}</span>
    </li>
  );
}

function LeaderboardInner() {
  const [url, setUrl] = useUrlState({ job: '', q: '', p: '1' });
  // Draft filters: applied only on Search / Enter (skill "Teal filter bar").
  const [draft, setDraft] = useState({ q: url.q, job: url.job });
  useEffect(() => { setDraft({ q: url.q, job: url.job }); }, [url.q, url.job]);
  const [howOpen, setHowOpen] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [, setTick] = useState(0);
  const searchRef = useRef(null);
  const lastFetch = useRef(0);

  const loader = useCallback(async () => {
    lastFetch.current = Date.now();
    const res = await leaderboardApi.get({ limit: LIMIT, jobId: url.job || undefined });
    setFetchedAt(Date.now());
    return res;
  }, [url.job]);
  const { data, loading, error, reload } = useAsyncResource(loader, [url.job]);

  // Live: every 15 s while visible, on focus, and instantly when an
  // assessment is submitted in another tab (BroadcastChannel from the quiz).
  useEffect(() => {
    // focus + visibilitychange + interval can fire together; one fetch per 5 s is enough.
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastFetch.current < 5000) return;
      reload().catch(() => {});
    };
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
  const filtered = Boolean(url.job || search);
  const apply = (e) => {
    e?.preventDefault?.();
    setUrl({ q: draft.q.trim(), job: draft.job, p: '1' });
  };
  const clearFilters = () => {
    setDraft({ q: '', job: '' });
    setUrl({ job: '', q: '', p: '1' });
    searchRef.current?.focus();
  };
  const rows = search ? items.filter((r) => r.name.toLowerCase().includes(search)) : items;
  const meInList = items.some((r) => r.is_me);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(url.p) || 1));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const podium = !search && page === 1 && items.length >= PODIUM_MIN ? items.slice(0, 3) : [];
  const bandParts = useMemo(() => {
    const counts = { strong: 0, ok: 0, focus: 0 };
    items.forEach((r) => { const b = bandFor(r.avg_score); if (counts[b] != null) counts[b] += 1; });
    return BANDS.map((b) => ({ key: b.key, label: b.label, value: counts[b.key] }));
  }, [items]);
  const participation = cohort ? Math.round((participants / cohort) * 100) : null;
  const cohortStats = [
    { key: 'ranked', value: `${participants}${cohort ? `/${cohort}` : ''}`, label: participation != null ? `${participation}% ranked` : 'Ranked' },
    { key: 'avg', value: data?.class_avg != null ? `${data.class_avg}%` : '—', label: 'Class average' },
    { key: 'top', value: data?.top_score != null ? `${data.top_score}%` : '—', label: 'Top score' },
    { key: 'latest', value: formatDate(data?.updated_at), label: 'Latest submission' },
  ];

  if (loading && !data) {
    return (
      <div className="slb" aria-busy="true">
        <div className="sb-skel" style={{ height: 150 }} aria-hidden="true" />
        <div className="sb-skel" style={{ height: 82 }} aria-hidden="true" />
        {[0, 1, 2].map((i) => <div key={i} className="sb-skel" style={{ height: 86 }} aria-hidden="true" />)}
        <span className="sr-only">Loading leaderboard…</span>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="slb">
        <SectionState tone="err" title="Could not load the leaderboard" action={<button type="button" className="text-link slb-linkbtn" onClick={() => reload().catch(() => {})}>Try again</button>}>
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      </div>
    );
  }

  return (
    <div className="slb animate-fade-in">
      <Position me={me} participants={participants} scopeLabel={scopeLabel} filtered={Boolean(url.job)} classAvg={data?.class_avg} onHowItWorks={() => setHowOpen(true)} />

      <form className="sb-filterbar" role="search" aria-label="Filter leaderboard" onSubmit={apply}>
        <label className="sb-search slb-search">
          <Icon name="search" size={18} />
          <input ref={searchRef} type="search" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="Search classmates" aria-label="Search classmates" />
        </label>
        <select className="sb-select slb-select" aria-label="Assessment" value={draft.job} onChange={(e) => setDraft((d) => ({ ...d, job: e.target.value }))} disabled={!assessments.length}>
          <option value="">All assessments</option>
          {assessments.map((a) => <option key={a.job_id} value={a.job_id}>{a.title || 'Chapter assessment'}</option>)}
        </select>
        <div className="sb-actions">
          <button type="button" className="sb-btn sb-btn--clear" onClick={clearFilters}>Clear</button>
          <button type="submit" className="sb-btn sb-btn--go">Search</button>
        </div>
      </form>

      <div className="sb-meta slb-meta">
        <span className="slb-live" aria-live="polite">
          <i aria-hidden="true" /> Auto-refreshing · checked {timeAgo(fetchedAt)}
          <button type="button" className="text-link slb-linkbtn" onClick={() => reload().catch(() => {})} aria-label="Refresh leaderboard">Refresh</button>
        </span>
        {/* With rankings, the cohort figures sit in a card beside the score-bands donut (below). */}
        {!items.length ? (
          <div className="sb-stats" aria-label="Cohort summary">
            {cohortStats.map((st, i) => (
              <Fragment key={st.key}>
                {i ? <i className="sb-rule" aria-hidden="true" /> : null}
                <div className="sb-stat"><b>{st.value}</b><span>{st.label}</span></div>
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>

      {items.length ? (
        <div className="slb-top">
          <section className="slb-card slb-dist" aria-labelledby="slb-dist-h">
            <div className="slb-dist-h">
              <h3 id="slb-dist-h">Class score bands</h3>
              <p>{selected ? `Average score on ${selected.title}` : 'Average score across submitted assessments'} · {participants} student{participants === 1 ? '' : 's'}</p>
            </div>
            <ModernDonut parts={bandParts} unit={participants === 1 ? 'Student' : 'Students'} title="Class score bands" empty="No scores yet." />
          </section>
          <section className="slb-card slb-dist slb-cohort" aria-labelledby="slb-cohort-h">
            <div className="slb-dist-h">
              <h3 id="slb-cohort-h">Cohort summary</h3>
              <p>Rankings for {scopeLabel}</p>
            </div>
            <dl className="slb-cohort-list" aria-label="Cohort summary">
              {cohortStats.map((st) => (
                <div key={st.key}><dt>{st.label}</dt><dd>{st.value}</dd></div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}

      {!items.length ? (
        <div className="slb-card">
          <p className="sb-empty">
            {url.job ? 'No one has submitted this assessment yet.' : (data?.note || `No rankings yet. Rankings for ${scopeLabel} appear as soon as classmates submit chapter assessments.`)}
            {url.job ? <button type="button" className="text-link" onClick={clearFilters}>Show all assessments</button> : null}
          </p>
        </div>
      ) : (
        <>
          {podium.length ? (
            <section className="slb-podium" aria-label="Top students">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((p) => (
                <article key={p.user_id} className={`slb-card slb-pod is-${rankTier(p.rank)}${p.is_me ? ' is-me' : ''}`}>
                  <span className={`slb-medal is-${rankTier(p.rank)}`} aria-label={`Rank ${p.rank}`}>{p.rank}</span>
                  <span className={`slb-av${p.is_me ? ' is-me' : ''}`} aria-hidden="true">{initials(p.name)}</span>
                  <div>
                    <b>{titleCase(p.name)}{p.is_me ? <span className="slb-you">You</span> : null}</b>
                    <span>{p.correct}/{p.questions} correct · {p.attempt_count} assessment{p.attempt_count === 1 ? '' : 's'}</span>
                  </div>
                  <strong>{p.avg_score}%</strong>
                </article>
              ))}
            </section>
          ) : null}

          <section className="slb-list" aria-labelledby="slb-list-h">
            <div className="slb-list-h">
              <h3 id="slb-list-h">{selected ? selected.title : 'All students'}</h3>
              <p>{search ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for “${url.q.trim()}”` : `${participants} ranked student${participants === 1 ? '' : 's'} in ${scopeLabel}`}</p>
            </div>
            {!rows.length ? (
              <div className="slb-card">
                <p className="sb-empty">No classmates match your search.<button type="button" className="text-link" onClick={clearFilters}>Clear filters</button></p>
              </div>
            ) : (
              <>
                <ol className="sb-rows slb-rows" aria-label="Rankings">
                  {pageRows.map((r) => <RankRow key={r.user_id} r={r} />)}
                  {!search && me && !meInList ? (
                    <>
                      <li className="slb-sep" aria-hidden="true">Your position</li>
                      <RankRow r={{ ...me, is_me: true }} />
                    </>
                  ) : null}
                </ol>
                <nav className="sb-pager" aria-label="Rankings pages">
                  <span className="sb-pager__info">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(rows.length, page * PAGE_SIZE)} of {rows.length}</span>
                  <span className="sb-pager__nav">
                    <button type="button" disabled={page <= 1} onClick={() => setUrl({ p: String(page - 1) })}>Previous</button>
                    <span>{page} / {pages}</span>
                    <button type="button" disabled={page >= pages} onClick={() => setUrl({ p: String(page + 1) })}>Next</button>
                  </span>
                </nav>
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
          <li><Icon name="refresh" size={18} /><span><b>Live updates.</b> The board refreshes on its own every few seconds and as soon as you come back to this tab, so a new submission shows up right away.</span></li>
          <li><Icon name="layers" size={18} /><span><b>Per assessment.</b> Pick an assessment in the filter bar and press Search to see the ranking for that chapter only.</span></li>
        </ul>
      </QuirriModal>
    </div>
  );
}

export default function StudentLeaderboardPage() {
  return (
    <Suspense fallback={<div className="slb"><div className="sb-skel" style={{ height: 150 }} aria-hidden="true" /></div>}>
      <LeaderboardInner />
    </Suspense>
  );
}
