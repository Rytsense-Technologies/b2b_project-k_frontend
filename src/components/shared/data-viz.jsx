'use client';

/**
 * Data visuals shared by every portal (design-system.md §0c).
 * Colour roles:
 *   series   → --cat-1…6 in fixed order (blue, green, orange, purple, cyan, teal)
 *   score    → strong ≥ 80 green · on track 60–79 blue · needs focus < 60 orange · no data grey
 *   rank     → 1 orange · 2 blue · 3 purple · rest teal
 * Buttons, status pills and navigation never use these colours.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const SERIES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)'];
// Raw hex for SVG attributes in charts (CSS variables do not resolve inside some recharts props).
const SERIES_HEX = ['#2C74E0', '#54B058', '#F5821F', '#6C3CD8', '#23B6B9', '#0E5C6B'];

export const BANDS = [
  { key: 'strong', label: 'Strong (80+)', min: 80 },
  { key: 'ok', label: 'On track (60–79)', min: 60 },
  { key: 'focus', label: 'Needs focus (<60)', min: 0 },
];

/** Stable series colour for index i (or for a string key, hashed). */
export function dataColor(i, { hex = false } = {}) {
  const list = hex ? SERIES_HEX : SERIES;
  if (typeof i === 'string') {
    let h = 0;
    for (let k = 0; k < i.length; k += 1) h = (h * 31 + i.charCodeAt(k)) >>> 0;
    return list[h % list.length];
  }
  return list[((Number(i) || 0) % list.length + list.length) % list.length];
}

/** Score band key for a 0–100 score; null / NaN → 'none'. */
export function bandFor(score) {
  if (score == null || score === '' || Number.isNaN(Number(score))) return 'none';
  const n = Number(score);
  if (n >= 80) return 'strong';
  if (n >= 60) return 'ok';
  return 'focus';
}

const BAND_HEX = { strong: '#5CB414', ok: '#2C74E0', focus: '#F5821F', none: '#BCC1C3' };

function fmt(v, format) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  if (format) return format(v);
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 });
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Small pill for a score band. */
export function BandPill({ score, label }) {
  const band = bandFor(score);
  const text = label ?? (band === 'none' ? 'No data' : BANDS.find((b) => b.key === band)?.label.split(' (')[0]);
  return <span className={`dv-band dv-band--${band}`}>{text}</span>;
}

/**
 * Whole-percent labels for parts of one total, by largest remainder so they add up to exactly 100%.
 * A small non-zero share reads "<1%" (never "0%"), a near-total share ">99%" (never "100%").
 */
function sharePcts(values, base) {
  if (!base) return values.map(() => '0%');
  const raw = values.map((v) => (Math.max(0, Number(v) || 0) / base) * 100);
  const floor = raw.map(Math.floor);
  let left = Math.max(0, 100 - floor.reduce((a, b) => a + b, 0));
  // Only distribute when the parts are the whole (total not larger than the sum).
  const sum = raw.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.001) left = 0;
  const order = raw.map((r, i) => [r - floor[i], i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const out = [...floor];
  for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) out[order[k][1]] += 1;
  if (Math.abs(sum - 100) > 0.001) raw.forEach((r, i) => { out[i] = Math.round(r); });
  return raw.map((r, i) => {
    if (r > 0 && r < 0.5) return '<1%';
    if (r >= 99.5 && r < 100) return '>99%';
    return `${out[i]}%`;
  });
}

/** Singular unit when the total is exactly 1 ("Students" → "Student", "Faculties" → "Faculty"). */
function unitFor(unit, count, unitOne) {
  if (!unit || Number(count) !== 1) return unit;
  if (unitOne) return unitOne;
  if (/ies$/i.test(unit)) return unit.replace(/ies$/i, (m) => (m[0] === 'I' ? 'Y' : 'y'));
  if (/(ss|sh|ch|x|z)es$/i.test(unit)) return unit.replace(/es$/i, '');
  if (/[^s]s$/i.test(unit)) return unit.slice(0, -1);
  return unit;
}

function ChartTip({ active, payload, label, format, suffix, labelOf }) {
  if (!active || !payload?.length) return null;
  const shown = labelOf ? labelOf(label) : label;
  return (
    <div className="dv-tip">
      {shown != null ? <b>{shown}</b> : null}
      {payload.map((p) => (
        <span key={p.dataKey ?? p.name}>
          <i style={{ background: p.color || p.payload?.fill }} aria-hidden="true" />
          {p.name}: {fmt(p.value, format)}{suffix}
        </span>
      ))}
    </div>
  );
}

