'use client';

export default function AppHeader({ title, subtitle, endContent = null, compact = false }) {
  return (
    <header
      className={`sticky top-0 z-30 flex items-start gap-4 border-b border-[#e3e7ee]/60 w-full shrink-0 ${
        compact ? 'py-2' : 'py-3'
      }`}
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-slate-800 leading-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
        ) : null}
      </div>

      {endContent ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {endContent}
        </div>
      ) : null}
    </header>
  );
}
