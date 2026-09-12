'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import {
  QuirriSelect,
  QuirriField,
  QuirriControlledField,
} from '@/components/superadmin/quirri-ui';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  eduVideoApi,
  JOB_STATUS,
  SUPPORTED_EXTENSIONS,
} from '@/lib/api/admin/eduVideo';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { FIELD_RULES } from '@/lib/validation';

const POLL_INTERVAL_MS = 4000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const STORAGE_PREFIX = 'eduVideoJobs:';

function storageKey(tenantId) {
  return `${STORAGE_PREFIX}${tenantId || 'unknown'}`;
}

function readJobRegistry(tenantId) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobRegistry(tenantId, jobs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(tenantId), JSON.stringify(jobs));
  } catch {
    /* quota / private mode — table still works for this session */
  }
}

/** Merge job lists by jobId (newer createdAt / richer lastStatus wins). */
function mergeJobLists(...lists) {
  const map = new Map();
  lists.flat().forEach((job) => {
    if (!job?.jobId) return;
    const id = String(job.jobId);
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { ...job, jobId: id });
      return;
    }
    const prevTime = Date.parse(prev.createdAt || '') || 0;
    const nextTime = Date.parse(job.createdAt || '') || 0;
    const richer = {
      ...prev,
      ...job,
      jobId: id,
      lastStatus: job.lastStatus?.status ? job.lastStatus : (prev.lastStatus || null),
      createdAt: nextTime >= prevTime ? (job.createdAt || prev.createdAt) : prev.createdAt,
    };
    map.set(id, richer);
  });
  return Array.from(map.values()).sort(
    (a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0),
  );
}

/**
 * Load jobs for this college, migrating any rows saved under "unknown"
 * (tenantId not ready yet) or other eduVideoJobs:* keys in this browser.
 */
function loadAndMigrateJobRegistry(tenantId) {
  if (typeof window === 'undefined') return [];
  const primary = readJobRegistry(tenantId);
  const orphans = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      if (key === storageKey(tenantId)) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) orphans.push(...parsed);
      } catch {
        /* skip bad keys */
      }
    }
  } catch {
    /* ignore */
  }
  const merged = mergeJobLists(primary, orphans);
  if (tenantId && merged.length) {
    writeJobRegistry(tenantId, merged);
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && key !== storageKey(tenantId)) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return merged;
}

function fileExtension(name = '') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function validateFile(file) {
  if (!file) return 'Choose a source file to upload.';
  const ext = fileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type '${ext || '(none)'}'. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File must be 50 MB or smaller.';
  }
  return '';
}

/**
 * Map backend job status → UI badge (see CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md §5).
 * DONE without output_path stays “Rendering” until export finishes.
 */
function statusBadge(live) {
  const status = live?.status || '';
  const outputPath = live?.output_path;
  const progress = typeof live?.progress === 'number' ? live.progress : null;
  const error = live?.error || null;

  if (status === JOB_STATUS.FAILED) {
    return { label: 'Failed', variant: 'red', progress: null, error, filterKey: 'failed' };
  }
  if (status === JOB_STATUS.DONE && outputPath) {
    return { label: 'Published', variant: 'green', progress: 100, error: null, filterKey: 'published' };
  }
  if (status === JOB_STATUS.DONE && !outputPath) {
    return { label: 'Rendering', variant: 'blue', progress, error: null, filterKey: 'generating' };
  }
  if (status === JOB_STATUS.RENDERING) {
    return { label: 'Rendering', variant: 'blue', progress, error: null, filterKey: 'generating' };
  }
  if (status === JOB_STATUS.AWAITING_REVIEW) {
    return { label: 'Reviewing', variant: 'amber', progress, error: null, filterKey: 'generating' };
  }
  if (
    status === JOB_STATUS.PENDING
    || status === JOB_STATUS.EXTRACTING
    || status === JOB_STATUS.SCRIPTING
  ) {
    return { label: 'Generating', variant: 'blue', progress, error: null, filterKey: 'generating' };
  }
  if (!status) {
    return { label: 'Queued', variant: 'grey', progress: null, error: null, filterKey: 'generating' };
  }
  return { label: status, variant: 'grey', progress, error: null, filterKey: 'generating' };
}

