'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import toast from 'react-hot-toast';
import { Icon, SectionState } from '@/components/student/ui';
import { voiceQnaApi, readVoiceQnaToken, voiceQnaErrorMessage } from '@/lib/api/voiceQna';
import { formatLivekitError, resolveLivekitBrowserUrl } from '@/lib/livekitUrl';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

/**
 * Student voice tutor for one published chapter.
 * Answers come only from that chapter document (backend).
 */
export default function VoiceQnaPanel({
  jobId,
  chapterTitle = '',
  subjectName = '',
  chapters = null,
  onSelectChapter = null,
}) {
  const roomRef = useRef(null);
  const audioEls = useRef([]);
  const pollRef = useRef(null);

  const [phase, setPhase] = useState('idle'); // idle | connecting | live
  const [callError, setCallError] = useState('');
  const [tutorJoined, setTutorJoined] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const detachAudio = useCallback(() => {
    audioEls.current.forEach((el) => {
      try { el.remove(); } catch { /* ignore */ }
    });
    audioEls.current = [];
  }, []);

  const disconnectRoom = useCallback(async () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    const room = roomRef.current;
    roomRef.current = null;
    detachAudio();
    if (room) {
      try { await room.disconnect(); } catch { /* ignore */ }
    }
  }, [detachAudio]);

  useEffect(() => () => {
    disconnectRoom();
  }, [disconnectRoom]);

  const loadList = useCallback(async () => {
    if (!readVoiceQnaToken()) {
      setConversations([]);
      setListError('');
      return;
    }
    setListLoading(true);
    setListError('');
    try {
      const rows = await voiceQnaApi.list();
      setConversations(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setConversations([]);
      if (err?.message === 'missing_token' || err?.status === 401) {
        setListError('');
      } else {
        setListError(err?.message || 'Could not load past doubts.');
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id, { quiet = false } = {}) => {
    if (!id || !readVoiceQnaToken()) return;
    if (!quiet) setDetailLoading(true);
    try {
      const data = await voiceQnaApi.get(id);
      setDetail(data);
      setSelectedId(id);
    } catch (err) {
      if (!quiet) {
        setDetail(null);
        toast.error(err?.message || 'Could not open this conversation.');
      }
    } finally {
      if (!quiet) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, jobId]);

  const attachTrack = useCallback((track) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach();
    el.autoplay = true;
    el.setAttribute('data-voice-qna', '1');
    document.body.appendChild(el);
    audioEls.current.push(el);
    setTutorJoined(true);
  }, []);

  const startCall = async ({ resumeId } = {}) => {
    const targetJob = resumeId ? null : jobId;
    if (!resumeId && !targetJob) {
      toast.error('Choose a chapter before asking a doubt.');
      return;
    }
    setCallError('');
    setPhase('connecting');
    setTutorJoined(false);
    await disconnectRoom();
    try {
      const ticket = await voiceQnaApi.start(
        resumeId ? { conversationId: resumeId } : { jobId: targetJob },
      );
      const id = ticket?.conversation_id;
      setConversationId(id);
      setSelectedId(id);
      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
      room.on(RoomEvent.ParticipantConnected, () => setTutorJoined(true));
      room.on(RoomEvent.Disconnected, () => {
        setPhase('idle');
        setTutorJoined(false);
        detachAudio();
        roomRef.current = null;
        loadList();
        if (id) loadDetail(id, { quiet: true });
      });
      const url = resolveLivekitBrowserUrl(ticket.livekit_url);
      await room.connect(url, ticket.livekit_token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setPhase('live');
      if (id) {
        loadDetail(id, { quiet: true });
        pollRef.current = setInterval(() => loadDetail(id, { quiet: true }), 5000);
      }
      loadList();
    } catch (err) {
      await disconnectRoom();
      setPhase('idle');
      const message = err?.status
        ? (err.message || voiceQnaErrorMessage(err.status, err.data))
        : formatLivekitError(err, resolveLivekitBrowserUrl());
      setCallError(message);
      toast.error(message);
    }
  };

  const hangUp = async () => {
    await disconnectRoom();
    setPhase('idle');
    setTutorJoined(false);
    await loadList();
    if (conversationId) loadDetail(conversationId, { quiet: true });
  };

  const removeConversation = async (id) => {
    try {
      await voiceQnaApi.remove(id);
      if (selectedId === id) {
        setSelectedId(null);
        setDetail(null);
      }
      setConfirmDeleteId(null);
      toast.success('Conversation deleted.');
      await loadList();
    } catch (err) {
      toast.error(err?.message || 'Could not delete this conversation.');
    }
  };

  const turns = Array.isArray(detail?.turns) ? detail.turns : [];
  const statusLabel = phase === 'connecting'
    ? 'Connecting'
    : phase === 'live' && tutorJoined
      ? 'Listening'
      : phase === 'live'
        ? 'Waiting for tutor'
        : 'Ready';

  const isLive = phase === 'live';
  const isConnecting = phase === 'connecting';

  return (
    <div className="voice-qna sp">
      <div className="sp-tutor-h">
        <span className={`sp-orb${isLive ? ' is-live' : ''}${isConnecting ? ' is-connecting' : ''}`} aria-hidden="true">
          <Icon name="mic" size={22} />
        </span>
        <div className="sp-tutor-copy">
          <b>{isLive ? statusLabel : isConnecting ? 'Connecting to your tutor…' : 'Your AI voice tutor'}</b>
          <span>
            Answers come only from {chapterTitle || 'this chapter'}
            {subjectName ? ` · ${subjectName}` : ''}.
            Speak in English, Tamil, or Thanglish. The tutor will not answer outside this document.
          </span>
        </div>
        {isLive || isConnecting ? (
          <button type="button" className="sd-btn sd-btn--glass" onClick={hangUp}>
            <Icon name="phone" size={16} /> {isConnecting ? 'Cancel' : 'Hang up'}
          </button>
        ) : (
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => startCall()} disabled={!jobId}>
            <Icon name="mic" size={16} /> Ask a doubt
          </button>
        )}
      </div>

      {Array.isArray(chapters) && chapters.length > 1 && typeof onSelectChapter === 'function' ? (
        <div className="sp-chapter-chips" role="group" aria-label="Choose the chapter to ask about">
          <span>Asking about</span>
          {chapters.map((c) => (
            <button
              key={c.job_id}
              type="button"
              className={`sp-chip-btn${c.job_id === jobId ? ' is-active' : ''}`}
              aria-pressed={c.job_id === jobId}
              disabled={phase !== 'idle'}
              onClick={() => onSelectChapter(c.job_id)}
            >
              {c.chapter_title || 'Untitled chapter'}
            </button>
          ))}
        </div>
      ) : null}

      {callError ? (
        <SectionState tone="err" title="Could not start voice Q&A">{callError}</SectionState>
      ) : null}

      <div className="sp-tutor-grid">
        <div className="sp-panel">
          <div className="sp-panel-h">
            <div>
              <h3>Past doubts</h3>
              <p>{listLoading ? 'Loading…' : `${conversations.length} saved`}</p>
            </div>
          </div>
          {listError ? (
            <div className="sp-panel-b"><SectionState tone="err" title="Could not load past doubts">{listError}</SectionState></div>
          ) : null}
          {!listLoading && !conversations.length && !listError ? (
            <div className="sp-panel-b">
              <SectionState title="No doubts yet">Past doubts appear here after you ask a question.</SectionState>
            </div>
          ) : null}
          {conversations.map((row) => {
            const active = row.id === selectedId;
            return (
              <div key={row.id} className={`sp-doubt${active ? ' is-active' : ''}`}>
                <button type="button" className="sp-doubt-open" onClick={() => loadDetail(row.id)}>
                  <b>{row.title || 'New conversation'}</b>
                  <small>
                    {row.document_title || 'Chapter'}
                    {row.status ? ` · ${row.status}` : ''}
                    {row.started_at ? ` · ${formatWhen(row.started_at)}` : ''}
                  </small>
                </button>
                <div className="sp-doubt-actions">
                  <button
                    type="button"
                    className="sd-btn sd-btn--outline sd-btn--sm"
                    onClick={() => startCall({ resumeId: row.id })}
                    disabled={phase !== 'idle'}
                  >
                    Continue
                  </button>
                  {confirmDeleteId === row.id ? (
                    <button
                      type="button"
                      className="sd-btn sd-btn--danger sd-btn--sm"
                      onClick={() => removeConversation(row.id)}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sd-btn sd-btn--ghost sd-btn--sm"
                      onClick={() => setConfirmDeleteId(row.id)}
                      aria-label={`Delete ${row.title || 'conversation'}`}
                    >
                      <Icon name="trash" size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sp-panel">
          <div className="sp-panel-h">
            <div>
              <h3>{detail?.title || chapterTitle || 'Voice tutor'}</h3>
              <p>
                {statusLabel}
                {detail?.document_title ? ` · ${detail.document_title}` : ''}
              </p>
            </div>
            <span
              className={`sp-live-dot${isLive ? ' is-live' : ''}${isConnecting ? ' is-connecting' : ''}`}
              aria-hidden="true"
            />
          </div>
          <div className="sp-chat" aria-live="polite">
            {detailLoading ? <SectionState title="Loading transcript…" /> : null}
            {!detailLoading && !turns.length ? (
              <SectionState title={isLive ? 'Speak your question' : 'Ask a doubt to begin'}>
                {isLive
                  ? 'The tutor answers by voice. Your questions and answers appear here as they are saved. A short silence ends the call.'
                  : 'One tap starts a voice call grounded in this chapter. Past transcripts stay in the list on the left.'}
              </SectionState>
            ) : null}
            {turns.map((turn) => (
              <div key={turn.turn_number || turn.created_at} className="sp">
                <div className="sp-bubble sp-bubble--me">{turn.question || '—'}</div>
                <div className="sp-bubble sp-bubble--ai">
                  {turn.answer || '—'}
                  {turn.detected_language ? <small>{turn.detected_language}</small> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
