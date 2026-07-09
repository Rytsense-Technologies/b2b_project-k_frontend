'use client';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  X, Upload, FileText, AlertCircle,
  CheckCircle2, Loader2, ChevronRight,
} from 'lucide-react';
import { usersApi } from '@/lib/api/superadmin/users';

// ── CSV parser (browser-side, no dependencies) ────────────────────────────────

const REQUIRED_COLS = ['first_name', 'last_name', 'email', 'role', 'tenant_id'];

function parseCSV(text) {
  const lines  = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], error: 'The file is empty.' };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const missing  = REQUIRED_COLS.filter((c) => !headers.includes(c));
  if (missing.length) {
    return {
      headers,
      rows:  [],
      error: `Missing required columns: ${missing.join(', ')}`,
    };
  }

  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });

  return { headers, rows, error: null };
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step  ? 'bg-[#2563eb] text-white' :
              s === step ? 'bg-[#2563eb] text-white ring-4 ring-[#e0deff]' :
                           'bg-slate-100 text-slate-400'
            }`}
          >
            {s < step ? <CheckCircle2 size={14} /> : s}
          </div>
          {s < 3 && (
            <div className={`h-px w-8 ${s < step ? 'bg-[#2563eb]' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500">
        {step === 1 ? 'Select file' : step === 2 ? 'Preview data' : 'Results'}
      </span>
    </div>
  );
}

// ── Step 1: File picker ───────────────────────────────────────────────────────

function Step1({ onParsed }) {
  const inputRef = useRef(null);
  const [error,    setError]    = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Only .csv files are accepted.');
      return;
    }
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result);
      if (result.error) { setError(result.error); return; }
      if (result.rows.length === 0) { setError('No data rows found in the file.'); return; }
      if (result.rows.length > 100) { setError(`Too many rows (${result.rows.length}). Maximum is 100 per upload.`); return; }
      onParsed({ file, rows: result.rows, headers: result.headers });
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[#2563eb] bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <Upload size={28} className={`mx-auto mb-3 ${dragging ? 'text-[#2563eb]' : 'text-slate-300'}`} />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={16} className="text-[#2563eb]" />
            <span className="text-sm font-medium text-slate-700">{fileName}</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">Click to choose or drag & drop a CSV</p>
            <p className="text-xs text-slate-400 mt-1">Max 100 rows per upload</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Required columns hint */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-1">Required columns:</p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_COLS.map((c) => (
            <code key={c} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
              {c}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Preview ───────────────────────────────────────────────────────────

const ROLE_OPTIONS = ['superadmin', 'college_admin', 'faculty', 'student'];

function Step2({ rows, onConfirm, onBack }) {
  const preview = rows.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{rows.length}</span> user{rows.length !== 1 ? 's' : ''} ready to import
          {rows.length > 10 && <span className="text-slate-400"> — showing first 10</span>}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {REQUIRED_COLS.map((c) => (
                <th key={c} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide text-[10px]">
                  {c.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {REQUIRED_COLS.map((col) => (
                  <td key={col} className="px-3 py-2.5 text-slate-700 max-w-[140px] truncate">
                    {row[col] || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onBack}
          className="btn-secondary flex-1 py-2.5 text-sm"
        >
          ← Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: '#2563eb' }}
        >
          Import {rows.length} Users <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Results ───────────────────────────────────────────────────────────

function Step3({ result, onClose }) {
  const { created = 0, failed = 0, errors: failedRows = [] } = result;

  return (
    <div className="text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: created > 0 ? '#f0fdf4' : '#fef2f2' }}
      >
        <CheckCircle2 size={28} className={created > 0 ? 'text-emerald-500' : 'text-red-400'} />
      </div>

      <p className="text-lg font-bold text-slate-800 mb-1">Import Complete</p>
      <p className="text-sm text-slate-500 mb-4">
        <span className="font-semibold text-emerald-600">{created} created</span>
        {failed > 0 && (
          <>, <span className="font-semibold text-red-500">{failed} failed</span></>
        )}
      </p>

      {failedRows.length > 0 && (
        <div className="text-left mb-4 max-h-36 overflow-y-auto rounded-xl border border-red-100 bg-red-50">
          {failedRows.map((row, i) => (
            <div key={i} className="px-3 py-2 border-b border-red-100 last:border-0">
              <p className="text-xs font-medium text-red-700">{row.email || `Row ${i + 1}`}</p>
              <p className="text-xs text-red-500 mt-0.5">{row.reason || 'Unknown error'}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-lg text-white text-sm font-semibold"
        style={{ backgroundColor: '#2563eb' }}
      >
        Done
      </button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function BulkUploadModal({ open, onClose, onSuccess }) {
  const [step,   setStep]   = useState(1);
  const [parsed, setParsed] = useState(null);  // { file, rows, headers }
  const [result, setResult] = useState(null);

  const reset = () => { setStep(1); setParsed(null); setResult(null); };

  const handleClose = () => { reset(); onClose(); };

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', parsed.file);
      return usersApi.bulkCreateUsers(fd);
    },
    onSuccess: (res) => {
      const data = res.data ?? {};
      setResult({ created: data.created ?? 0, failed: data.failed ?? 0, errors: data.errors ?? [] });
      setStep(3);
      onSuccess?.();
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Import failed. Please try again.');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Bulk User Upload</h3>
            <p className="text-xs text-slate-500 mt-0.5">Import up to 100 users via CSV</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step < 3 && <StepDots step={step} />}

          {step === 1 && (
            <Step1
              onParsed={(data) => { setParsed(data); setStep(2); }}
            />
          )}

          {step === 2 && parsed && (
            <Step2
              rows={parsed.rows}
              onBack={() => { setParsed(null); setStep(1); }}
              onConfirm={() => mutation.mutate()}
            />
          )}

          {/* Submitting overlay */}
          {mutation.isPending && step === 2 && (
            <div className="absolute inset-0 rounded-2xl bg-white/80 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-[#2563eb]" />
              <p className="text-sm font-medium text-slate-600">Importing users…</p>
            </div>
          )}

          {step === 3 && result && (
            <Step3 result={result} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
