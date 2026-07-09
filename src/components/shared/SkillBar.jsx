'use client';
import { getScoreColor } from '@/lib/utils';

export default function SkillBar({ label, value = 0, color, showScore = true }) {
  const barColor = color || getScoreColor(value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-36 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, backgroundColor: barColor }}
        />
      </div>
      {showScore && (
        <span className="text-sm font-semibold w-8 text-right" style={{ color: barColor }}>
          {value}
        </span>
      )}
    </div>
  );
}
