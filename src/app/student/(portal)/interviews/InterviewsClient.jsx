'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import RoleMismatchDialog from '@/components/student/RoleMismatchDialog';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriRHFField } from '@/components/superadmin/quirri-ui';
import { Icon, SectionState } from '@/components/student/ui';
import { interviewProfileApi, resumesFromList } from '@/lib/api/interviewProfile';
import { interviewApi, parseLivekitStartResponse } from '@/lib/api/interview';
import { interviewAssignmentsApi } from '@/lib/api/interviewAssignments';
import { reportsApi } from '@/lib/api/reports';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import {
  DIFFICULTY_HINT,
  DIFFICULTY_OPTIONS,
  STUDENT_EXPERIENCE,
  STUDENT_EXPERIENCE_OPTIONS,
  INTERVIEW_DONTS,
  INTERVIEW_DOS,
  INTERVIEW_LANGUAGE,
  JOB_DESCRIPTION_MAX,
  MODE_META,
  buildLivekitStartPayload,
  experienceLabel,
  guidelinesAcknowledged,
  setSkipDosDontsDialog,
} from '@/lib/constants/interview';
import {
  clearLivekitLifecycle,
  clearLivekitSessionStorage,
  markFreshStart,
  persistLivekitSession,
} from '@/lib/livekitSession';
import { interviewSetupSchema } from '@/lib/validation';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import '@/styles/student-interview.css';

/**
 * Student · Start Interview — three-step setup (owner mock-ups + Interview flow guide, Oct 2026)
 *   1. Role       target role, experience, language, optional job description
 *   2. Mode       guidelines (first interview only) + mock / full
 *   3. Readiness  difficulty, resume confirmation, camera + microphone
 * LiveKit is NOT touched here. Start → interview-prepare → /livekit-interview/start →
 * persist session + fresh-start flag → /student/interviews/live (waiting room).
 */

const RESUME_EXT = ['.pdf', '.docx', '.doc'];
const RESUME_MAX_BYTES = 10 * 1024 * 1024;
const STEPS = [1, 2, 3];