function isTerminalLive(live) {
  if (!live) return false;
  if (live.status === JOB_STATUS.FAILED) return true;
  if (live.status === JOB_STATUS.DONE && live.output_path) return true;
  return false;
}

export default function ContentPage() {
  const { tenantId } = useAuth();
  const { show, hide, TipLayer } = useQuirriTip();
  const fileInputRef = useRef(null);
  const autoSubmittedRef = useRef(new Set());
  const jobsRef = useRef([]);
  const liveByIdRef = useRef({});

  const [departmentId, setDepartmentId] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterError, setChapterError] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobs, setJobs] = useState([]);
  const [liveById, setLiveById] = useState({});

  jobsRef.current = jobs;
  liveByIdRef.current = liveById;

  const { data: deptData, loading: deptLoading, error: deptError } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({
      page: 1,
      pageSize: 100,
      is_active: true,
    })),
    [tenantId],
  );

  const departments = useMemo(() => asList(deptData, []), [deptData]);
  const departmentOptions = useMemo(
    () => departments.map((d) => ({
      value: String(d.id),
      label: d.name || d.code || String(d.id),
    })),
    [departments],
  );

  useEffect(() => {
    const loaded = loadAndMigrateJobRegistry(tenantId);
    // Keep any in-memory rows if tenantId just resolved (avoid wiping a live upload).
    const merged = mergeJobLists(loaded, jobsRef.current);
    if (tenantId && merged.length) writeJobRegistry(tenantId, merged);
    setJobs(merged);
    const seeded = {};
    merged.forEach((job) => {
      if (job.lastStatus) seeded[job.jobId] = job.lastStatus;
    });
    setLiveById((prev) => ({ ...seeded, ...prev }));
  }, [tenantId]);

  const persistJobs = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    setJobs(list);
    writeJobRegistry(tenantId, list);
  }, [tenantId]);

  const patchJobLive = useCallback((jobId, live) => {
    setLiveById((prev) => ({ ...prev, [jobId]: live }));
    // Persist status without setJobs — avoids restarting the poll effect every tick.
    const next = jobsRef.current.map((j) => (
      j.jobId === jobId ? { ...j, lastStatus: live } : j
    ));
    jobsRef.current = next;
    writeJobRegistry(tenantId, next);
  }, [tenantId]);

  const pickFile = (nextFile) => {
    const err = validateFile(nextFile);
    setFileError(err);
    setFile(err ? null : nextFile);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) pickFile(dropped);
  };

  const validateChapter = (value) => {
    const trimmed = String(value || '').trim();
    const rule = FIELD_RULES.academicLabel;
    if (!trimmed) return 'Enter a chapter title.';
    if (trimmed.length < rule.min) return `Chapter title must be at least ${rule.min} characters.`;
    if (trimmed.length > rule.max) return `Chapter title must be ${rule.max} characters or fewer.`;
    if (!rule.pattern.test(trimmed)) {
      return 'Enter a valid chapter title using letters, numbers, and common punctuation.';
    }
    return '';
  };

  const handleUpload = async () => {
    const dept = departments.find((d) => String(d.id) === String(departmentId));
    if (!departmentId || !dept) {
      toast.error('Select a department.');
      return;
    }
    const titleErr = validateChapter(chapterTitle);
    setChapterError(titleErr);
    if (titleErr) {
      toast.error(titleErr);
      return;
    }
    const fErr = validateFile(file);
    setFileError(fErr);
    if (fErr) {
      toast.error(fErr);
      return;
    }

    setUploading(true);
    try {
      const res = await eduVideoApi.upload({ file, language: 'english' });
      const jobId = res?.job_id;
      if (!jobId) {
        throw new Error('The video API did not return a job id. Try again in a moment.');
      }
      const entry = {
        jobId: String(jobId),
        departmentId: String(dept.id),
        departmentName: dept.name || dept.code || 'Department',
        chapterTitle: chapterTitle.trim(),
        fileName: file.name,
        createdAt: new Date().toISOString(),
        lastStatus: {
          job_id: String(jobId),
          status: res?.status || JOB_STATUS.PENDING,
          error: null,
          output_path: null,
          progress: 0,
        },
      };
      persistJobs([entry, ...jobsRef.current.filter((j) => j.jobId !== entry.jobId)]);
      setLiveById((prev) => ({
        ...prev,
        [entry.jobId]: entry.lastStatus,
      }));
      setFile(null);
      setFileError('');
      setChapterTitle('');
      setChapterError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Upload started. Generation is running in the background.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const removeJob = (jobId) => {
    persistJobs(jobsRef.current.filter((j) => j.jobId !== jobId));
    setLiveById((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    autoSubmittedRef.current.delete(jobId);
  };

  // Poll non-terminal jobs; auto-submit on AWAITING_REVIEW.
  // Also refresh jobs that only have a stale cached status (e.g. after reload).
  useEffect(() => {
    if (!jobs.length) return undefined;

    let cancelled = false;

    const needsPoll = (job) => {
      const live = liveByIdRef.current[job.jobId] || job.lastStatus;
      if (!live) return true;
      return !isTerminalLive(live);
    };

    const tick = async () => {
      const current = jobsRef.current;
      const active = current.filter(needsPoll);
      if (!active.length) return;

      await Promise.all(active.map(async (job) => {
        try {
          const live = await eduVideoApi.getStatus(job.jobId);
          if (cancelled) return;
          patchJobLive(job.jobId, live);

          if (
            live?.status === JOB_STATUS.AWAITING_REVIEW
            && !autoSubmittedRef.current.has(job.jobId)
          ) {
            autoSubmittedRef.current.add(job.jobId);
            try {
              await eduVideoApi.submit(job.jobId);
              if (!cancelled) {
                patchJobLive(job.jobId, {
                  ...live,
                  status: JOB_STATUS.RENDERING,
                });
              }
            } catch (err) {
              // Duplicate submit across tabs → 400; swallow per integration doc §7.
              if (err?.response?.status !== 400) {
                autoSubmittedRef.current.delete(job.jobId);
                toast.error(apiErrorMessage(err, 'Could not confirm the lesson for rendering.'));
              }
            }
          }
        } catch (err) {
          if (cancelled) return;
          if (err?.response?.status === 404) {
            toast.error(apiErrorMessage(err, 'Job not found'));
          }
        }
      }));
    };

    tick();
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobs, patchJobLive]);

  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter((j) => (
      statusBadge(liveById[j.jobId] || j.lastStatus).filterKey === statusFilter
    ));
  }, [jobs, liveById, statusFilter]);

  const canSubmit = Boolean(departmentId && chapterTitle.trim() && file && !uploading);

  return (
    <div className="animate-fade-in">
      <div className="notice info" style={{ marginBottom: 18 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <b>How generation works</b>
          The pipeline drafts a lesson, then this screen confirms it automatically so rendering can start.
          Department and chapter title label your list in this browser only — they are not stored on the video job yet.
        </div>
      </div>

      <div className="cols a" style={{ alignItems: 'start', marginBottom: 18 }}>
        <div className="card card-p">
          <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>New chapter upload</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: 18 }}>
            Choose a department, name the chapter, and upload a document.
          </p>

          {deptError ? (
            <div className="notice err" style={{ marginBottom: 12 }}>
              <div>
                <b>Could not load departments</b>
                {apiErrorMessage(deptError, 'Please try again.')}
              </div>
            </div>
          ) : null}

          <QuirriSelect
            id="content-department"
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder={deptLoading ? 'Loading departments…' : 'Select department'}
            disabled={deptLoading || !departmentOptions.length}
            options={departmentOptions}
          />

          <QuirriControlledField
            label="Chapter title"
            fieldType="academicLabel"
            name="chapter_title"
            id="content-chapter-title"
            value={chapterTitle}
            onChange={(v) => {
              setChapterTitle(v);
              if (chapterError) setChapterError(validateChapter(v));
            }}
            onBlur={() => setChapterError(validateChapter(chapterTitle))}
            error={chapterError}
            placeholder="e.g. Trees & Binary Search Trees"
          />

          <QuirriField
            label="Source material"
            htmlFor="content-source-file"
            error={fileError}
            hint={`Accepted: ${SUPPORTED_EXTENSIONS.join(', ')} · up to 50 MB · English`}
          >
            <div
              className="drop"
              role="button"
              tabIndex={0}
              aria-label="Choose source file"
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              style={{
                outline: dragging ? '2px solid var(--teal-500, #0E5C6B)' : undefined,
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
              <div className="t">
                {file ? file.name : 'Drop a document, or click to browse'}
              </div>
              <div className="s">
                PDF, DOCX, DOC or TXT · up to 50 MB · English
              </div>
              <input
                ref={fileInputRef}
                id="content-source-file"
                type="file"
                accept={SUPPORTED_EXTENSIONS.join(',')}
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>
          </QuirriField>

          <div className="flow" style={{ marginBottom: 16 }}>
            <span className="step">On submit:</span>
            <span>
              The document is uploaded, a lesson is drafted, then rendering starts automatically.
              You can follow progress in Content status.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canSubmit}
            onClick={handleUpload}
            aria-label="Upload and generate"
            onMouseEnter={(e) => {
              if (!canSubmit) {
                show(e, 'Select a department, chapter title, and supported file first', 'top');
              }
            }}
            onMouseLeave={hide}
            onFocus={(e) => {
              if (!canSubmit) {
                show(e, 'Select a department, chapter title, and supported file first', 'top');
              }
            }}
            onBlur={hide}
          >
            {uploading ? 'Uploading…' : 'Upload & generate'}
          </button>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Content status</h3>
            <QuirriSelect
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="All statuses"
              options={[
                { value: 'generating', label: 'Generating' },
                { value: 'published', label: 'Published' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </div>
          <div className="card-sub">
            Jobs from this browser are saved locally and keep updating while generation runs.
            They are not listed from the server yet, so another device will not see them.
          </div>

          {!jobs.length ? (
            <div className="notice info" style={{ margin: 16 }}>
              <div>
                <b>No jobs yet</b>
                Upload a chapter to see generation status here.
              </div>
            </div>
          ) : null}

          <table>
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Department</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!filteredJobs.length ? (
                <tr>
                  <td colSpan={4}>
                    {jobs.length ? 'No jobs match this filter.' : 'No content jobs to show.'}
                  </td>
                </tr>
              ) : null}
              {filteredJobs.map((job) => {
                const live = liveById[job.jobId] || job.lastStatus;
                const badge = statusBadge(live);
                const showDownload = live?.status === JOB_STATUS.DONE && live?.output_path;
                const showRemove = isTerminalLive(live);
                return (
                  <tr key={job.jobId}>
                    <td>
                      <span className="strong">{job.chapterTitle}</span>
                      <div className="sub">{job.fileName}</div>
                    </td>
                    <td>{job.departmentName || '—'}</td>
                    <td>
                      <QuirriBadge variant={badge.variant}>{badge.label}</QuirriBadge>
                      {typeof badge.progress === 'number' && badge.filterKey === 'generating' ? (
                        <div className="sub" style={{ marginTop: 4 }}>
                          {badge.progress}%
                        </div>
                      ) : null}
                      {badge.error ? (
                        <div className="sub" style={{ marginTop: 4, color: 'var(--danger, #b42318)' }}>
                          {badge.error}
                        </div>
                      ) : null}
                    </td>
                    <td className="actions">
                      {showDownload ? (
                        <a
                          href={eduVideoApi.getDownloadUrl(job.jobId)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      ) : null}
                      {showRemove ? (
                        <a
                          role="button"
                          tabIndex={0}
                          onClick={() => removeJob(job.jobId)}
                          onKeyDown={(e) => e.key === 'Enter' && removeJob(job.jobId)}
                        >
                          Remove
                        </a>
                      ) : null}
                      {!showDownload && !showRemove ? (
                        <span className="sub">Working…</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>HOD feedback — needs your action</h3></div>
        <div className="card-sub">When an HOD sends a chapter back, it lands here for fix and regenerate.</div>
        <div className="notice info" style={{ margin: 16 }}>
          <div>
            <b>Empty</b>
            Feedback queue requires content + HOD review APIs.
          </div>
        </div>
      </div>

      <TipLayer />
    </div>
  );
}
