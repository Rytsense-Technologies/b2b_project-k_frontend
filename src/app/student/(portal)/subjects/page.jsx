'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoPreviewModal from '@/components/shared/VideoPreviewModal';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';

const SUBJECT_GRADIENTS = [
  'linear-gradient(125deg,#0E5C6B,#4D8691)',
  'linear-gradient(125deg,#06252B,#0B4B58)',
  'linear-gradient(125deg,#0B4B3A,#0F6E56)',
  'linear-gradient(125deg,#0A3F49,#86AEB5)',
  'linear-gradient(125deg,#0E5C6B,#B7CED3)',
];

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function subjectKey(job) {
  return String(job?.department_id || job?.department_name || 'my-lectures');
}

function subjectLabel(job, fallbackDeptName) {
  return job?.department_name || fallbackDeptName || 'Video lectures';
}

export default function StudentSubjectsPage() {
  const router = useRouter();
  const [activeSubjectKey, setActiveSubjectKey] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [subTab, setSubTab] = useState('classroom');
  const [previewJob, setPreviewJob] = useState(null);

  const { data: meData } = useAsyncResource(
    () => fetchData(() => settingsApi.get()),
    [],
  );

  const {
    data,
    loading,
    error,
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

  const openSubject = (subject) => {
    setActiveSubjectKey(subject.key);
    setActiveJobId(subject.chapters[0]?.job_id || null);
    setSubTab('classroom');
  };

  const tabStyle = (active, accent) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: '12px 12px 0 0',
    border: '1px solid var(--line)',
    borderBottom: active ? '1px solid #fff' : '1px solid var(--line)',
    background: active ? '#fff' : 'transparent',
    color: active ? accent : 'var(--muted)',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  });

  return (
    <div className="animate-fade-in">
      {!activeSubject ? (
        <>
          {error ? (
            <div className="notice err" style={{ marginBottom: 16 }}>
              <div>
                <b>Could not load your subjects</b>
                {apiErrorMessage(error, 'Please try again.')}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="card card-p">Loading your published lectures…</div>
          ) : null}

          {!loading && !error && !subjects.length ? (
            <div className="notice info" style={{ marginBottom: 16 }}>
              <div>
                <b>Nothing published for your department yet</b>
                {studentDepartmentName || studentDepartmentId
                  ? ` Lectures appear here only after an HOD/Faculty publishes them for ${studentDepartmentName || 'your department'}. Content published for other departments will not show on this account.`
                  : ' Your college admin needs to assign you to a department first. Published lectures are scoped to that department only.'}
              </div>
            </div>
          ) : null}

          {subjects.length ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {subjects.map((subject) => (
                <button
                  key={subject.key}
                  type="button"
                  className="q-card-lift"
                  onClick={() => openSubject(subject)}
                  style={{
                    textAlign: 'left',
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '1px solid var(--line)',
                    background: '#fff',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ height: 64, background: subject.grad, position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 12,
                        color: 'rgba(255,255,255,.9)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.05em',
                      }}
                    >
                      {subject.code}
                    </span>
                  </div>
                  <div style={{ padding: '13px 15px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{subject.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-3)', margin: '3px 0 11px' }}>
                      {subject.chapters.length} chapter{subject.chapters.length === 1 ? '' : 's'} published
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: '#EAEFF1',
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <i
                          style={{
                            display: 'block',
                            height: '100%',
                            width: '100%',
                            background: '#0E5C6B',
                            borderRadius: 6,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                        Watch
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="notice info" style={{ marginTop: 18 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div>
              <b>Assessments open from each subject</b>
              Open a subject, then use the Assessment tab or Take assessment on a chapter.
              The AI tutor stays empty until its API is live — nothing is mocked here.
            </div>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setActiveSubjectKey(null);
              setActiveJobId(null);
              setSubTab('classroom');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 14,
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to subjects
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{activeSubject.name}</div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 999,
                background: '#EEF0F0',
                color: 'var(--muted)',
              }}
            >
              {activeSubject.code} · {activeChapters.length} chapter{activeChapters.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: -1, position: 'relative', zIndex: 2 }}>
            <button
              type="button"
              onClick={() => setSubTab('classroom')}
              style={tabStyle(subTab === 'classroom', '#0E5C6B')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <path d="M15 3v5h5" />
              </svg>
              Classroom
            </button>
            <button
              type="button"
              onClick={() => setSubTab('tutor')}
              style={tabStyle(subTab === 'tutor', '#0E5C6B')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Ask your AI Tutor
            </button>
            <button
              type="button"
              onClick={() => setSubTab('assessment')}
              style={tabStyle(subTab === 'assessment', '#0E5C6B')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 11l3 3 8-8" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Assessment
            </button>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: '0 18px 18px 18px',
              boxShadow: 'var(--shadow-xs)',
              padding: 18,
            }}
          >
            {subTab === 'classroom' ? (
              <div className="student-classroom-grid">
                <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--line-soft)',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Chapters
                    <div style={{ fontSize: 11, color: 'var(--muted-3)', fontWeight: 500, marginTop: 2 }}>
                      {activeChapters.length} published for your department
                    </div>
                  </div>
                  {activeChapters.map((job) => {
                    const selected = activeJob?.job_id === job.job_id;
                    return (
                      <button
                        key={job.job_id}
                        type="button"
                        onClick={() => setActiveJobId(job.job_id)}
                        style={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          gap: 11,
                          padding: '11px 16px',
                          cursor: 'pointer',
                          background: selected ? '#F1F5F6' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--line-soft)',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ width: 18, height: 18, flex: 'none', color: selected ? '#0E5C6B' : '#707A7E' }}>
                          {selected ? '●' : '▶'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              color: '#102228',
                            }}
                          >
                            {job.chapter_title || 'Untitled chapter'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted-3)', marginTop: 1 }}>
                            {formatDuration(job.video_duration_seconds) || 'Video lecture'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    background: '#0E1A2B',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: 340,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSubTab('tutor')}
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 16,
                      background: '#fff',
                      color: 'var(--ink)',
                      border: 'none',
                      borderRadius: 999,
                      padding: '8px 15px',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      cursor: 'pointer',
                      zIndex: 2,
                      fontFamily: 'inherit',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--teal)" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Ask your AI Tutor
                  </button>

                  <div style={{ padding: '20px 22px', flex: 1 }}>
                    <div
                      style={{
                        color: '#87A0B9',
                        fontSize: 10.5,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      Now teaching
                    </div>
                    <h3 style={{ color: '#fff', fontSize: 19, fontWeight: 600, margin: '7px 0 12px' }}>
                      {activeJob?.chapter_title || 'Select a chapter'}
                    </h3>
                    <ul
                      style={{
                        listStyle: 'none',
                        color: '#BCCDDF',
                        fontSize: 12.5,
                        padding: 0,
                        margin: 0,
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <li>› {activeJob?.source_filename || 'Published lecture'}</li>
                      <li>
                        › Published{' '}
                        {activeJob?.published_at
                          ? new Date(activeJob.published_at).toLocaleDateString()
                          : '—'}
                      </li>
                      {formatDuration(activeJob?.video_duration_seconds) ? (
                        <li>› Duration {formatDuration(activeJob.video_duration_seconds)}</li>
                      ) : null}
                    </ul>
                  </div>

                  <div
                    style={{
                      background: '#08111E',
                      padding: '13px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!activeJob}
                      onClick={() => setPreviewJob(activeJob)}
                      style={{
                        borderRadius: 999,
                        minHeight: 36,
                        padding: '8px 16px',
                      }}
                    >
                      Watch lecture
                    </button>
                    {activeJob ? (
                      <QuirriBtn
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const qs = new URLSearchParams({
                            job: activeJob.job_id,
                            title: activeJob.chapter_title || 'Chapter quiz',
                          });
                          router.push(`/student/assessment?${qs.toString()}`);
                        }}
                        style={{
                          borderRadius: 999,
                          minHeight: 36,
                          padding: '8px 16px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          borderColor: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        Take assessment
                      </QuirriBtn>
                    ) : null}
                    {activeJob ? (
                      <a
                        href={eduVideoApi.getDownloadUrl(activeJob.job_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#87A0B9', fontSize: 12, fontWeight: 600 }}
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : subTab === 'assessment' ? (
              <div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)', textAlign: 'left' }}>
                  Chapter quizzes use the same published lectures. One attempt per chapter.
                </p>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Chapter</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!activeChapters.length ? (
                        <tr><td colSpan={2}>No published chapters yet.</td></tr>
                      ) : null}
                      {activeChapters.map((job) => (
                        <tr key={job.job_id}>
                          <td>
                            <span className="strong">{job.chapter_title || 'Untitled chapter'}</span>
                          </td>
                          <td className="actions">
                            <a
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                const qs = new URLSearchParams({
                                  job: job.job_id,
                                  title: job.chapter_title || 'Chapter quiz',
                                });
                                router.push(`/student/assessment?${qs.toString()}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                const qs = new URLSearchParams({
                                  job: job.job_id,
                                  title: job.chapter_title || 'Chapter quiz',
                                });
                                router.push(`/student/assessment?${qs.toString()}`);
                              }}
                            >
                              Open assessment
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="notice info" style={{ margin: 0 }}>
                <div>
                  <b>AI tutor is not available yet</b>
                  Answers will come only from your {activeSubject.name} material when the tutor API is live.
                  Nothing is mocked here.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <VideoPreviewModal
        open={Boolean(previewJob)}
        onClose={() => setPreviewJob(null)}
        title={previewJob?.chapter_title || 'Video preview'}
        src={previewJob ? eduVideoApi.getDownloadUrl(previewJob.job_id) : null}
      />
    </div>
  );
}
