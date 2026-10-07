'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import VoiceQnaPanel from '@/components/student/VoiceQnaPanel';
import { Icon, Kpi, SectionState } from '@/components/student/ui';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { mcqApi } from '@/lib/api/mcq';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/* Brand teal-family gradients for subject cards (Brand v1.0 palette only). */
const SUBJECT_GRADIENTS = [
  'linear-gradient(125deg,#0A3F49,#0E5C6B 60%,#4D8691)',
  'linear-gradient(125deg,#06252B,#0B4B58 60%,#0E5C6B)',
  'linear-gradient(125deg,#08323A,#0F6E56 70%,#4D8691)',
  'linear-gradient(125deg,#0A3F49,#4D8691 70%,#86AEB5)',
  'linear-gradient(125deg,#0B4B58,#0E5C6B 55%,#B7CED3)',
];

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function subjectKey(job) {
  return String(job?.department_id || job?.department_name || 'my-lectures');
}

function subjectLabel(job, fallbackDeptName) {
  return job?.department_name || fallbackDeptName || 'Video lectures';
}

function assessmentHref(job) {
  const qs = new URLSearchParams({
    job: job.job_id,
    title: job.chapter_title || 'Chapter quiz',
  });
  return `/student/assessment?${qs.toString()}`;
}

/** Quiz status for one chapter — read-only GET /mcq/jobs/{id}. */
async function quizStatus(jobId) {
  try {
    const view = await mcqApi.get(jobId);
    if (view?.status === 'already_attempted') {
      const pct = Number(view?.result?.percentage);
      return { state: 'done', pct: Number.isFinite(pct) ? Math.round(pct) : null };
    }
    if (view?.status === 'not_attempted') return { state: 'open' };
    return { state: 'unavailable' };
  } catch {
    return { state: 'unavailable' };
  }
}

function SubjectArt() {
  return (
    <svg className="sp-subject-art" viewBox="0 0 140 88" aria-hidden="true">
      <circle cx="112" cy="70" r="46" fill="rgba(255,255,255,.08)" />
      <rect x="70" y="30" width="56" height="38" rx="5" fill="rgba(255,255,255,.18)" />
      <path d="M93 42l12 7-12 7z" fill="rgba(255,255,255,.85)" />
      <circle cx="124" cy="18" r="4" fill="#F5821F" />
    </svg>
  );
}

function ScreenArt() {
  return (
    <svg className="sp-screen-art" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="640" cy="80" r="180" fill="rgba(134,174,181,.10)" />
      <circle cx="120" cy="380" r="160" fill="rgba(77,134,145,.12)" />
      <rect x="80" y="70" width="220" height="14" rx="7" fill="rgba(255,255,255,.08)" />
      <rect x="80" y="98" width="160" height="14" rx="7" fill="rgba(255,255,255,.06)" />
      <rect x="520" y="280" width="200" height="12" rx="6" fill="rgba(255,255,255,.06)" />
    </svg>
  );
}

