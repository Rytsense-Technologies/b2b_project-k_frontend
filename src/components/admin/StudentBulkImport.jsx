'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { ConfirmNote, Icon, Panel, countLabel } from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { apiErrorMessage, unwrap } from '@/lib/api/superadmin/http';

export const MAX_IMPORT_ROWS = 100;
const MAX_FILE_BYTES = 512 * 1024;
const COLUMNS = ['first_name', 'last_name', 'email', 'phone_number', 'department', 'program', 'semester'];
const REQUIRED = ['first_name', 'last_name', 'email', 'department'];
const ALIASES = {
  'first name': 'first_name', firstname: 'first_name',
  'last name': 'last_name', lastname: 'last_name', surname: 'last_name',
  'email address': 'email', 'e-mail': 'email', mail: 'email',
  phone: 'phone_number', mobile: 'phone_number', 'phone number': 'phone_number', 'mobile number': 'phone_number',
  dept: 'department', 'department code': 'department',
  programme: 'program', course: 'program', 'program code': 'program', 'programme code': 'program',
  sem: 'semester', 'current semester': 'semester',
};

/** RFC 4180-ish CSV: quoted fields, escaped quotes, CRLF / LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}

function headerKey(h) {
  const k = String(h || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  const snake = k.replace(/ /g, '_');
  if (COLUMNS.includes(snake)) return snake;
  return ALIASES[k] || null;
}

/** CSV text -> { rows, error } with rows keyed by COLUMNS. */
export function rowsFromCsv(text) {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], error: 'The file is empty.' };
  const keys = table[0].map(headerKey);
  const missing = REQUIRED.filter((c) => !keys.includes(c));
  if (missing.length) {
    return { rows: [], error: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template.` };
  }
  const rows = table.slice(1).map((values) => {
    const out = {};
    keys.forEach((k, i) => { if (k) out[k] = (values[i] ?? '').trim(); });
    return out;
  });
  if (!rows.length) return { rows: [], error: 'The file has a header row but no students.' };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { rows: [], error: `${countLabel(rows.length)} students in the file. Import up to ${MAX_IMPORT_ROWS} at a time.` };
  }
  return { rows, error: null };
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(name, lines) {
  const blob = new Blob([`﻿${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * College Admin bulk student import (SOW §6.3): CSV of up to 100 students ->
 * server check (nothing written) -> create the rows that passed. Every created
 * student gets the same activation invite as "Add student".
 * inline: render as a page panel (Students › Bulk import tab) instead of a modal.
 */
export default function StudentBulkImport({ open, onClose, onImported, sampleDepartment, inline = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState('');
  // Server or network trouble is not the file's fault - say so in the heading.
  const [checkFailed, setCheckFailed] = useState(false);
  const [result, setResult] = useState(null); // dry run or final response
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName('');
    setRows([]);
    setFileError('');
    setCheckFailed(false);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const check = async (parsed) => {
    setBusy(true);
    try {
      const res = unwrap(await usersApi.bulkImportStudents(parsed, { dryRun: true }));
      setResult(res);
    } catch (err) {
      setCheckFailed(!err?.response || err.response.status >= 500);
      setFileError(apiErrorMessage(err, 'Could not check the file. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const readFile = (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setFileError('Choose a .csv file. In Excel, use File › Save as › CSV.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('This file is too large for 100 students. Check you picked the right file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed, error } = rowsFromCsv(String(reader.result || ''));
      if (error) {
        setFileError(error);
        return;
      }
      setRows(parsed);
      check(parsed);
    };
    reader.onerror = () => setFileError('Could not read this file.');
    reader.readAsText(file);
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = unwrap(await usersApi.bulkImportStudents(rows, { dryRun: false }));
      setResult(res);
      if (res.created) {
        toast.success(`${countLabel(res.created)} student${res.created === 1 ? '' : 's'} added — activation links sent`);
        onImported?.();
      } else {
        toast.error('No students were added. Fix the rows marked below.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not import the students'));
    } finally {
      setBusy(false);
    }
  };

  const template = () => downloadCsv('quirri-students-template.csv', [
    COLUMNS,
    ['Asha', 'Raman', 'asha.raman@example.com', '9876543210', sampleDepartment || 'Computer Science', '', ''],
  ]);

  const errorRows = () => downloadCsv('quirri-students-to-fix.csv', [
    [...COLUMNS, 'problem'],
    ...(result?.rows || []).filter((r) => r.status === 'error').map((r) => {
      const src = rows[r.row - 2] || {};
      return [...COLUMNS.map((c) => src[c] ?? ''), r.errors.join(' ')];
    }),
  ]);

  const done = result && result.dry_run === false;
  const valid = result?.valid || 0;
  const invalid = result?.invalid || 0;

  const footer = (
    <>
      {inline ? (
        <button type="button" className="sd-btn sd-btn--ghost" onClick={reset} disabled={busy || (!fileName && !result)}>
          Clear
        </button>
      ) : (
        <button type="button" className="sd-btn sd-btn--ghost" onClick={close} disabled={busy}>
          {done ? 'Close' : 'Cancel'}
        </button>
      )}
      <div className="right">
        {result && invalid ? (
          <button type="button" className="sd-btn sd-btn--ghost" onClick={errorRows} disabled={busy}>
            <Icon name="download" size={16} /> Rows to fix
          </button>
        ) : null}
        {done ? (
          <button type="button" className="sd-btn sd-btn--teal" onClick={reset} disabled={busy}>
            <Icon name="upload" size={16} /> Import another file
          </button>
        ) : (
          <button type="button" className="sd-btn sd-btn--amber" onClick={create} disabled={busy || !valid}>
            <Icon name="userPlus" size={16} />
            {busy && result ? 'Adding…' : valid ? `Add ${countLabel(valid)} student${valid === 1 ? '' : 's'}` : 'Add students'}
          </button>
        )}
      </div>
    </>
  );

  const body = (
      <div className="un-form ad-import">
        {!done ? (
          <div className="ad-import-steps">
            <p className="ad-muted">
              Columns: <b>first_name, last_name, email, department</b> (name or code) — optional <b>phone_number, program, semester</b>.
              Nothing is saved until you press <b>Add students</b>.
            </p>
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={template}>
              <Icon name="download" size={16} /> Download template
            </button>
          </div>
        ) : null}

        {!done ? (
          <div
            className={`ad-drop${dragging ? ' is-drag' : ''}${fileName && !fileError ? ' has-file' : ''}`}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="Choose a CSV file"
            aria-disabled={busy || undefined}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) readFile(e.dataTransfer?.files?.[0]); }}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (!busy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); }
            }}
          >
            <span className="ad-drop-ic" aria-hidden="true"><Icon name={fileName ? 'doc' : 'upload'} size={22} /></span>
            <span className="ad-drop-copy">
              <b>{fileName || 'Drop a CSV file, or click to browse'}</b>
              <small>
                {busy && !result ? 'Checking every row…' : rows.length ? `${countLabel(rows.length)} student${rows.length === 1 ? '' : 's'} in this file` : 'Save your spreadsheet as CSV (UTF-8)'}
              </small>
            </span>
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
          </div>
        ) : null}

        {fileError ? (
          <ConfirmNote danger title={checkFailed ? "Couldn't check this file right now" : "This file can't be imported"}>{fileError}</ConfirmNote>
        ) : null}

        {result ? (
          <>
            {done ? (
              <ConfirmNote icon={result.created ? 'tick' : 'alert'} title={`${countLabel(result.created)} student${result.created === 1 ? '' : 's'} added`}>
                {result.created
                  ? 'Each one got an activation email and appears as Pending activation until they set a password.'
                  : 'No students were added.'}
                {invalid ? ` ${countLabel(invalid)} row${invalid === 1 ? ' was' : 's were'} skipped — download them, fix and import again.` : ''}
              </ConfirmNote>
            ) : (
              <div className="ad-import-sum" aria-live="polite">
                <span className="sp-pill sp-pill--good"><i className="un-dot" aria-hidden="true" />{countLabel(valid)} ready</span>
                {invalid ? <span className="sp-pill sp-pill--err"><i className="un-dot" aria-hidden="true" />{countLabel(invalid)} to fix</span> : null}
                {/* Seat info only when the college's student cap is close (≤ 50 left or fewer than this file adds). */}
                {result.seats_left != null && (result.seats_left <= 50 || result.seats_left < valid) ? (
                  <span className="sp-pill">
                    {result.seats_left > 0
                      ? `You can add ${countLabel(result.seats_left)} more student${result.seats_left === 1 ? '' : 's'}`
                      : 'Your college has reached its student limit'}
                  </span>
                ) : null}
                {invalid && valid ? <small className="ad-muted">Rows marked “Fix” are skipped; the rest can be added now.</small> : null}
              </div>
            )}
            <div className="sp-table-wrap ad-import-table">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th className="num">Row</th>
                    <th>Student</th>
                    <th>Department</th>
                    <th>Programme</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.row} className={r.status === 'error' ? 'is-err' : undefined}>
                      <td className="num">{r.row}</td>
                      <td>
                        <b>{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</b>
                        <small className="ad-cell-sub">{r.email || '—'}</small>
                      </td>
                      <td>{r.department || rows[r.row - 2]?.department || '—'}</td>
                      <td>{r.program ? `${r.program}${r.semester ? ` · ${r.semester}` : ''}` : '—'}</td>
                      <td>
                        {r.status === 'error' ? (
                          <>
                            <span className="sp-pill sp-pill--err"><i className="un-dot" aria-hidden="true" />Fix</span>
                            <ul className="ad-row-errs">{r.errors.map((m) => <li key={m}>{m}</li>)}</ul>
                          </>
                        ) : (
                          <span className="sp-pill sp-pill--good">
                            <i className="un-dot" aria-hidden="true" />{r.status === 'created' ? 'Added' : 'Ready'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
  );

  if (inline) {
    return (
      <Panel
        title="Import students from CSV"
        sub={`Up to ${MAX_IMPORT_ROWS} students at a time · each one gets an activation link`}
        className="ad-import-panel"
      >
        {body}
        <div className="ad-import-foot">{footer}</div>
      </Panel>
    );
  }

  return (
    <QuirriModal open={open} onClose={close} title="Bulk import students" crumb={`CSV · up to ${MAX_IMPORT_ROWS} students at a time`} wide footer={footer}>
      {body}
    </QuirriModal>
  );
}