/**
 * Vertical columns, one colour per column (or per series when `series` is given).
 * data: [{ [xKey]: label, [yKey]: value }]
 */
export function ColumnChart({ data, xKey = 'label', yKey = 'value', name = 'Value', colorBy = 'series', height = 220, format, suffix = '', empty = 'No data yet.' }) {
  const mounted = useMounted();
  if (!data?.length) return <p className="dv-empty">{empty}</p>;
  return (
    <div className="dv-chart" style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#DEE0E1" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#536064' }} tickLine={false} axisLine={{ stroke: '#DEE0E1' }} interval={0} />
            <YAxis tick={{ fontSize: 12, fill: '#536064' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'rgba(14,92,107,.06)' }} content={<ChartTip format={format} suffix={suffix} />} />
            <Bar dataKey={yKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={44}>
              {data.map((d, i) => (
                <Cell key={d[xKey] ?? i} fill={colorBy === 'band' ? BAND_HEX[bandFor(d[yKey])] : dataColor(i, { hex: true })} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

/**
 * Trend over time (area for one series, lines for several).
 * series: [{ key, name, color? }] — colours follow series order unless a series sets `color`
 * (hex, e.g. a subject colour from dataColor(id, { hex: true })).
 */
export function TrendChart({ data, xKey = 'label', series, height = 220, format, suffix = '', empty = 'No activity in this range.' }) {
  const mounted = useMounted();
  const colorOf = (s, i) => s.color || dataColor(i, { hex: true });
  if (!data?.length) return <p className="dv-empty">{empty}</p>;
  // Several points can share a label (two sessions on one day): plot by index and
  // print a label only where it changes, so the axis never repeats a date.
  const rows = data.map((d, i) => ({ ...d, __i: i }));
  const tickFor = (i) => {
    const cur = rows[i]?.[xKey];
    return i > 0 && rows[i - 1]?.[xKey] === cur ? '' : String(cur ?? '');
  };
  return (
    <div className="dv-chart" style={{ height }}>
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`dv-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorOf(s, i)} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={colorOf(s, i)} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#DEE0E1" strokeDasharray="3 3" />
            <XAxis dataKey="__i" type="category" tickFormatter={tickFor} tick={{ fontSize: 12, fill: '#536064' }} tickLine={false} axisLine={{ stroke: '#DEE0E1' }} minTickGap={16} />
            <YAxis tick={{ fontSize: 12, fill: '#536064' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip format={format} suffix={suffix} labelOf={(i) => rows[i]?.[xKey] ?? i} />} />
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={colorOf(s, i)}
                strokeWidth={2}
                fill={`url(#dv-fill-${s.key})`}
                dot={{ r: 3.5, fill: '#F5821F', stroke: '#fff', strokeWidth: 1 }}
                isAnimationActive={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : null}
      {series.length > 1 ? (
        <ul className="dv-slegend">
          {series.map((s, i) => <li key={s.key}><i style={{ background: colorOf(s, i) }} aria-hidden="true" />{s.name}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   Modern cards (owner reference, 21 Oct 2026 — docs/agent/redesign/modern-cards-plan.md)
   ModernDonutCard · ModernDonut · MetricList · MetricListCard
   Pure SVG (no recharts) so it renders on the server too and never animates.
   ========================================================================== */

// Named tones for parts / rows. Grey = neutral states (Generating, Not set, Pending…).
const TONE_HEX = {
  strong: BAND_HEX.strong, ok: BAND_HEX.ok, focus: BAND_HEX.focus, none: BAND_HEX.none,
  good: '#5CB414', info: '#2C74E0', warn: '#F5821F', bad: '#D34141', neutral: '#BCC1C3',
  purple: '#6C3CD8', cyan: '#23B6B9', teal: '#0E5C6B',
};

/** Slice colour: explicit color → tone → band/tone key → series colour by index. */
function partColor(p, i) {
  return p.color || TONE_HEX[p.tone] || TONE_HEX[p.key] || dataColor(i, { hex: true });
}

function fmtCount(v, format) {
  if (format) return format(v);
  return fmt(v);
}

function InfoGlyph() {
  return (
    <svg className="mdc-note-i" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10.75v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" />
    </svg>
  );
}

function MoreLink({ link, className = '' }) {
  if (!link?.href) return null;
  return (
    <Link href={link.href} className={`mdc-link ${className}`.trim()}>
      {link.label || 'View details'} <span aria-hidden="true">→</span>
    </Link>
  );
}

/** Info strip: note = string | { text, link:{ href, label } }; falls back to the card link. */
function Note({ note, link }) {
  if (!note) return null;
  const text = typeof note === 'string' ? note : note.text;
  const l = (typeof note === 'object' && note.link) || link;
  return (
    <div className="mdc-note">
      <InfoGlyph />
      <p>
        <span>{text}</span>
        {l?.href ? <MoreLink link={l} /> : null}
      </p>
    </div>
  );
}

/** SVG ring. segs: [{ value, color, label }] with value > 0. */
function Ring({ segs, sum, size, stroke, total, unit, label, format }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = segs.length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <div className="mdc-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F0" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {sum > 0 ? segs.map((s) => {
            const len = (Number(s.value) / sum) * c;
            const dash = Math.max(1, len - gap);
            const el = (
              <circle
                key={s.key ?? s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc}
              >
                <title>{`${s.label}: ${fmtCount(s.value, format)}`}</title>
              </circle>
            );
            acc += len;
            return el;
          }) : null}
        </g>
      </svg>
      <span className="mdc-ring-t" aria-hidden="true">
        <b>{fmtCount(total, format)}</b>
        {unit ? <small>{unit}</small> : null}
      </span>
    </div>
  );
}

function donutModel({ parts = [], total, title, unit, format }) {
  const colored = parts.map((p, i) => ({ ...p, value: Number(p.value) || 0, color: partColor(p, i) }));
  const sum = colored.reduce((a, p) => a + p.value, 0);
  const base = Number(total) || sum;
  const shown = total ?? sum;
  const pcts = sharePcts(colored.map((p) => p.value), base);
  colored.forEach((p, i) => { p.pct = pcts[i]; });
  const aria = `${title ? `${title}: ` : ''}${colored.map((p) => `${p.label} ${fmtCount(p.value, format)} (${p.pct})`).join(', ')}. Total ${fmtCount(shown, format)}${unit ? ` ${unit}` : ''}.`;
  return { colored, base, shown, aria, segs: colored.filter((p) => p.value > 0) };
}

/**
 * Donut + legend for use INSIDE an existing panel body (no card chrome).
 * parts: [{ key?, label, value, color?, tone?, href? }]
 *   tone: good | info | warn | bad | neutral | strong | ok | focus | none | purple | cyan | teal
 *   (a part whose key is a band/tone name gets that colour automatically).
 * compact: small ring + "count (pct%)" legend + "View details →" link (link prop).
 */
export function ModernDonut({
  parts = [], total, unit: unitMany, unitOne, title, note, link, compact = false, empty = 'No data yet.', format, size, className = '',
}) {
  const sumAll = total ?? parts.reduce((a, p) => a + (Number(p.value) || 0), 0);
  const unit = unitFor(unitMany, sumAll, unitOne);
  const m = donutModel({ parts, total, title, unit, format });
  const ringSize = size || (compact ? 128 : 184);
  const stroke = Math.round(ringSize * (compact ? 0.15 : 0.17));
  const isEmpty = !m.base;
  return (
    <div className={`mdc ${compact ? 'mdc--compact' : ''} ${isEmpty ? 'mdc--empty' : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <div className="mdc-body">
        <Ring
          segs={isEmpty ? [] : m.segs}
          sum={m.base}
          size={ringSize}
          stroke={stroke}
          total={isEmpty ? 0 : m.shown}
          unit={unit}
          format={format}
          label={isEmpty ? `${title ? `${title}: ` : ''}${empty}` : m.aria}
        />
        {isEmpty ? (
          <p className="mdc-empty">{empty}</p>
        ) : (
          <ul className="mdc-legend" aria-label={title ? `${title} breakdown` : 'Breakdown'}>
            {m.colored.map((p) => {
              const name = p.href ? <Link href={p.href}>{p.label}</Link> : p.label;
              const { pct } = p;
              return (
                <li key={p.key ?? p.label} style={{ '--mdc-c': p.color }}>
                  <i className="mdc-dot" aria-hidden="true" />
                  <span className="mdc-label">{name}</span>
                  {compact ? (
                    <span className="mdc-count">{fmtCount(p.value, format)} <span className="mdc-pct-txt">({pct})</span></span>
                  ) : (
                    <>
                      <b className="mdc-count">{fmtCount(p.value, format)}</b>
                      <span className="mdc-pill">{pct}</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!compact ? <Note note={note} link={link} /> : null}
      {link?.href && (compact || !note) ? <div className="mdc-foot"><MoreLink link={link} /></div> : null}
    </div>
  );
}

/** "Total <thing>" chip for the card head. */
function TotalChip({ label, value, format }) {
  if (!label) return null;
  return (
    <div className="mdc-chip">
      <small>{label}</small>
      <b>{fmtCount(value, format)}</b>
    </div>
  );
}

/**
 * Full modern card: title + sub, top-right "Total …" chip, donut + legend rows, optional note strip.
 * Uses the shared panel chrome (.sp-panel / .sp-panel-h / .sp-panel-b) so it sits in grids beside other panels.
 * `action` replaces the chip in the head (e.g. a select); compact cards never show the chip.
 */
export function ModernDonutCard({
  title, sub, totalLabel, total, unit, unitOne, parts = [], note, link, compact = false, empty, format, className = '', action, size,
}) {
  const sum = total ?? parts.reduce((a, p) => a + (Number(p.value) || 0), 0);
  const chip = !compact && totalLabel ? <TotalChip label={totalLabel} value={sum} format={format} /> : null;
  return (
    <section className={`sp-panel mdc-card ${compact ? 'mdc-card--compact' : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      {title || chip || action ? (
        <div className="sp-panel-h">
          <div>
            {title ? <h3>{title}</h3> : null}
            {sub ? <p>{sub}</p> : null}
          </div>
          {action || chip}
        </div>
      ) : null}
      <div className="sp-panel-b">
        <ModernDonut parts={parts} total={total} unit={unit} unitOne={unitOne} title={title} note={note} link={link} compact={compact} empty={empty} format={format} size={size} />
      </div>
    </section>
  );
}

/**
 * Per-item metric rows in the legend-row style (no bar): dot · label (+ sub) · tinted value pill.
 * items: [{ key?, label, value, display?, sub?, color?, tone?, href? }]
 * colorBy: 'series' (default, one hue per row) | 'band' (0–100 score band) | 'single' (teal)
 */
export function MetricList({
  items, format, suffix = '', empty = 'No data yet.', max, colorBy = 'series', label, className = '',
}) {
  if (!items?.length) return <p className="mdc-empty mdc-empty--list">{empty}</p>;
  const rows = max ? items.slice(0, max) : items;
  return (
    <ul className={`mdc-legend mdc-metrics ${className}`.trim()} aria-label={label}>
      {rows.map((it, i) => {
        const color = it.color || TONE_HEX[it.tone]
          || (colorBy === 'band' ? BAND_HEX[bandFor(it.value)] : colorBy === 'single' ? '#0E5C6B' : dataColor(i, { hex: true }));
        const name = it.href ? <Link href={it.href}>{it.label}</Link> : it.label;
        const shown = it.display ?? (it.value == null || Number.isNaN(Number(it.value)) ? '—' : `${fmt(it.value, format)}${suffix}`);
        return (
          <li key={it.key ?? it.label} style={{ '--mdc-c': color }}>
            <i className="mdc-dot" aria-hidden="true" />
            <span className="mdc-label">
              <span className="mdc-label-t">{name}</span>
              {it.sub ? <small>{it.sub}</small> : null}
            </span>
            <span className="mdc-pill">{shown}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** MetricList in its own card (title, sub, optional head action, note strip, "View …" link). */
export function MetricListCard({ title, sub, action, note, link, className = '', ...listProps }) {
  return (
    <section className={`sp-panel mdc-card ${className}`.trim()}>
      {title || action ? (
        <div className="sp-panel-h">
          <div>
            {title ? <h3>{title}</h3> : null}
            {sub ? <p>{sub}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="sp-panel-b">
        <div className="mdc">
          <MetricList label={title} {...listProps} />
          <Note note={note} link={link} />
          {!note && link?.href ? <div className="mdc-foot"><MoreLink link={link} /></div> : null}
        </div>
      </div>
    </section>
  );
}