export default function StudentSubjectsPage() {
  const router = useRouter();
  const [activeSubjectKey, setActiveSubjectKey] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [subTab, setSubTab] = useState('classroom');
  /** Inline player in the right-side classroom stage (not a modal). */
  const [watching, setWatching] = useState(false);

  const { data: meData } = useAsyncResource(
    () => fetchData(() => settingsApi.get()),
    [],
  );

  const {
    data,
    loading,
    error,
    reload,
  } = useAsyncResource(
    () => eduVideoApi.listStudentVideos({ pageSize: 100 }),
    [],
  );

  const videos = useMemo(() => asList(data, []), [data]);
  const me = meData?.user || meData || null;
  const studentDepartmentId = me?.department_id || null;
  const studentDepartmentName = me?.department_name || me?.department || null;

  const subjects = useMemo(() => {
    const map = new Map();
    videos.forEach((job) => {
      const key = subjectKey(job);
      if (!map.has(key)) {
        const name = subjectLabel(job, studentDepartmentName);
        map.set(key, {
          key,
          id: job.department_id || key,
          name,
          code: (name || 'VID').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'VID',
          chapters: [],
        });
      }
      map.get(key).chapters.push(job);
    });
    return Array.from(map.values()).map((subject, index) => ({
      ...subject,
      chapters: subject.chapters.sort(
        (a, b) => (Date.parse(b.published_at || '') || 0) - (Date.parse(a.published_at || '') || 0),
      ),
      grad: SUBJECT_GRADIENTS[index % SUBJECT_GRADIENTS.length],
    }));
  }, [videos, studentDepartmentName]);

  const activeSubject = subjects.find((s) => s.key === activeSubjectKey) || null;
  const activeChapters = activeSubject?.chapters || [];
  const activeJob = activeChapters.find((j) => j.job_id === activeJobId) || activeChapters[0] || null;
  const activeIndex = activeJob ? activeChapters.findIndex((j) => j.job_id === activeJob.job_id) : -1;

  /* Per-chapter quiz status — only loaded while the Assessment tab is open. */
  const quizKey = subTab === 'assessment' ? activeChapters.map((c) => c.job_id).join(',') : '';
  const { data: quizMap, loading: quizLoading } = useAsyncResource(async () => {
    if (!quizKey) return {};
    const ids = quizKey.split(',').filter(Boolean);
    const rows = await Promise.all(ids.map((id) => quizStatus(id)));
    return Object.fromEntries(ids.map((id, i) => [id, rows[i]]));
  }, [quizKey]);

  const totalChapters = videos.length;
  const latest = useMemo(
    () => [...videos].sort((a, b) => (Date.parse(b.published_at || '') || 0) - (Date.parse(a.published_at || '') || 0))[0] || null,
    [videos],
  );

  const openSubject = (subject) => {
    setActiveSubjectKey(subject.key);
    setActiveJobId(subject.chapters[0]?.job_id || null);
    setSubTab('classroom');
    setWatching(false);
  };

  /* Changing chapter or leaving classroom stops the inline player. */
  useEffect(() => {
    setWatching(false);
  }, [activeJobId, subTab]);

  const TABS = [
    { id: 'classroom', label: 'Classroom', icon: 'doc' },
    { id: 'tutor', label: 'Ask your AI Tutor', icon: 'chat' },
    { id: 'assessment', label: 'Assessment', icon: 'check' },
  ];

  /* ------------------------------------------------------------ list view */
  if (!activeSubject) {
    return (
      <div className="sp animate-fade-in">
        <section className="sd-kpis" aria-label="Subjects summary">
          <Kpi icon="book" label="My subjects" value={loading ? null : subjects.length} sub={studentDepartmentName || 'Your department'} />
          <Kpi icon="play" label="Chapters published" value={loading ? null : totalChapters} sub="Video lectures ready to watch" />
          <Kpi
            icon="calendar"
            label="Latest lecture"
            value={latest ? (latest.chapter_title || 'Untitled chapter') : null}
            sub={latest ? formatDate(latest.published_at) || 'Recently published' : 'Appears when published'}
            tone="text"
          />
          <Kpi icon="check" label="Assessments" value="1 attempt" sub="Per chapter, scored by Quirri" tone="text" />
        </section>

        {error ? (
          <SectionState
            tone="err"
            title="Could not load your subjects"
            action={(
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
                <Icon name="refresh" size={16} /> Try again
              </button>
            )}
          >
            {apiErrorMessage(error, 'Please try again.')}
          </SectionState>
        ) : null}

        <div className="sp-section-h">
          <div>
            <h3>Your subjects</h3>
            <p>Open a subject to watch lectures, ask the AI tutor, or take a chapter assessment.</p>
          </div>
        </div>

        {loading ? (
          <SectionState title="Loading your published lectures…" />
        ) : null}

        {!loading && !error && !subjects.length ? (
          <SectionState title="Nothing published for your department yet">
            {studentDepartmentName || studentDepartmentId
              ? `Lectures appear here only after an HOD/Faculty publishes them for ${studentDepartmentName || 'your department'}. Content published for other departments will not show on this account.`
              : 'Your college admin needs to assign you to a department first. Published lectures are scoped to that department only.'}
          </SectionState>
        ) : null}

        {subjects.length ? (
          <div className="sp-grid">
            {subjects.map((subject) => {
              const newest = subject.chapters[0];
              return (
                <button
                  key={subject.key}
                  type="button"
                  className="sp-subject"
                  onClick={() => openSubject(subject)}
                >
                  <div className="sp-subject-top" style={{ background: subject.grad }}>
                    <span className="sp-subject-code">{subject.code}</span>
                    <SubjectArt />
                  </div>
                  <div className="sp-subject-body">
                    <h3>{subject.name}</h3>
                    <div className="sp-subject-meta">
                      <span>
                        <Icon name="play" size={14} />
                        {subject.chapters.length} chapter{subject.chapters.length === 1 ? '' : 's'}
                      </span>
                      <span><Icon name="chat" size={14} /> AI tutor</span>
                      <span><Icon name="check" size={14} /> Quizzes</span>
                    </div>
                    {newest ? (
                      <div className="sp-subject-latest">
                        Latest chapter
                        <b>{newest.chapter_title || 'Untitled chapter'}</b>
                      </div>
                    ) : null}
                    <div className="sp-subject-foot">
                      Open subject
                      <Icon name="arrow" size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        <SectionState title="Assessments open from each subject">
          Open a subject, then use the Assessment tab or Ask your AI Tutor on a chapter.
        </SectionState>
      </div>
    );
  }

  /* ---------------------------------------------------------- subject view */
  const duration = formatDuration(activeJob?.video_duration_seconds);
  const published = formatDate(activeJob?.published_at);

  return (
    <div className="sp animate-fade-in">
      <button
        type="button"
        className="sp-back"
        onClick={() => {
          setActiveSubjectKey(null);
          setActiveJobId(null);
          setSubTab('classroom');
          setWatching(false);
        }}
      >
        <Icon name="back" size={16} />
        Back to subjects
      </button>

      <section className="sp-banner">
        <div className="sp-banner-ic" aria-hidden="true">{activeSubject.code}</div>
        <div className="sp-banner-copy">
          <div className="sp-banner-eyebrow">Subject</div>
          <h2>{activeSubject.name}</h2>
          <div className="sp-banner-meta">
            <span className="sp-pill sp-pill--glass">
              <Icon name="play" size={14} />
              {activeChapters.length} chapter{activeChapters.length === 1 ? '' : 's'}
            </span>
            {studentDepartmentName ? (
              <span className="sp-pill sp-pill--glass">{studentDepartmentName}</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sp-tabs" role="tablist" aria-label="Subject sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            className="sp-tab"
            onClick={() => setSubTab(t.id)}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'classroom' ? (
        <div className="sp-classroom" role="tabpanel">
          <div className="sp-panel">
            <div className="sp-panel-h">
              <div>
                <h3>Chapters</h3>
                <p>{activeChapters.length} published for your department</p>
              </div>
            </div>
            <ul className="sp-chapters">
              {activeChapters.map((job, i) => {
                const selected = activeJob?.job_id === job.job_id;
                return (
                  <li key={job.job_id}>
                    <button
                      type="button"
                      className="sp-chapter"
                      aria-current={selected}
                      onClick={() => setActiveJobId(job.job_id)}
                    >
                      <span className="sp-chapter-n">{i + 1}</span>
                      <span className="sp-chapter-t">
                        <b>{job.chapter_title || 'Untitled chapter'}</b>
                        <small>
                          <Icon name="clock" size={12} />
                          {formatDuration(job.video_duration_seconds) || 'Video lecture'}
                        </small>
                      </span>
                      <Icon name={selected ? 'playFill' : 'chev'} size={16} className="sp-chapter-go" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="sp-stage">
            <div className={`sp-screen${watching && activeJob ? ' is-playing' : ''}`}>
              {watching && activeJob ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    key={activeJob.job_id}
                    className="sp-screen-video"
                    controls
                    autoPlay
                    playsInline
                    src={eduVideoApi.getDownloadUrl(activeJob.job_id)}
                  >
                    Your browser does not support embedded video playback.
                  </video>
                  <span className="sp-screen-tag sp-pill sp-pill--glass">
                    Chapter {activeIndex >= 0 ? activeIndex + 1 : '—'} of {activeChapters.length}
                  </span>
                  <button
                    type="button"
                    className="sd-btn sd-btn--glass sd-btn--sm sp-screen-tutor"
                    onClick={() => setSubTab('tutor')}
                  >
                    <Icon name="chat" size={14} /> Ask your AI Tutor
                  </button>
                </>
              ) : (
                <>
                  <ScreenArt />
                  <span className="sp-screen-tag sp-pill sp-pill--glass">
                    Chapter {activeIndex >= 0 ? activeIndex + 1 : '—'} of {activeChapters.length}
                  </span>
                  <button
                    type="button"
                    className="sd-btn sd-btn--glass sd-btn--sm sp-screen-tutor"
                    onClick={() => setSubTab('tutor')}
                  >
                    <Icon name="chat" size={14} /> Ask your AI Tutor
                  </button>
                  <button
                    type="button"
                    className="sp-play"
                    disabled={!activeJob}
                    onClick={() => setWatching(true)}
                    aria-label={activeJob ? `Watch ${activeJob.chapter_title || 'lecture'}` : 'Select a chapter'}
                  >
                    <Icon name="playFill" size={30} />
                  </button>
                  {duration ? <span className="sp-screen-dur">{duration}</span> : null}
                </>
              )}
            </div>

            <div className="sp-stage-body">
              <div className="sp-banner-eyebrow">Now teaching</div>
              <h3>{activeJob?.chapter_title || 'Select a chapter'}</h3>
              <div className="sp-stage-meta">
                <span><Icon name="doc" size={14} /> {activeJob?.source_filename || 'Published lecture'}</span>
                <span><Icon name="calendar" size={14} /> Published {published || '—'}</span>
                {duration ? <span><Icon name="clock" size={14} /> {duration}</span> : null}
              </div>
            </div>

            <div className="sp-stage-actions">
              <button
                type="button"
                className="sd-btn sd-btn--amber"
                disabled={!activeJob}
                onClick={() => setWatching(true)}
              >
                <Icon name="playFill" size={16} />
                {watching ? 'Playing here' : 'Watch lecture'}
              </button>
              {activeJob ? (
                <button
                  type="button"
                  className="sd-btn sd-btn--glass"
                  onClick={() => router.push(assessmentHref(activeJob))}
                >
                  <Icon name="check" size={16} /> Take assessment
                </button>
              ) : null}
              {activeJob ? (
                <a
                  className="sp-link"
                  href={eduVideoApi.getDownloadUrl(activeJob.job_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="download" size={16} /> Download
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : subTab === 'assessment' ? (
        <div className="sp-panel" role="tabpanel">
          <div className="sp-panel-h">
            <div>
              <h3>Chapter assessments</h3>
              <p>Chapter quizzes use the same published lectures. One attempt per chapter.</p>
            </div>
            <span className="sp-pill sp-pill--teal">{activeChapters.length} chapter{activeChapters.length === 1 ? '' : 's'}</span>
          </div>
          {!activeChapters.length ? (
            <div className="sp-panel-b"><SectionState title="No published chapters yet." /></div>
          ) : (
            <ul className="sp-rows">
              {activeChapters.map((job, i) => {
                const q = quizMap?.[job.job_id];
                const state = q?.state;
                return (
                  <li key={job.job_id} className="sp-row">
                    <span className={`sp-row-ic${state === 'done' ? ' sp-row-ic--good' : state === 'unavailable' ? ' sp-row-ic--muted' : ''}`}>
                      <Icon name={state === 'done' ? 'tick' : state === 'unavailable' ? 'lock' : 'check'} size={18} />
                    </span>
                    <div className="sp-row-main">
                      <b>{job.chapter_title || 'Untitled chapter'}</b>
                      <div className="sp-row-meta">
                        <span>Chapter {i + 1}</span>
                        {formatDuration(job.video_duration_seconds) ? <span>· {formatDuration(job.video_duration_seconds)} lecture</span> : null}
                        {quizLoading && !q ? <span className="sp-pill">Checking…</span> : null}
                        {state === 'open' ? <span className="sp-pill sp-pill--teal">Ready to attempt</span> : null}
                        {state === 'done' ? <span className="sp-pill sp-pill--good">Completed</span> : null}
                        {state === 'unavailable' ? <span className="sp-pill">Not ready yet</span> : null}
                      </div>
                    </div>
                    <div className="sp-row-side">
                      {state === 'done' && q.pct != null ? (
                        <span className={`sp-score${q.pct >= 75 ? ' sp-score--good' : q.pct < 50 ? ' sp-score--low' : ''}`}>
                          {q.pct}<small>%</small>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={`sd-btn sd-btn--sm ${state === 'done' ? 'sd-btn--ghost' : 'sd-btn--outline'}`}
                        onClick={() => router.push(assessmentHref(job))}
                      >
                        {state === 'done' ? 'View result' : 'Open assessment'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          <VoiceQnaPanel
            jobId={activeJob?.job_id}
            chapterTitle={activeJob?.chapter_title || ''}
            subjectName={activeSubject.name}
            chapters={activeChapters}
            onSelectChapter={setActiveJobId}
          />
        </div>
      )}
    </div>
  );
}
