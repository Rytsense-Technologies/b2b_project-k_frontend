'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import RoleMismatchDialog from '@/components/student/RoleMismatchDialog';
import InterviewNav from '@/components/student/interviews/InterviewNav';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import {
  QuirriFormGrid,
  QuirriRHFField,
} from '@/components/superadmin/quirri-ui';
import { Icon, SectionState } from '@/components/student/ui';
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

  const {
    data: resumesData,
    loading: resumesLoading,
    error: resumesError,
    reload: reloadResumes,
  } = useAsyncResource(() => interviewProfileApi.listResumes({ includeFailed: false }), []);

  // Recent reports for the side panel (full list lives on /student/interviews/reports).
  const {
    data: reportsData,
    loading: reportsLoading,
    error: reportsError,
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

  // Old links (/student/interviews?session=…) and the live room hand-off open the
  // full report page now instead of a modal.
  useEffect(() => {
    const sid = searchParams?.get('session') || searchParams?.get('report');
    if (sid) {
      router.replace(`/student/interviews/report?session=${encodeURIComponent(sid)}`);
    }
  }, [searchParams, router]);

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

  const scoreCls = (score) => {
    const n = Number(score);
    if (score == null || !Number.isFinite(n)) return '';
    if (n >= 80) return ' sp-score--good';
    if (n < 65) return ' sp-score--low';
    return '';
  };

  const recent = reportItems.slice(0, 3);
  const modeMeta = INTERVIEW_MODES.find((m) => m.id === mode);

  return (
    <div className="animate-fade-in si-page sp">
      <InterviewNav active="practice" reportCount={kpi ? (kpi.total_reports ?? reportItems.length) : null}>
        <span className="sp-pill sp-pill--glass">
          <Icon name="doc" size={14} />
          {currentResume ? 'Resume ready' : 'Resume needed'}
        </span>
        {kpi?.avg_score != null ? (
          <span className="sp-pill sp-pill--glass">
            <Icon name="trend" size={14} /> Average {Math.round(Number(kpi.avg_score))}
          </span>
        ) : null}
        {kpi?.highest_score != null ? (
          <span className="sp-pill sp-pill--glass">Best {Math.round(Number(kpi.highest_score))}</span>
        ) : null}
      </InterviewNav>

      <div className="iv-layout">
        <div className="sp">
          {/* ---------- Step 1: resume ---------- */}
          <section className="sp-panel iv-step">
            <div className="sp-panel-h">
              <div className="iv-step-h">
                <span className={`iv-step-n${currentResume ? ' is-done' : ''}`}>
                  {currentResume ? <Icon name="tick" size={16} /> : '1'}
                </span>
                <div>
                  <h3>Your resume</h3>
                  <p>The interviewer asks questions based on your current resume.</p>
                </div>
              </div>
              {currentResume ? <span className="sp-pill sp-pill--good">Ready</span> : null}
            </div>
            <div className="sp-panel-b sp">
              {resumesError ? (
                <SectionState tone="err" title="Could not load resumes">
                  {apiErrorMessage(resumesError, 'Please try again.')}
                </SectionState>
              ) : null}

              {resumesLoading && !resumes.length ? (
                <SectionState title="Loading resumes">Checking your uploaded files…</SectionState>
              ) : null}

              {!resumesLoading && !resumesError && !resumes.length ? (
                <SectionState title="No resume yet">Upload a resume to start a mock or full interview.</SectionState>
              ) : null}

              {resumes.length ? (
                <ul className="sp-resume-list">
                  {resumes.map((r) => (
                    <li key={r.id} className={`sp-resume${r.is_current ? ' is-current' : ''}`}>
                      <span className="sp-resume-ic"><Icon name="doc" size={18} /></span>
                      <div className="sp-row-main">
                        <b>{r.filename || 'Resume'}</b>
                        <div className="sp-row-meta">
                          {r.parse_status === 'ready' ? 'Ready' : r.parse_status === 'failed' ? 'Parse failed' : 'Not parsed yet'}
                          {r.file_size_kb != null ? ` · ${r.file_size_kb} KB` : ''}
                        </div>
                      </div>
                      {!r.is_current ? (
                        <button type="button" className="sp-link" onClick={() => setCurrent(r.id)}>
                          Use this
                        </button>
                      ) : (
                        <span className="sp-pill sp-pill--teal">Current</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}

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
              <button
                type="button"
                className="sp-drop"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={18} />
                {uploading ? 'Uploading…' : resumes.length ? 'Upload a new resume · PDF, DOC or DOCX up to 10 MB' : 'Upload resume · PDF, DOC or DOCX up to 10 MB'}
              </button>
            </div>
          </section>

          {/* ---------- Steps 2 + 3: mode and role ---------- */}
          <form
            id="start"
            className="sp-panel iv-step"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="sp-panel-h">
              <div className="iv-step-h">
                <span className="iv-step-n">2</span>
                <div>
                  <h3>Choose your interview</h3>
                  <p>Pick a mode, then tell us the role you are preparing for.</p>
                </div>
              </div>
            </div>
            <div className="sp-panel-b sp">
              <div className="sp-mode-grid" role="radiogroup" aria-label="Interview mode">
                {INTERVIEW_MODES.map((m) => {
                  const selected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className="sp-mode"
                      onClick={() => setValue('mode', m.id, { shouldValidate: true })}
                    >
                      <span className="sp-mode-top">
                        <span className="iv-mode-ic"><Icon name={m.id === 'full' ? 'layers' : 'mic'} size={18} /></span>
                        <b>{m.title}</b>
                        <span className="sp-mode-radio" aria-hidden="true" />
                      </span>
                      <p>{m.description}</p>
                      <small>{m.duration}</small>
                    </button>
                  );
                })}
              </div>
              {errors.mode ? (
                <div className="hint field-error" role="alert">
                  {errors.mode.message}
                </div>
              ) : null}

              <div className="iv-divider"><span>Role details</span></div>

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
            </div>

            <div className="iv-start-bar">
              <div className="iv-start-sum">
                <b>{modeMeta?.title || 'Interview'}</b>
                <span>{modeMeta?.duration || ''}</span>
              </div>
              {!currentResume ? <span className="sp-note">Upload a resume first to start.</span> : null}
              <button
                type="submit"
                className="sd-btn sd-btn--amber si-start-btn"
                disabled={starting || !currentResume}
              >
                <Icon name="playFill" size={16} />
                {starting ? 'Starting…' : 'Start interview'}
              </button>
            </div>
          </form>
        </div>

        {/* ---------- Aside: tips + recent reports ---------- */}
        <aside className="sp">
          <section className="sd-focus iv-tips" aria-labelledby="iv-tips-h">
            <div className="sd-focus-h">
              <span className="sd-focus-ic"><Icon name="spark" size={18} /></span>
              <h3 id="iv-tips-h">Before you start</h3>
            </div>
            <ul>
              <li>Find a quiet room and allow microphone access when asked.</li>
              <li>Wait for the interviewer to greet you before you speak.</li>
              <li>Answer in full sentences — pause briefly when you finish.</li>
              <li>Use real examples from your resume and projects.</li>
            </ul>
          </section>

          <section className="sp-panel">
            <div className="sp-panel-h">
              <div>
                <h3>Recent reports</h3>
                <p>Your latest scored interviews</p>
              </div>
              <Link className="sd-chip" href="/student/interviews/reports">
                View all <Icon name="chev" size={14} />
              </Link>
            </div>
            {reportsError ? (
              <div className="sp-panel-b">
                <SectionState tone="err" title="Could not load reports">
                  {apiErrorMessage(reportsError, 'Please try again.')}
                </SectionState>
              </div>
            ) : null}
            {reportsLoading && !reportItems.length ? (
              <div className="sp-panel-b"><SectionState title="Loading reports…" /></div>
            ) : null}
            {!reportsLoading && !reportsError && !reportItems.length ? (
              <div className="sp-panel-b">
                <SectionState title="No reports yet">Your first scored interview appears here.</SectionState>
              </div>
            ) : null}
            {recent.length ? (
              <ul className="sp-rows">
                {recent.map((item) => (
                  <li key={item.session_id}>
                    <Link
                      className="sp-row iv-row-link"
                      href={`/student/interviews/report?session=${encodeURIComponent(item.session_id)}`}
                    >
                      <span className="sp-row-ic"><Icon name={item.interview_type === 'full' ? 'layers' : 'mic'} size={18} /></span>
                      <div className="sp-row-main">
                        <b>{item.title || 'Interview'}</b>
                        <div className="sp-row-meta">
                          {item.interview_type === 'full' ? 'Full' : 'Mock'} · {formatDate(item.completed_date)}
                        </div>
                      </div>
                      <span className={`sp-score${scoreCls(item.score)}`}>
                        {item.score != null ? Math.round(Number(item.score)) : '—'}
                        <small>/100</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </aside>
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

    </div>
  );
}
