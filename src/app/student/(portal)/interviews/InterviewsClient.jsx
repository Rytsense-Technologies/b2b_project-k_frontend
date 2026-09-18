'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import RoleMismatchDialog from '@/components/student/RoleMismatchDialog';
import InterviewReportModal from '@/components/student/InterviewReportModal';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import {
  QuirriBtn,
  QuirriFormGrid,
  QuirriRHFField,
} from '@/components/superadmin/quirri-ui';
import { interviewProfileApi, resumesFromList } from '@/lib/api/interviewProfile';
import { interviewApi, parseLivekitStartResponse } from '@/lib/api/interview';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import {
  INTERVIEW_MODES,
  DIFFICULTY_OPTIONS,
  EXPERIENCE_OPTIONS,
  buildLivekitStartPayload,
} from '@/lib/constants/interview';
import { persistLivekitSession } from '@/lib/livekitSession';
import { interviewSetupSchema } from '@/lib/validation';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const RESUME_EXT = ['.pdf', '.docx', '.doc'];
const RESUME_MAX_BYTES = 10 * 1024 * 1024;

function fileExt(name = '') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function validateResumeFile(file) {
  if (!file) return 'Choose a resume file to upload.';
  const ext = fileExt(file.name);
  if (!RESUME_EXT.includes(ext)) {
    return `Unsupported type '${ext || '(none)'}'. Use PDF, DOC, or DOCX.`;
  }
  if (file.size > RESUME_MAX_BYTES) return 'Resume must be 10 MB or smaller.';
  return '';
}

