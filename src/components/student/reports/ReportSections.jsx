'use client';

import Link from 'next/link';
import { Icon } from '@/components/student/ui';
import { REPORT_SKILLS, humanLabel, score100 } from '@/lib/student/interviewReport';

function CardHead({ title, sub, action = null }) {
  return (
    <div className="srp-card-h">
      <div>
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Four highlight tiles: readiness · best area · needs attention · recommended next. */
export function ReportHighlights({ report }) {
  const readiness = score100(report.interview_readiness);
  const change = report.readiness_change != null && Number.isFinite(Number(report.readiness_change))
    ? Math.round(Number(report.readiness_change))
    : null;
  const best = humanLabel(report.best_area);
  const bestScore = score100(report.best_area_score);
  const focus = humanLabel(report.needs_attention);
  const focusScore = score100(report.needs_attention_score);
  const next = Array.isArray(report.recommended_next_practice) ? report.recommended_next_practice[0] : null;
  const nextTitle = typeof next === 'string' ? next : next?.title;

  return (
    <section className="srp-highlights" aria-label="Highlights">
      <div className="srp-hl">
        <div className="srp-hl-h"><Icon name="target" size={16} /> Interview readiness</div>
        <b>{readiness ?? '—'}</b>
        {change != null && change !== 0 ? (
          <small className={change > 0 ? 'is-up' : ''}>
            <Icon name={change > 0 ? 'trend' : 'refresh'} size={14} />
            {change > 0 ? `${change} up` : `${Math.abs(change)} down`} from your previous attempt
          </small>
        ) : <small>Out of 100</small>}
      </div>
      <div className="srp-hl">
        <div className="srp-hl-h"><Icon name="trophy" size={16} /> Best area</div>
        <b>{best || '—'}</b>
        <small>{bestScore != null ? `${bestScore}/100 score` : 'Not scored'}</small>
      </div>
      <div className="srp-hl">
        <div className="srp-hl-h"><Icon name="alert" size={16} /> Needs attention</div>
        <b className={focus ? 'is-focus' : ''}>{focus || '—'}</b>
        <small>{focusScore != null ? `${focusScore}/100 score` : 'Not scored'}</small>
      </div>
      <div className="srp-hl">
        <div className="srp-hl-h"><Icon name="bulb" size={16} /> Recommended next</div>
        <b>{nextTitle || '—'}</b>
        <small>Based on your answers</small>
      </div>
    </section>
  );
}

/** Six skills, one categorical hue each (disc + % + bar). */
export function SkillBreakdown({ breakdown }) {
  const b = breakdown || {};
  return (
    <section className="srp-card" aria-labelledby="srp-skills-h">
      <CardHead title={<span id="srp-skills-h">Skill breakdown</span>} sub="Your performance across key skills" />
      <ul className="srp-skills">
        {REPORT_SKILLS.map((s, i) => {
          const v = score100(b[s.key]);
          return (
            <li key={s.key} className={`srp-skill srp-skill--c${i + 1}`}>
              <span className="srp-skill-ic" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
              <span className="srp-skill-name">{s.label}</span>
              <span className="srp-skill-pct">{v == null ? '—' : `${v}%`}</span>
              <span className="srp-skill-bar" aria-hidden="true"><i style={{ width: `${v ?? 0}%` }} /></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function asItems(list, titleKey = 'title') {
  if (!Array.isArray(list)) return [];
  return list
    .map((it) => (typeof it === 'string'
      ? { title: it, description: '' }
      : { title: it?.[titleKey] || it?.title || it?.step || '', description: it?.description || '', type: it?.type }))
    .filter((it) => it.title || it.description);
}

export function NextPractice({ items }) {
  const list = asItems(items);
  return (
    <section className="srp-card" aria-labelledby="srp-next-h">
      <CardHead title={<span id="srp-next-h">Next practice</span>} sub="What to work on before your next interview" />
      {list.length ? (
        <ul className="srp-items">
          {list.slice(0, 4).map((it, i) => (
            <li key={`${i}-${it.title}`} className="srp-item">
              <div>
                <b>{it.title}</b>
                {it.description ? <p>{it.description}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="srp-muted">No practice suggestions were returned for this interview.</p>}
    </section>
  );
}

export function KeyInsights({ items }) {
  const list = asItems(items);
  return (
    <section className="srp-card" aria-labelledby="srp-ins-h">
      <CardHead title={<span id="srp-ins-h">Key insights</span>} sub="What went well and what to improve" />
      {list.length ? (
        <ul className="srp-items">
          {list.map((it, i) => {
            const good = ['positive', 'strength', 'good'].includes(String(it.type || '').toLowerCase());
            return (
              <li key={`${i}-${it.title}`} className={`srp-item ${good ? 'srp-item--good' : 'srp-item--focus'}`}>
                <span className="srp-item-ic" aria-hidden="true"><Icon name={good ? 'trend' : 'target'} size={18} /></span>
                <div>
                  <b>{it.title}</b>
                  {it.description ? <p>{it.description}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="srp-muted">No insights were returned for this interview.</p>}
    </section>
  );
}

export function ActionPlan({ items }) {
  const list = asItems(items, 'step');
  return (
    <section className="srp-card srp-plan" aria-labelledby="srp-plan-h">
      <CardHead title={<span id="srp-plan-h">Action plan</span>} sub="Simple steps before your next interview" />
      {list.length ? (
        <ol className="srp-items">
          {list.slice(0, 5).map((it, i) => (
            <li key={`${i}-${it.title}`} className="srp-item">
              <span className={`srp-step srp-step--c${i + 1}`} aria-hidden="true">{i + 1}</span>
              <div>
                <b>{it.title}</b>
                {it.description ? <p>{it.description}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="srp-muted">No action plan was returned for this interview.</p>}
    </section>
  );
}

export function TryAgainSoon() {
  return (
    <section className="srp-card" aria-labelledby="srp-again-h">
      <CardHead title={<span id="srp-again-h">Try again soon</span>} sub="Build consistency" />
      <div className="srp-stack">
        <div className="srp-note">
          <div className="srp-big"><b>24–48</b><span>hours</span></div>
          <p>Retake this interview within 24–48 hours, after reviewing the areas that need attention.</p>
        </div>
        <div className="srp-note srp-note--warm">
          <b>Suggested schedule</b>
          <p>One quick mock interview every day and one full interview every week.</p>
        </div>
      </div>
    </section>
  );
}

export function ContinueFooter({ href }) {
  return (
    <section className="srp-foot" aria-label="Keep practising">
      <div className="srp-foot-copy">
        <Icon name="trophy" size={24} />
        <div>
          <b>Stay consistent. See progress.</b>
          <span>Small steps today lead to better results tomorrow.</span>
        </div>
      </div>
      <Link className="sd-btn sd-btn--teal" href={href}>
        Continue practising <Icon name="arrow" size={16} />
      </Link>
    </section>
  );
}
