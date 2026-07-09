'use client';

export default function EmptyState({ icon: Icon, title, description, cta, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Icon size={24} className="text-blue-400" />
        </div>
      )}
      <div>
        <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      </div>
      {cta && (
        <button onClick={onCta} className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
          {cta}
        </button>
      )}
    </div>
  );
}
