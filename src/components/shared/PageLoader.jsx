'use client';

export default function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app gap-4">
      <div className="spinner spinner-brand" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}
