'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/shared/module-ui';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import { DOCUMENT_ROLE, SUPPORTED_EXTENSIONS, UPLOAD_LIMITS } from '@/lib/api/admin/eduVideo';

/**
 * Several documents for ONE chapter (FRONTEND_CHANGES.md §2). The backend
 * merges the lesson files in this order into one document → one video, one
 * MCQ set, one voice Q&A lesson. A "Question bank" file is not lesson content:
 * it only tells the video which topics to emphasise.
 *
 * Controlled: `items` = [{ id, file, role }], `onChange(nextItems)`.
 * `serverError` = the upload's `detail` string — the row whose file name it
 * mentions is highlighted.
 */

const MB = 1024 * 1024;
const ROLE_OPTIONS = [
  { value: DOCUMENT_ROLE.CONTENT, label: 'Lesson content' },
  { value: DOCUMENT_ROLE.QUESTION_BANK, label: 'Question bank' },
];

let seq = 0;
const nextId = () => `doc-${Date.now().toString(36)}-${(seq += 1)}`;

function extOf(name = '') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function formatMb(bytes) {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Client-side check of every backend limit. */
export function validateDocuments(items) {
  const rowErrors = {};
  items.forEach((it) => {
    const ext = extOf(it.file.name);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      rowErrors[it.id] = `Unsupported file type '${ext || '(none)'}'.`;
    } else if (it.file.size > UPLOAD_LIMITS.maxFileBytes) {
      rowErrors[it.id] = `Larger than ${formatMb(UPLOAD_LIMITS.maxFileBytes)}.`;
    } else if (it.file.size === 0) {
      rowErrors[it.id] = 'This file is empty.';
    }
  });
  const totalBytes = items.reduce((s, it) => s + it.file.size, 0);
  let summary = '';
  if (!items.length) summary = 'Add at least one document.';
  else if (items.length > UPLOAD_LIMITS.maxFiles) summary = `Upload at most ${UPLOAD_LIMITS.maxFiles} documents per chapter.`;
  else if (totalBytes > UPLOAD_LIMITS.maxTotalBytes) summary = `All documents together must be ${formatMb(UPLOAD_LIMITS.maxTotalBytes)} or smaller.`;
  else if (!items.some((it) => it.role !== DOCUMENT_ROLE.QUESTION_BANK)) summary = 'Add at least one lesson document — a question bank alone cannot make a video.';
  else if (Object.keys(rowErrors).length) summary = 'Remove or replace the files marked below.';
  return { rowErrors, summary, totalBytes, valid: !summary };
}

export default function MultiDocumentPicker({ id = 'content-source-files', items, onChange, disabled = false, serverError = '' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const { rowErrors, summary, totalBytes } = validateDocuments(items);
  const overCount = items.length > UPLOAD_LIMITS.maxFiles;
  const overSize = totalBytes > UPLOAD_LIMITS.maxTotalBytes;

  const addFiles = (fileList) => {
    const added = Array.from(fileList || []).map((file) => ({ id: nextId(), file, role: DOCUMENT_ROLE.CONTENT }));
    if (added.length) onChange([...items, ...added]);
    if (inputRef.current) inputRef.current.value = '';
  };
  const removeAt = (index) => onChange(items.filter((_, i) => i !== index));
  const move = (from, to) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const setRole = (index, role) => onChange(items.map((it, i) => (i === index ? { ...it, role } : it)));

  const serverRow = serverError
    ? items.find((it) => serverError.includes(`'${it.file.name}'`) || serverError.includes(it.file.name))
    : null;

  return (
    <div className="mdp">
      <div
        className={`ad-drop${dragging ? ' is-drag' : ''}${items.length ? ' has-file' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label="Add documents"
        onDragEnter={(e) => { e.preventDefault(); if (dragIndex == null) setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); if (dragIndex == null) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled && dragIndex == null) addFiles(e.dataTransfer?.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="ad-drop-ic" aria-hidden="true"><Icon name="upload" size={22} /></span>
        <span className="ad-drop-copy">
          <b>{items.length ? 'Add more documents' : 'Drop documents, or click to browse'}</b>
          <small>PDF, DOCX, DOC, PPTX or TXT · up to {UPLOAD_LIMITS.maxFiles} files · {formatMb(UPLOAD_LIMITS.maxTotalBytes)} in total</small>
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.join(',')}
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {items.length ? (
        <>
          <div className="mdp-meta" aria-live="polite">
            <span className={overCount ? 'is-over' : ''}>{items.length} / {UPLOAD_LIMITS.maxFiles} files</span>
            <span className={overSize ? 'is-over' : ''}>{formatMb(totalBytes)} / {formatMb(UPLOAD_LIMITS.maxTotalBytes)}</span>
            {items.length > 1 ? <span className="mdp-hint">Drag to reorder — files are combined in this order.</span> : null}
          </div>
          <ol className="mdp-list" aria-label="Documents for this chapter">
            {items.map((it, i) => {
              const err = rowErrors[it.id] || (serverRow?.id === it.id ? serverError : '');
              return (
                <li
                  key={it.id}
                  className={`mdp-row${err ? ' is-err' : ''}${dragIndex === i ? ' is-dragging' : ''}${overIndex === i && dragIndex !== i ? ' is-over' : ''}`}
                  draggable={!disabled}
                  onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                  onDragOver={(e) => { if (dragIndex != null) { e.preventDefault(); setOverIndex(i); } }}
                  onDrop={(e) => { if (dragIndex != null) { e.preventDefault(); e.stopPropagation(); move(dragIndex, i); } setDragIndex(null); setOverIndex(null); }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                >
                  <span className="mdp-grip" aria-hidden="true"><Icon name="grid" size={14} /></span>
                  <span className="mdp-n">{i + 1}</span>
                  <span className="mdp-file">
                    <b>{it.file.name}</b>
                    <small>{formatMb(it.file.size)}{extOf(it.file.name) === '.pdf' ? ' · images kept' : ' · text only'}</small>
                    {err ? <em role="alert">{err}</em> : null}
                  </span>
                  <span className="mdp-role">
                    <QuirriSelect
                      ariaLabel={`Role of ${it.file.name}`}
                      value={it.role}
                      options={ROLE_OPTIONS}
                      onChange={(e) => setRole(i, e.target.value)}
                      disabled={disabled}
                    />
                  </span>
                  <span className="mdp-actions">
                    <button type="button" className="un-icon-btn" aria-label={`Move ${it.file.name} up`} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}>
                      <Icon name="chev" size={14} />
                    </button>
                    <button type="button" className="un-icon-btn mdp-down" aria-label={`Move ${it.file.name} down`} disabled={disabled || i === items.length - 1} onClick={() => move(i, i + 1)}>
                      <Icon name="chev" size={14} />
                    </button>
                    <button type="button" className="un-icon-btn is-danger" aria-label={`Remove ${it.file.name}`} disabled={disabled} onClick={() => removeAt(i)}>
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      {summary && items.length ? <p className="mdp-summary" role="alert">{summary}</p> : null}

      <ul className="mdp-rules">
        <li><b>Order matters.</b> Lesson files are combined in the order shown.</li>
        <li><b>PDFs keep their diagrams</b> for the slides; DOCX, PPTX and TXT add text only.</li>
        <li><b>Tamil DOCX/TXT</b> can be uploaded alone or with other DOCX/TXT files, but not together with a PDF.</li>
        <li><b>Question bank</b> files are not taught as lessons — they highlight frequently asked topics.</li>
      </ul>
    </div>
  );
}
