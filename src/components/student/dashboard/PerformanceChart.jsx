'use client';

import { useId, useMemo, useState } from 'react';
import { scoreBand } from '@/lib/student/dashboardModel';

const W = 640;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
const TICKS = [0, 25, 50, 75, 100];

/**
 * Score trend area chart — teal line + soft area, amber points,
 * hover/focus guide with a tooltip card (client reference layout).
 */
export default function PerformanceChart({ items = [], ariaLabel = 'Score trend' }) {
  const gradId = useId().replace(/:/g, '');
  const [active, setActive] = useState(null);

  const pts = useMemo(() => {
    const n = items.length;
    const iw = W - PAD.left - PAD.right;
    const ih = H - PAD.top - PAD.bottom;
    return items.map((it, i) => ({
      ...it,
      x: PAD.left + (n === 1 ? iw / 2 : (iw * i) / (n - 1)),
      y: PAD.top + ih - (Math.max(0, Math.min(100, it.score)) / 100) * ih,
    }));
  }, [items]);

  if (!pts.length) return null;

  const baseY = H - PAD.bottom;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${baseY} L${pts[0].x},${baseY} Z`;
  const a = active != null ? pts[active] : null;
  const band = a ? scoreBand(a.score) : null;

  return (
    <div className="sd-chart" onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={`g${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E5C6B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0E5C6B" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {TICKS.map((t) => {
          const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - t / 100);
          return (
            <g key={t}>
              <line className="sd-grid" x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
              <text className="sd-axis" x={PAD.left - 10} y={y + 4} textAnchor="end">{t}</text>
            </g>
          );
        })}

        <path d={area} fill={`url(#g${gradId})`} />
        <path className="sd-line" d={line} pathLength="1" />

        {a ? <line className="sd-guide" x1={a.x} x2={a.x} y1={PAD.top} y2={baseY} /> : null}

        {pts.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <text className="sd-axis" x={p.x} y={H - 8} textAnchor="middle">{p.label}</text>
            <circle
              className={`sd-pt${i === active ? ' is-active' : ''}`}
              cx={p.x}
              cy={p.y}
              r={i === active ? 7 : 5}
            />
            {/* larger invisible hit target for pointer + keyboard */}
            <circle
              cx={p.x}
              cy={p.y}
              r="18"
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${p.title}, ${p.date}, score ${p.score}%`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
            />
          </g>
        ))}
      </svg>

      {a ? (
        <div
          className="sd-tip"
          style={{
            left: `${(a.x / W) * 100}%`,
            top: `${(a.y / H) * 100}%`,
          }}
          role="status"
        >
          <b>{a.title}</b>
          {a.date ? <small>{a.date}</small> : null}
          <div className="sd-tip-score">{a.score}%{a.detail ? <small>{a.detail}</small> : null}</div>
          <span className={`sd-band sd-band--${band.key}`}>{band.label}</span>
        </div>
      ) : null}
    </div>
  );
}
