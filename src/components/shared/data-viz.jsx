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
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
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
// Text on white needs the darker AA variants.
const BAND_TEXT = { strong: 'var(--progress-text)', ok: 'var(--cat-1-text)', focus: 'var(--accent-text)', none: 'var(--muted)' };

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

/** Legend row. items: [{ label, color }] */
export function Legend({ items, className = '' }) {
  return (
    <ul className={`dv-legend ${className}`.trim()}>
      {items.map((it) => (
        <li key={it.label}>
          <i style={{ background: it.color }} aria-hidden="true" />
          {it.label}
          {it.value != null ? <b>{it.value}</b> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Horizontal bar list.
 * items: [{ key?, label, value, sub?, href?, color? }]
 * colorBy: 'series' (one hue per row) | 'band' (score band) | 'single' (teal)
 */
export function BarList({ items, max, format, colorBy = 'series', suffix = '', empty = 'No data yet.', label }) {
  if (!items?.length) return <p className="dv-empty">{empty}</p>;
  const top = max ?? Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <ul className="dv-bars" aria-label={label}>
      {items.map((it, i) => {
        const v = Number(it.value) || 0;
        const pct = Math.max(0, Math.min(100, (v / top) * 100));
        const color = it.color
          || (colorBy === 'band' ? BAND_HEX[bandFor(it.value)] : colorBy === 'single' ? 'var(--teal-500)' : dataColor(it.key ?? i));
        const name = it.href ? <Link href={it.href}>{it.label}</Link> : it.label;
        return (
          <li key={it.key ?? it.label}>
            <div className="dv-bar-h">
              <span className="dv-bar-l">
                <i className="dv-dot" style={{ background: color }} aria-hidden="true" />
                <span className="dv-bar-name">{name}</span>
                {it.sub ? <small>{it.sub}</small> : null}
              </span>
              <b className="dv-bar-v">{fmt(it.value, format)}{suffix}</b>
            </div>
            <span className="dv-track" aria-hidden="true"><span style={{ width: `${pct}%`, background: color }} /></span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Ranked list (leaderboards, top / bottom performers).
 * rows: [{ key?, name, sub?, value, href? }]
 */
export function RankList({ rows, format, suffix = '', start = 1, empty = 'No ranking yet.', showBand = true, label }) {
  if (!rows?.length) return <p className="dv-empty">{empty}</p>;
  return (
    <ol className="dv-rank" aria-label={label}>
      {rows.map((r, i) => {
        const n = start + i;
        const tier = n === 1 ? 'r1' : n === 2 ? 'r2' : n === 3 ? 'r3' : 'rn';
        const name = r.href ? <Link href={r.href}>{r.name}</Link> : r.name;
        return (
          <li key={r.key ?? `${r.name}-${n}`}>
            <span className={`dv-rank-n dv-rank-n--${tier}`}>{n}</span>
            <span className="dv-rank-who">
              <b>{name}</b>
              {r.sub ? <small>{r.sub}</small> : null}
            </span>
            {showBand && r.value != null ? <BandPill score={r.value} /> : null}
            <b className="dv-rank-v">{fmt(r.value, format)}{suffix}</b>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Stacked distribution bar with legend.
 * parts: [{ label, value, color? }] — defaults to score-band colours when keys match BANDS.
 */
export function Distribution({ parts, total, empty = 'No data yet.', label = 'Distribution' }) {
  const sum = total ?? parts.reduce((a, p) => a + (Number(p.value) || 0), 0);
  if (!sum) return <p className="dv-empty">{empty}</p>;
  const colored = parts.map((p, i) => ({ ...p, color: p.color || BAND_HEX[p.key] || dataColor(i) }));
  return (
    <div className="dv-dist">
      <div className="dv-dist-bar" role="img" aria-label={`${label}: ${colored.map((p) => `${p.label} ${p.value}`).join(', ')}`}>
        {colored.map((p) => (Number(p.value) > 0 ? (
          <span key={p.label} style={{ width: `${(Number(p.value) / sum) * 100}%`, background: p.color }} />
        ) : null))}
      </div>
      <Legend items={colored.map((p) => ({ label: p.label, color: p.color, value: `${fmt(p.value)} · ${Math.round((Number(p.value) / sum) * 100)}%` }))} />
    </div>
  );
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
      {series.length > 1 ? <Legend items={series.map((s, i) => ({ label: s.name, color: colorOf(s, i) }))} /> : null}
    </div>
  );
}

/** Donut with centre total and legend. parts: [{ label, value, color? }] */
export function DonutChart({ parts, centerLabel = 'Total', height = 180, empty = 'No data yet.' }) {
  const mounted = useMounted();
  const sum = parts.reduce((a, p) => a + (Number(p.value) || 0), 0);
  if (!sum) return <p className="dv-empty">{empty}</p>;
  const colored = parts.map((p, i) => ({ ...p, color: p.color || BAND_HEX[p.key] || dataColor(i, { hex: true }) }));
  return (
    <div className="dv-donut">
      <div className="dv-donut-c" style={{ height, width: height }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={colored.filter((p) => Number(p.value) > 0)} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="100%" paddingAngle={colored.filter((p) => Number(p.value) > 0).length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
                {colored.filter((p) => Number(p.value) > 0).map((p) => <Cell key={p.label} fill={p.color} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
        <span className="dv-donut-t"><b>{fmt(sum)}</b><small>{centerLabel}</small></span>
      </div>
      <Legend items={colored.map((p) => ({ label: p.label, color: p.color, value: fmt(p.value) }))} className="dv-legend--col" />
    </div>
  );
}

/** Compact meter for a single 0–100 value, coloured by band. */
export function ScoreMeter({ value, label }) {
  const band = bandFor(value);
  const pct = value == null ? 0 : Math.max(0, Math.min(100, Number(value)));
  return (
    <span className="dv-meter" aria-label={label ? `${label}: ${value ?? 'no data'}` : undefined}>
      <span className="dv-track"><span style={{ width: `${pct}%`, background: BAND_HEX[band] }} /></span>
      <b style={{ color: BAND_TEXT[band] }}>{value == null ? '—' : `${Math.round(pct)}%`}</b>
    </span>
  );
}
