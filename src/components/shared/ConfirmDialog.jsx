'use client';
import { X } from 'lucide-react';

export default function ConfirmDialog({ open, title = 'Are you sure?', message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false, overlayClassName = 'z-50' }) {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm ${overlayClassName}`}>
      <div className="card p-6 w-full max-w-sm mx-4 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-colors ${
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
