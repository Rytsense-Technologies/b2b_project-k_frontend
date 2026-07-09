'use client';
import { formatDate, getScoreColor } from '@/lib/utils';
import { Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function InterviewCard({ interview }) {
  const { id, role, mode, score, duration, completedAt, status } = interview;
  const color = getScoreColor(score);

  return (
    <Link
      href={`/main/reports/${id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
    >
      {/* Score circle */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
        style={{ backgroundColor: color }}
      >
        {score ?? '—'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 text-sm truncate">{role || 'General Interview'}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-500 capitalize">{mode || 'mock'}</span>
          {duration && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} /> {Math.round(duration / 60)}m
            </span>
          )}
          {completedAt && (
            <span className="text-xs text-slate-400">{formatDate(completedAt)}</span>
          )}
        </div>
      </div>

      {/* Status / arrow */}
      <div className="flex items-center gap-2">
        {status === 'processing' ? (
          <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
            Processing
          </span>
        ) : (
          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        )}
      </div>
    </Link>
  );
}