function scoreTone(score) {
  if (score == null || !Number.isFinite(Number(score))) return { bg: '#EEF0F0', fg: '#4A5A60' };
  const n = Number(score);
  if (n >= 80) return { bg: '#E6F5EE', fg: '#0B5D43' };
  if (n >= 65) return { bg: '#E8F1F3', fg: '#0E5C6B' };
  return { bg: '#FDF1E2', fg: '#8A560A' };
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentInterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const [reportSession, setReportSession] = useState(null);
  const [reportMeta, setReportMeta] = useState({ type: null, date: null });

  const {
    data: resumesData,
    loading: resumesLoading,
    error: resumesError,
    reload: reloadResumes,
  } = useAsyncResource(() => interviewProfileApi.listResumes({ includeFailed: false }), []);

  const {
    data: reportsData,
    loading: reportsLoading,
    error: reportsError,
    reload: reloadReports,
  } = useAsyncResource(() => reportsApi.getLivekit({ page: 1, page_size: 20 }), []);

  const resumes = useMemo(() => resumesFromList(resumesData), [resumesData]);
  const currentResume = useMemo(
    () => resumes.find((r) => r.is_current) || resumes[0] || null,
    [resumes],
  );
  const reportItems = useMemo(() => asList(reportsData, []), [reportsData]);
  const kpi = reportsData?.kpi || null;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: {
      mode: 'mock',
      position: '',
      difficulty: 'intermediate',
      experience: '0-1',
    },
  });

  const mode = watch('mode');

  useEffect(() => {
    const sid = searchParams?.get('session') || searchParams?.get('report');
    if (sid) {
      setReportSession(sid);
      setReportMeta({ type: null, date: null });
    }
  }, [searchParams]);

  const onUpload = async (file) => {
    const problem = validateResumeFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      await interviewProfileApi.uploadResume(file);
      toast.success('Resume uploaded.');
      await reloadResumes();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload this resume.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setCurrent = async (resumeId) => {
    try {
      await interviewProfileApi.setCurrentResume(resumeId);
      await reloadResumes();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not set this resume as current.'));
    }
  };

  const beginStart = useCallback(async (values, { acknowledgedRoleMismatch = false } = {}) => {
    if (!currentResume?.id) {
      toast.error('Upload a resume before starting an interview.');
      return;
    }
    setStarting(true);
    try {
      if (!acknowledgedRoleMismatch) {
        const prepared = await interviewProfileApi.prepareInterview({
          resumeId: currentResume.id,
          position: values.position,
        });
        const roleMatch = prepared?.role_match || null;
        if (roleMatch && roleMatch.relevant === false) {
          setMismatch({ values, roleMatch });
          setStarting(false);
          return;
        }
      }

      const payload = buildLivekitStartPayload({
        resumeId: currentResume.id,
        role: values.position,
        experience: values.experience,
        mode: values.mode,
        difficulty: values.difficulty,
        acknowledgedRoleMismatch,
      });

      let startData;
      try {
        startData = await interviewApi.startLivekitInterview(payload);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 409 && detail && typeof detail === 'object') {
          setMismatch({
            values,
            roleMatch: {
              relevant: false,
              resume_domain: detail.resume_domain,
              selected_role: detail.selected_role || values.position,
              suggested_role: detail.suggested_role,
              suggested_role_source: detail.suggested_role_source,
            },
          });
          setStarting(false);
          return;
        }
        throw err;
      }

      const session = parseLivekitStartResponse(startData);
      if (!session) {
        toast.error('Interview started but room credentials were incomplete.');
        setStarting(false);
        return;
      }
      persistLivekitSession(session);
      setMismatch(null);
      router.push('/student/interviews/live');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start the interview.'));
      setStarting(false);
    }
  }, [currentResume, router]);

  const onSubmit = (values) => beginStart(values, { acknowledgedRoleMismatch: false });

  const openReport = (item) => {
    setReportSession(item.session_id);
    setReportMeta({
      type: item.interview_type,
      date: item.completed_date,
    });
  };

  return (
    <div className="animate-fade-in si-page">
      <div className="section-head">
        <div>
          <div className="t">Interviews</div>
          <div className="d">Practice with an AI interviewer using your semester allocation.</div>
        </div>
      </div>

      <div className="si-mode-info">
        <div className="card si-info-card">
          <div className="si-info-h">
            <div className="si-info-title">Mock interviews</div>
            <span className="si-badge teal">3–5 min each</span>
          </div>
          <p className="si-info-body">Short voice practice with quick feedback. Good for daily reps.</p>
        </div>
        <div className="card si-info-card">
          <div className="si-info-h">
            <div className="si-info-title">Full interviews</div>
            <span className="si-badge muted">10–15 min each</span>
          </div>
          <p className="si-info-body">Longer session with a detailed feedback report when scoring finishes.</p>
        </div>
        {kpi ? (
          <div className="card si-info-card">
            <div className="si-info-h">
              <div className="si-info-title">Your reports</div>
            </div>
            <div className="si-kpi-row">
              <div>
                <div className="si-kpi-num">{kpi.total_reports ?? 0}</div>
                <div className="si-kpi-label">Completed</div>
              </div>
              <div>
                <div className="si-kpi-num">
                  {kpi.avg_score != null ? Math.round(Number(kpi.avg_score)) : '—'}
                </div>
                <div className="si-kpi-label">Avg score</div>
              </div>
              <div>
                <div className="si-kpi-num">
                  {kpi.highest_score != null ? Math.round(Number(kpi.highest_score)) : '—'}
                </div>
                <div className="si-kpi-label">Best</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 22 }}>
        <h3 className="si-card-title">Your resume</h3>
        <p className="si-card-sub">Upload a PDF or Word resume. The current resume is used when you start.</p>

        {resumesError ? (
          <div className="notice err" style={{ marginBottom: 12 }}>
            <div>
              <b>Could not load resumes</b>
              {apiErrorMessage(resumesError, 'Please try again.')}
            </div>
          </div>
        ) : null}

        {resumesLoading && !resumes.length ? (
          <div className="notice info" style={{ marginBottom: 12 }}>
            <div><b>Loading resumes</b> Checking your uploaded files…</div>
          </div>
        ) : null}

        {!resumesLoading && !resumesError && !resumes.length ? (
          <div className="notice info" style={{ marginBottom: 12 }}>
            <div>
              <b>No resume yet</b>
              Upload a resume to start a mock or full interview.
            </div>
          </div>
        ) : null}

        {resumes.length ? (
          <ul className="si-resume-list">
            {resumes.map((r) => (
              <li key={r.id} className={`si-resume-item${r.is_current ? ' is-current' : ''}`}>
                <div>
                  <div className="si-resume-name">{r.filename || 'Resume'}</div>
                  <div className="si-resume-meta">
                    {r.is_current ? 'Current · ' : ''}
                    {r.parse_status === 'ready' ? 'Ready' : r.parse_status === 'failed' ? 'Parse failed' : 'Not parsed yet'}
                    {r.file_size_kb != null ? ` · ${r.file_size_kb} KB` : ''}
                  </div>
                </div>
                {!r.is_current ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => setCurrent(r.id)}
                  >
                    Use this
                  </button>
                ) : (
                  <span className="si-badge teal">Current</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="si-resume-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            id="si-resume-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <QuirriBtn
            type="button"
            variant="ghost"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload resume'}
          </QuirriBtn>
        </div>
      </div>

      <form
        className="card"
        style={{ marginBottom: 18, padding: 22 }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <h3 className="si-card-title">Start a new interview</h3>
        <p className="si-card-sub">Choose a mode, set your target role, and begin.</p>

        <div className="si-mode-grid" role="radiogroup" aria-label="Interview mode">
          {INTERVIEW_MODES.map((m) => {
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`si-mode-tile${selected ? ' is-selected' : ''}`}
                onClick={() => setValue('mode', m.id, { shouldValidate: true })}
              >
                <div className="si-mode-tile-title">{m.title}</div>
                <div className="si-mode-tile-desc">{m.description}</div>
                <div className="si-mode-tile-dur">{m.duration}</div>
              </button>
            );
          })}
        </div>
        {errors.mode ? (
          <div className="hint field-error" role="alert" style={{ marginBottom: 12 }}>
            {errors.mode.message}
          </div>
        ) : null}

        <QuirriFormGrid>
          <QuirriRHFField
            control={control}
            label="Target role"
            name="position"
            fieldType="academicLabel"
            placeholder="e.g. Frontend Developer"
          />
          <Controller
            name="difficulty"
            control={control}
            render={({ field }) => (
              <QuirriSelect
                label="Difficulty"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={DIFFICULTY_OPTIONS}
                placeholder="Select difficulty"
                error={errors.difficulty?.message}
              />
            )}
          />
          <Controller
            name="experience"
            control={control}
            render={({ field }) => (
              <QuirriSelect
                label="Experience"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={EXPERIENCE_OPTIONS}
                placeholder="Select experience"
                error={errors.experience?.message}
              />
            )}
          />
        </QuirriFormGrid>

        <div style={{ marginTop: 16 }}>
          <QuirriBtn
            type="submit"
            variant="primary"
            disabled={starting || !currentResume}
            className="si-start-btn"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
            {starting ? 'Starting…' : 'Start interview'}
          </QuirriBtn>
        </div>
      </form>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div className="card-h" style={{ padding: '17px 20px 4px' }}>
          <h3>Your interviews</h3>
        </div>

        {reportsError ? (
          <div className="notice err" style={{ margin: 16 }}>
            <div>
              <b>Could not load interviews</b>
              {apiErrorMessage(reportsError, 'Please try again.')}
            </div>
          </div>
        ) : null}

        {reportsLoading && !reportItems.length ? (
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>Loading</b> Fetching your completed interviews…</div>
          </div>
        ) : null}

        {!reportsLoading && !reportsError && !reportItems.length ? (
          <div className="notice info" style={{ margin: 16 }}>
            <div>
              <b>No interviews yet</b>
              Completed mock and full interviews will appear here with their scores.
            </div>
          </div>
        ) : null}

        {reportItems.length ? (
          <table>
            <thead>
              <tr>
                <th>Interview</th>
                <th>Source</th>
                <th>Date</th>
                <th>Score</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {reportItems.map((item) => {
                const tone = scoreTone(item.score);
                const type = item.interview_type === 'mock' ? 'Mock' : item.interview_type === 'full' ? 'Full' : 'Interview';
                return (
                  <tr key={item.session_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                        {item.title || 'Interview'}
                      </div>
                      <span className="si-badge muted">{type}</span>
                    </td>
                    <td style={{ color: 'var(--muted-3)' }}>Self practice</td>
                    <td style={{ color: 'var(--muted-3)' }}>{formatDate(item.completed_date)}</td>
                    <td>
                      <span className="si-score-pill" style={{ background: tone.bg, color: tone.fg }}>
                        {item.score != null ? Math.round(Number(item.score)) : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => openReport(item)}
                      >
                        View report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        <div style={{ padding: '0 20px 16px' }}>
          <QuirriBtn type="button" variant="ghost" onClick={() => reloadReports()}>
            Refresh list
          </QuirriBtn>
        </div>
      </div>

      <RoleMismatchDialog
        open={Boolean(mismatch)}
        roleMatch={mismatch?.roleMatch}
        busy={starting}
        onClose={() => setMismatch(null)}
        onChangeRole={() => {
          const suggested = mismatch?.roleMatch?.suggested_role;
          if (suggested) {
            setValue('position', suggested, { shouldValidate: true });
          }
          setMismatch(null);
        }}
        onContinueAnyway={() => {
          if (!mismatch?.values) return;
          beginStart(mismatch.values, { acknowledgedRoleMismatch: true });
        }}
      />

      <InterviewReportModal
        open={Boolean(reportSession)}
        sessionId={reportSession}
        interviewType={reportMeta.type}
        completedDate={reportMeta.date}
        onClose={() => {
          setReportSession(null);
          setReportMeta({ type: null, date: null });
          if (searchParams?.get('session') || searchParams?.get('report')) {
            router.replace('/student/interviews');
          }
          reloadReports().catch(() => {});
        }}
      />
    </div>
  );
}
