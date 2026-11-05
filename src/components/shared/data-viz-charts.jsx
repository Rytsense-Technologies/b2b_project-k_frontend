'use client';

/**
 * Recharts plots behind ColumnChart and TrendChart (data-viz.jsx), split out so only the
 * pages that draw a chart download Recharts. Import through data-viz.jsx, never directly.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BAND_HEX, bandFor, dataColor, fmt } from './data-viz';

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

export function ColumnPlot({ data, xKey, yKey, name, colorBy, format, suffix }) {
  return (
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
  );
}

export function TrendPlot({ data, xKey, series, format, suffix }) {
  const colorOf = (s, i) => s.color || dataColor(i, { hex: true });
  // Several points can share a label (two sessions on one day): plot by index and
  // print a label only where it changes, so the axis never repeats a date.
  const rows = data.map((d, i) => ({ ...d, __i: i }));
  const tickFor = (i) => {
    const cur = rows[i]?.[xKey];
    return i > 0 && rows[i - 1]?.[xKey] === cur ? '' : String(cur ?? '');
  };
  return (
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
  );
}