function validateResumeFile(file) {
  if (!file) return 'Choose a resume file to upload.';
  const i = file.name.lastIndexOf('.');
  const ext = i >= 0 ? file.name.slice(i).toLowerCase() : '';
  if (!RESUME_EXT.includes(ext)) return `Unsupported type '${ext || '(none)'}'. Use PDF, DOC, or DOCX.`;
  if (file.size > RESUME_MAX_BYTES) return 'Resume must be 10 MB or smaller.';
  return '';
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resumeSize(r) {
  if (r?.file_size_kb != null) return `${r.file_size_kb} KB`;
  if (r?.file_size != null) return `${Math.round(Number(r.file_size) / 1024)} KB`;
  return '';
}

/** Local permission check only — LiveKit publishes later on the live page. */
function useDeviceCheck() {
  const [state, setState] = useState({ camera: 'idle', mic: 'idle', error: '' });
  const streamRef = useRef(null);
  const previewRef = useRef(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  const request = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setState({ camera: 'blocked', mic: 'blocked', error: 'This browser cannot access a camera or microphone.' });
      return false;
    }
    setState((s) => ({ ...s, camera: 'checking', mic: 'checking', error: '' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stop();
      streamRef.current = stream;
      if (previewRef.current) previewRef.current.srcObject = stream;
      setState({ camera: 'on', mic: 'on', error: '' });
      return true;
    } catch (err) {
      const name = err?.name || '';
      const msg = name === 'NotAllowedError'
        ? 'Permission was blocked. Allow camera and microphone in your browser’s site settings, then try again.'
        : name === 'NotFoundError'
          ? 'No camera or microphone was found. Connect one and try again.'
          : 'Could not access your camera or microphone. Close other apps using them and try again.';
      setState({ camera: 'blocked', mic: 'blocked', error: msg });
      return false;
    }
  }, [stop]);

  useEffect(() => {
    if (previewRef.current && streamRef.current) previewRef.current.srcObject = streamRef.current;
  });
  useEffect(() => stop, [stop]);

  return { ...state, ready: state.camera === 'on' && state.mic === 'on', request, stop, previewRef };
}

export default function StudentInterviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);
  const startLock = useRef(false);

  const [step, setStep] = useState(1);
  const [jobDescription, setJobDescription] = useState('');
  const [guidelinesSeen, setGuidelinesSeen] = useState(true);
  const [guidelinesAck, setGuidelinesAck] = useState(false);
  const [resumeId, setResumeId] = useState(null);
  const [resumeConfirmed, setResumeConfirmed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerChoice, setPickerChoice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const devices = useDeviceCheck();

  const { data: resumesData, loading: resumesLoading, error: resumesError, reload: reloadResumes } = useAsyncResource(
    () => interviewProfileApi.listResumes({ includeFailed: false }), [],
  );
  const { data: reportsData } = useAsyncResource(() => reportsApi.getLivekit({ page: 1, page_size: 50 }), []);
  const { data: assignmentsData } = useAsyncResource(() => interviewAssignmentsApi.list(), []);
  const { data: eligibility } = useAsyncResource(() => interviewApi.eligibility(), []);
  const locked = eligibility ? eligibility.eligible === false : false;

  const resumes = useMemo(() => resumesFromList(resumesData), [resumesData]);
  const reports = useMemo(() => asList(reportsData, []), [reportsData]);
  const openAssignments = useMemo(() => asList(assignmentsData, []).filter((a) => a.status !== 'closed'), [assignmentsData]);
  const selectedResume = resumes.find((r) => r.id === resumeId) || null;
  const reportTotal = reportsData?.kpi?.total_reports ?? reports.length;

  /* First interview only: show the do's & don'ts (owner rule). */
  useEffect(() => {
    const ack = guidelinesAcknowledged();
    setGuidelinesSeen(ack);
  }, []);
  useEffect(() => {
    if (reportsData && reportTotal > 0) setGuidelinesSeen(true);
  }, [reportsData, reportTotal]);

  /* Old links (/student/interviews?session=…) open the report page. */
  useEffect(() => {
    const sid = searchParams?.get('session') || searchParams?.get('report');
    if (sid) router.replace(`/student/reports/view?session=${encodeURIComponent(sid)}`);
  }, [searchParams, router]);

  const { control, watch, setValue, trigger, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: { mode: 'mock', position: '', difficulty: 'intermediate', experience: STUDENT_EXPERIENCE },
    mode: 'onTouched',
  });
  const values = watch();
  const mode = values.mode === 'full' ? 'full' : 'mock';
  const meta = MODE_META[mode];
  const showGuidelines = !guidelinesSeen;

  const step1Done = Boolean(values.position?.trim().length >= 2 && values.experience);
  const step2Done = step1Done && Boolean(values.mode) && (!showGuidelines || guidelinesAck);
  const step3Done = step2Done && Boolean(selectedResume) && resumeConfirmed && devices.ready && Boolean(values.difficulty);
  const doneCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const startHint = !step1Done || !step2Done
    ? 'Complete all 3 steps to start'
    : !selectedResume || !resumeConfirmed
      ? 'Select and confirm your resume to start'
      : !devices.ready
        ? 'Enable camera & microphone to start'
        : 'Everything is ready';

  const completedOf = (m) => reports.filter((r) => (String(r.interview_type).toLowerCase() === 'full' ? 'full' : 'mock') === m).length;
  const assignedOf = (m) => openAssignments.filter((a) => (a.mode === 'full' ? 'full' : 'mock') === m).length;

  const goNext = async () => {
    if (step === 1) {
      const ok = await trigger(['position', 'experience']);
      if (!ok) return;
      if (jobDescription.length > JOB_DESCRIPTION_MAX) return;
      setStep(2);
    } else if (step === 2) {
      if (showGuidelines && !guidelinesAck) {
        toast.error('Confirm you’ve read the interview guidelines to continue.');
        return;
      }
      setStep(3);
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------------- resume ---------------- */
  const openPicker = () => {
    setPickerChoice(resumeId || resumes.find((r) => r.is_current)?.id || null);
    setPickerOpen(true);
  };
  const confirmPicker = async () => {
    if (!pickerChoice) return;
    const chosen = resumes.find((r) => r.id === pickerChoice);
    if (chosen && !chosen.is_current) {
      try { await interviewProfileApi.setCurrentResume(chosen.id); await reloadResumes(); } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not select this resume.'));
        return;
      }
    }
    setResumeId(pickerChoice);
    setResumeConfirmed(false);
    setPickerOpen(false);
  };
  const onUpload = async (file) => {
    const problem = validateResumeFile(file);
    if (problem) { toast.error(problem); return; }
    setUploading(true);
    try {
      const uploaded = await interviewProfileApi.uploadResume(file);
      toast.success('Resume uploaded.');
      const fresh = resumesFromList(await reloadResumes());
      const id = uploaded?.id || uploaded?.resume_id || fresh.find((r) => r.is_current)?.id || fresh[0]?.id || null;
      if (id) { setResumeId(id); setResumeConfirmed(false); }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload this resume.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ---------------- start (guide: re-check devices → clear old session → prepare → start) ---------------- */
  const beginStart = useCallback(async ({ acknowledgedRoleMismatch = false } = {}) => {
    if (startLock.current) return;
    const v = getValues();
    if (!selectedResume?.id) { toast.error('Select your resume first.'); return; }
    startLock.current = true;
    setStarting(true);
    const release = () => { startLock.current = false; setStarting(false); };
    try {
      const ok = await devices.request();
      if (!ok) { toast.error('Allow camera and microphone to start.'); release(); return; }
      devices.stop();
      clearLivekitSessionStorage();
      clearLivekitLifecycle();

      if (!acknowledgedRoleMismatch) {
        const prepared = await interviewProfileApi.prepareInterview({ resumeId: selectedResume.id, position: v.position });
        if (prepared?.role_match && prepared.role_match.relevant === false) {
          setMismatch({ roleMatch: prepared.role_match });
          release();
          return;
        }
      }

      let startData;
      try {
        startData = await interviewApi.startLivekitInterview(buildLivekitStartPayload({
          resumeId: selectedResume.id,
          role: v.position,
          experience: v.experience,
          mode: v.mode,
          difficulty: v.difficulty,
          jobDescription,
          acknowledgedRoleMismatch,
        }));
      } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        if (status === 409 && detail && typeof detail === 'object') {
          setMismatch({
            roleMatch: {
              relevant: false,
              resume_domain: detail.resume_domain,
              selected_role: detail.selected_role || v.position,
              suggested_role: detail.suggested_role,
              suggested_role_source: detail.suggested_role_source,
            },
          });
          release();
          return;
        }
        if (status === 409) { toast('Your interview is already starting…'); return; }
        if (status === 403) { toast.error(apiErrorMessage(err, 'AI interviews are for final-year students.')); release(); return; }
        if (status === 402) { toast.error('You have no interviews of this type left this semester. Ask your college admin.'); release(); return; }
        if (status === 429) { toast.error('Too many attempts. Wait a minute and try again.'); release(); return; }
        if (status === 422) { toast.error('Some interview details are invalid. Check the steps and try again.'); release(); return; }
        throw err;
      }

      const session = parseLivekitStartResponse(startData);
      if (!session) { toast.error('The interview started but the room details were incomplete. Try again.'); release(); return; }
      persistLivekitSession({
        ...session,
        setup: { position: v.position, experience: v.experience, difficulty: v.difficulty, mode: v.mode },
      });
      markFreshStart(session.sessionId);
      if (showGuidelines && guidelinesAck) setSkipDosDontsDialog(true);
      setMismatch(null);
      router.push('/student/interviews/live');
      /* keep the lock: navigation is in progress */
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start the interview.'));
      release();
    }
  }, [devices, getValues, guidelinesAck, jobDescription, router, selectedResume, showGuidelines]);

  /* ====================================================== render */
  return (
    <div className="siv animate-fade-in">
      {openAssignments.length ? (
        <section className="siv-assigned" aria-label="Assigned interviews">
          <Icon name="clip" size={18} />
          <span>
            <b>Assigned by your department:</b> {openAssignments[0].title || 'Interview'} · {openAssignments[0].mode === 'full' ? 'Full' : 'Mock'} interview
            {openAssignments.length > 1 ? ` (+${openAssignments.length - 1} more)` : ''}
          </span>
          <button
            type="button"
            className="siv-linkbtn"
            onClick={() => { setValue('mode', openAssignments[0].mode === 'full' ? 'full' : 'mock', { shouldValidate: true }); toast.success('Mode set from your assignment.'); }}
          >
            Use this mode
          </button>
        </section>
      ) : null}

      {locked ? (
        <section className="siv-card siv-locked" aria-label="Interviews locked">
          <span className="siv-locked-ic" aria-hidden="true"><Icon name="lock" size={28} /></span>
          <h2>AI interviews open in your final year</h2>
          <p>{eligibility?.reason}</p>
          <p className="siv-locked-sub">
            Your faculty can still assign you a practice interview — it will appear here and you will get an email.
          </p>
          <div className="siv-locked-actions">
            <a className="siv-btn siv-btn--soft" href="/student/reports">See past interview reports</a>
            <a className="siv-btn siv-btn--soft" href="/student/subjects">Go to my subjects</a>
          </div>
        </section>
      ) : (
      <div className="siv-grid">
        {/* ------------------------------------------------ wizard */}
        <section className="siv-card siv-wizard" aria-label="Interview setup">
          <div className="siv-wizard-top">
            <ol className="siv-steps" aria-label={`Step ${step} of 3`}>
              {STEPS.map((n, i) => {
                const done = n < step || (n === 3 && step3Done);
                const state = n === step ? 'current' : done ? 'done' : 'todo';
                return (
                  <li key={n} className={`siv-step is-${state}`} aria-current={n === step ? 'step' : undefined}>
                    <span className="siv-step-n">{n}</span>
                    {i < STEPS.length - 1 ? (
                      <span className="siv-step-line" aria-hidden="true"><i style={{ width: n < step ? '100%' : n === step ? '40%' : '0%' }} /></span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <Link className="siv-linkbtn" href="/student/reports">
              My reports{reportTotal ? ` (${reportTotal})` : ''} <Icon name="chev" size={14} />
            </Link>
          </div>
          {step !== 2 ? <p className="siv-required">Fields marked with <span>*</span> are required.</p> : null}

          {/* ------------------------- step 1 */}
          {step === 1 ? (
            <div className="siv-body">
              <QuirriRHFField
                control={control}
                name="position"
                fieldType="academicLabel"
                label={<>Target Role<span className="siv-req">*</span></>}
                placeholder="e.g. Frontend Developer"
              />
              <div className="siv-two">
                <Controller
                  name="experience"
                  control={control}
                  render={({ field }) => (
                    <QuirriSelect
                      label={<>Experience Level<span className="siv-req">*</span></>}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={STUDENT_EXPERIENCE_OPTIONS}
                      hint="Students interview as freshers."
                      error={errors.experience?.message}
                    />
                  )}
                />
                <div className="field">
                  <label htmlFor="siv-lang">Interview Language</label>
                  <input id="siv-lang" value={INTERVIEW_LANGUAGE} readOnly aria-describedby="siv-lang-hint" className="siv-readonly" />
                  <div id="siv-lang-hint" className="hint">English is used for all interviews.</div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="siv-jd" className="siv-label-row">
                  Job Description (Optional)
                </label>
                <div className="siv-textarea">
                  <textarea
                    id="siv-jd"
                    value={jobDescription}
                    maxLength={JOB_DESCRIPTION_MAX}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description or key skills to tailor your interview questions."
                    rows={5}
                    aria-describedby="siv-jd-hint"
                  />
                  <span className="siv-count" aria-live="polite">{jobDescription.length} / {JOB_DESCRIPTION_MAX}</span>
                </div>
                <div id="siv-jd-hint" className="hint">The more details you add, the more targeted your interview will be.</div>
              </div>
            </div>
          ) : null}

          {/* ------------------------- step 2 */}
          {step === 2 ? (
            <div className="siv-body">
              {showGuidelines ? (
                <section className="siv-guides" aria-labelledby="siv-g-h">
                  <h3 id="siv-g-h">Interview guidelines<span className="siv-req">*</span></h3>
                  <p>Quick tips for a smooth session. Confirm at the bottom to continue.</p>
                  <div className="siv-guides-grid">
                    <div>
                      <b className="is-do"><Icon name="check" size={16} /> Do’s</b>
                      <ul>{INTERVIEW_DOS.map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                    <div>
                      <b className="is-dont"><Icon name="x" size={16} /> Don’ts</b>
                      <ul>{INTERVIEW_DONTS.map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                  </div>
                </section>
              ) : null}

              <div>
                <h3 className="siv-h3">Choose Interview Mode</h3>
                <p className="siv-sub">Select the mode that best fits your preparation needs.</p>
              </div>
              <div className="siv-modes" role="radiogroup" aria-label="Interview mode">
                {['mock', 'full'].map((m) => {
                  const on = mode === m;
                  const mm = MODE_META[m];
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`siv-mode${on ? ' is-on' : ''}`}
                      onClick={() => setValue('mode', m, { shouldValidate: true })}
                    >
                      <span className="siv-mode-top">
                        <span className="siv-mode-ic" aria-hidden="true"><Icon name={m === 'full' ? 'layers' : 'spark'} size={22} /></span>
                        <span className="siv-radio" aria-hidden="true" />
                      </span>
                      <b>{mm.label}</b>
                      <span className="siv-mode-blurb">{mm.blurb}</span>
                      <span className="siv-mode-meta">
                        <span><Icon name="clock" size={16} /> Estimated duration: {mm.duration}</span>
                        <span><Icon name="check" size={16} /> Completed so far: {completedOf(m)}</span>
                        <span><Icon name="clip" size={16} /> Assigned to you: {assignedOf(m)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {showGuidelines ? (
                <label className="siv-check">
                  <input type="checkbox" checked={guidelinesAck} onChange={(e) => setGuidelinesAck(e.target.checked)} />
                  <span>I’ve read these guidelines. Don’t show this again.<span className="siv-req">*</span></span>
                </label>
              ) : null}
            </div>
          ) : null}

          {/* ------------------------- step 3 */}
          {step === 3 ? (
            <div className="siv-body">
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <div>
                    <h3 className="siv-h3">Difficulty level</h3>
                    <p className="siv-sub">Choose the difficulty level that matches your preparation needs.</p>
                    <QuirriSelect
                      ariaLabel="Difficulty level"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={DIFFICULTY_OPTIONS}
                      hint={DIFFICULTY_HINT[field.value]}
                      error={errors.difficulty?.message}
                    />
                  </div>
                )}
              />

              <section aria-labelledby="siv-res-h">
                <h3 className="siv-h3" id="siv-res-h">Resume Disclaimer<span className="siv-req">*</span></h3>
                <div className="siv-resume">
                  <b>Please confirm your profile resume is updated</b>
                  <p>Select the resume you want to use for this interview. If you need to make changes, upload an updated resume below before continuing. Your resume is prepared (parsed) when you start.</p>
                  {resumesError ? <SectionState tone="err" title="Could not load your resumes">{apiErrorMessage(resumesError, 'Please try again.')}</SectionState> : null}
                  {selectedResume ? (
                    <div className="siv-resume-file">
                      <span className="siv-file-ic" aria-hidden="true"><Icon name="doc" size={18} /></span>
                      <span><b>{selectedResume.filename || 'Resume'}</b><small>{[resumeSize(selectedResume), shortDate(selectedResume.uploaded_at || selectedResume.created_at)].filter(Boolean).join(' · ')}</small></span>
                      <span className="siv-tag is-good">Selected</span>
                    </div>
                  ) : null}
                  <div className="siv-resume-actions">
                    <button type="button" className="siv-btn siv-btn--soft" onClick={openPicker} disabled={resumesLoading || !resumes.length}>
                      {selectedResume ? 'Change resume' : 'Select resume'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      id="siv-resume-file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
                    />
                    <button type="button" className="siv-btn siv-btn--teal" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Icon name="upload" size={16} /> {uploading ? 'Uploading…' : 'Upload updated resume'}
                    </button>
                    <span className="siv-muted">Supported: PDF, DOC, DOCX · max 10 MB</span>
                  </div>
                  {!resumesLoading && !resumes.length && !resumesError ? <p className="siv-warn">You haven’t uploaded a resume yet. Upload one to continue.</p> : null}
                </div>
                <label className={`siv-check${selectedResume ? '' : ' is-disabled'}`}>
                  <input type="checkbox" disabled={!selectedResume} checked={resumeConfirmed} onChange={(e) => setResumeConfirmed(e.target.checked)} />
                  <span>I confirm that my resume is up to date and I’m ready to continue.<span className="siv-req">*</span></span>
                </label>
              </section>

              <section className="siv-devices" aria-labelledby="siv-dev-h">
                <h3 className="siv-h3" id="siv-dev-h">Camera &amp; microphone<span className="siv-req">*</span></h3>
                <p className="siv-sub">Allow both before you start. The interview cannot begin without them.</p>
                <div className="siv-dev-grid">
                  {[
                    { k: 'camera', label: 'Camera', icon: 'video' },
                    { k: 'mic', label: 'Microphone', icon: 'mic' },
                  ].map((d) => {
                    const st = devices[d.k];
                    const on = st === 'on';
                    return (
                      <div key={d.k} className={`siv-dev ${on ? 'is-on' : 'is-off'}`}>
                        <span className="siv-dev-ic" aria-hidden="true"><Icon name={d.icon} size={20} /></span>
                        <span>{d.label} <b>{on ? 'Enabled' : st === 'checking' ? 'Checking…' : 'Not enabled'}</b></span>
                      </div>
                    );
                  })}
                </div>
                {devices.ready ? (
                  <div className="siv-preview">
                    <video ref={devices.previewRef} autoPlay muted playsInline aria-label="Camera preview" />
                    <span><Icon name="check" size={16} /> Camera and microphone are ready.</span>
                  </div>
                ) : (
                  <>
                    {devices.error ? <p className="siv-warn" role="alert">{devices.error}</p> : null}
                    <button type="button" className="siv-btn siv-btn--danger" onClick={devices.request} disabled={devices.camera === 'checking'}>
                      {devices.camera === 'checking' ? 'Waiting for permission…' : 'Enable camera & microphone'}
                    </button>
                  </>
                )}
              </section>
            </div>
          ) : null}

          <div className="siv-foot">
            {step > 1 ? (
              <button type="button" className="siv-btn siv-btn--soft" onClick={() => setStep((s) => s - 1)} disabled={starting}>
                <Icon name="back" size={16} /> Back
              </button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" className="siv-btn siv-btn--teal" onClick={goNext} disabled={step === 2 && showGuidelines && !guidelinesAck}>
                Next <Icon name="arrow" size={16} />
              </button>
            ) : null}
          </div>
        </section>

        {/* ------------------------------------------------ summary */}
        <aside className="siv-card siv-summary" aria-labelledby="siv-sum-h">
          <div className="siv-sum-head">
            <h2 id="siv-sum-h">Interview Summary</h2>
            <p>Review your interview details before you begin.</p>
            <div className="siv-sum-tiles">
              <div><span>Time</span><b>{meta.time}</b></div>
              <div><span>Questions</span><b>{meta.questions}</b></div>
            </div>
          </div>
          <div className="siv-sum-body">
            <h3>Interview Details</h3>
            <dl className="siv-dl">
              <div><dt>Role</dt><dd>{values.position?.trim() || '—'}</dd></div>
              <div><dt>Experience</dt><dd>{values.experience ? experienceLabel(values.experience) : '—'}</dd></div>
              <div><dt>Mode</dt><dd>{meta.label}</dd></div>
              <div><dt>Difficulty</dt><dd>{DIFFICULTY_OPTIONS.find((o) => o.value === values.difficulty)?.label || '—'}</dd></div>
              <div><dt>Language</dt><dd>{INTERVIEW_LANGUAGE}</dd></div>
              <div><dt>Job description</dt><dd>{jobDescription.trim() ? 'Added' : 'None'}</dd></div>
              <div><dt>Resume status</dt><dd className={selectedResume && resumeConfirmed ? 'is-good' : 'is-pending'}>{selectedResume && resumeConfirmed ? 'Confirmed' : 'Pending'}</dd></div>
            </dl>
            <div className="siv-ready">
              <b><Icon name="check" size={18} /> Ready to begin?</b>
              <p>Your AI interviewer is prepared with role-based questions and instant feedback throughout your practice.</p>
            </div>
            <button type="button" className="siv-btn siv-btn--accent siv-btn--block siv-start" disabled={!step3Done || starting} onClick={() => beginStart()}>
              {starting ? 'Starting your interview…' : <>Start Interview <Icon name="arrow" size={16} /></>}
            </button>
            <p className={`siv-hint${step3Done ? ' is-ready' : ''}`} aria-live="polite">
              <span aria-hidden="true">{step3Done ? <Icon name="check" size={14} /> : '!'}</span> {startHint}
              {!step3Done ? <span className="sr-only"> ({doneCount} of 3 steps complete)</span> : null}
            </p>
          </div>
        </aside>
      </div>
      )}

      <QuirriModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select a resume"
        crumb="Pick one from your saved resumes for this interview"
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setPickerOpen(false)}>Cancel</button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--teal" disabled={!pickerChoice} onClick={confirmPicker}>
                Continue <Icon name="arrow" size={16} />
              </button>
            </div>
          </>
        )}
      >
        <div className="siv-picker">
          <div className="siv-picker-h"><b>Your resumes</b><span>{resumes.length} file{resumes.length === 1 ? '' : 's'} available</span></div>
          <div role="radiogroup" aria-label="Your resumes" className="siv-picker-list">
            {resumes.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={pickerChoice === r.id}
                className={`siv-picker-item${pickerChoice === r.id ? ' is-on' : ''}`}
                onClick={() => setPickerChoice(r.id)}
              >
                <span className="siv-file-ic" aria-hidden="true"><Icon name="doc" size={18} /></span>
                <span className="siv-picker-t">
                  <b>{r.filename || 'Resume'} {r.is_current ? <em>Default</em> : null}</b>
                  <small>{[resumeSize(r), shortDate(r.uploaded_at || r.created_at)].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="siv-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="siv-picker-note"><span aria-hidden="true">!</span> This is the resume that will be used for your interview.</p>
        </div>
      </QuirriModal>

      <RoleMismatchDialog
        open={Boolean(mismatch)}
        roleMatch={mismatch?.roleMatch}
        busy={starting}
        onClose={() => setMismatch(null)}
        onChangeRole={() => {
          const suggested = mismatch?.roleMatch?.suggested_role;
          if (suggested) setValue('position', suggested, { shouldValidate: true });
          setMismatch(null);
          setStep(1);
        }}
        onContinueAnyway={() => beginStart({ acknowledgedRoleMismatch: true })}
      />
    </div>
  );
}
