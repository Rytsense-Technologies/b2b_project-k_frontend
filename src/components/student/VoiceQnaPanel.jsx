'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import toast from 'react-hot-toast';
import { Icon, SectionState } from '@/components/student/ui';
import { voiceQnaApi, voiceQnaCanRetry, voiceQnaErrorMessage } from '@/lib/api/voiceQna';
import { formatLivekitError, livekitUrlFromApi } from '@/lib/livekitUrl';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}`;
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
  // { kind: 'mic'|'http'|'audio', title, message, retry, detail? }
  const [callError, setCallError] = useState(null);
  const [lastStart, setLastStart] = useState({});
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
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

  useEffect(() => {
    // Leaving / closing the page ends the call (the backend marks the
    // conversation ended from LiveKit's webhook).
    const onLeave = () => { roomRef.current?.disconnect(); };
    window.addEventListener('pagehide', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      disconnectRoom();
    };
  }, [disconnectRoom]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const rows = await voiceQnaApi.list();
      setConversations(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setConversations([]);
      // 401/403 = no history access for this session yet — show the empty state, not an error.
      if (err?.message === 'missing_token' || err?.status === 401 || err?.status === 403) {
        setListError('');
      } else {
        setListError(err?.message || 'Could not load past doubts.');
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id, { quiet = false } = {}) => {
    if (!id) return;
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

  const failCall = async (error) => {
    await disconnectRoom();
    setPhase('idle');
    setNeedsAudioUnlock(false);
    setCallError(error);
    toast.error(error.message);
  };

  const startCall = async ({ resumeId } = {}) => {
    const targetJob = resumeId ? null : jobId;
    if (!resumeId && !targetJob) {
      toast.error('Choose a chapter before asking a doubt.');
      return;
    }
    setCallError(null);
    setNeedsAudioUnlock(false);
    setPhase('connecting');
    setTutorJoined(false);
    setLastStart({ resumeId });
    await disconnectRoom();

    // 1) Microphone permission first, so "denied" is reported as exactly that.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      await failCall({
        kind: 'mic',
        title: denied ? 'Microphone access is blocked' : 'No microphone found',
        message: denied
          ? 'Allow microphone access for this site in your browser, then try again.'
          : 'Connect a microphone and try again.',
        retry: true,
      });
      return;
    }

    // 2) The HTTP call - a backend / voice-server problem or the chapter not ready.
    let ticket;
    try {
      ticket = await voiceQnaApi.start(resumeId ? { conversationId: resumeId } : { jobId: targetJob });
    } catch (err) {
      const status = err?.status;
      await failCall({
        kind: 'http',
        title: 'Could not start voice Q&A',
        message: status ? voiceQnaErrorMessage(status, err.data) : (err?.message || 'Voice assistant is unavailable. Try again later.'),
        retry: status ? voiceQnaCanRetry(status, err.data) : true,
      });
      return;
    }

    // 3) The call succeeded but the audio connection (LiveKit) failed -
    //    a browser <-> LiveKit network/microphone problem, not the backend.
    const id = ticket?.conversation_id;
    setConversationId(id);
    setSelectedId(id);
    const url = livekitUrlFromApi(ticket.livekit_url);
    try {
      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track));
      room.on(RoomEvent.ParticipantConnected, () => setTutorJoined(true));
      // The tutor (agent) leaving mid-call - e.g. the speech service failed -
      // must not leave the student "talking" to an empty room.
      room.on(RoomEvent.ParticipantDisconnected, () => {
        if (roomRef.current !== room || room.remoteParticipants.size > 0) return;
        failCall({
          kind: 'tutor',
          title: 'The tutor left the session',
          message: 'The voice tutor stopped responding. Start a new session; if it keeps happening, the voice service may be unavailable.',
          retry: true,
        });
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioUnlock(!room.canPlaybackAudio));
      room.on(RoomEvent.Disconnected, () => {
        setPhase('idle');
        setTutorJoined(false);
        setNeedsAudioUnlock(false);
        detachAudio();
        roomRef.current = null;
        loadList();
        if (id) loadDetail(id, { quiet: true });
      });
      await room.connect(url, ticket.livekit_token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setNeedsAudioUnlock(!room.canPlaybackAudio);
      setPhase('live');
      if (id) {
        loadDetail(id, { quiet: true });
        pollRef.current = setInterval(() => loadDetail(id, { quiet: true }), 5000);
      }
      loadList();
    } catch (err) {
      console.error('[voice_qna] LiveKit connection failed:', url, err?.message || err);
      await failCall({
        kind: 'audio',
        title: 'Could not connect audio',
        message: 'Could not connect audio. Check your network and microphone.',
        detail: formatLivekitError(err, url),
        retry: true,
      });
    }
  };

  const unlockAudio = async () => {
    try {
      await roomRef.current?.startAudio();
      setNeedsAudioUnlock(!roomRef.current?.canPlaybackAudio);
    } catch {
      toast.error('Audio is still blocked. Click again or check the site sound settings.');
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
  // Sessions where nothing was asked add noise - hide them (older API
  // responses without `has_questions` keep everything).
  const shownConversations = conversations.filter((c) => c.has_questions !== false || c.id === selectedId);
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
    <div className="voice-qna sl-tutor">
      <section className="sl-card sl-history" aria-labelledby="sl-hist-h">
        <div className="sl-card-h sl-card-h--stack">
          <h3 id="sl-hist-h">Session history</h3>
          <span>{listLoading ? 'Loading…' : `${shownConversations.length} saved session${shownConversations.length === 1 ? '' : 's'}`}</span>
        </div>
        {listError ? <SectionState tone="err" title="Could not load past sessions">{listError}</SectionState> : null}
        {!listLoading && !shownConversations.length && !listError ? (
          <div className="sl-empty sl-empty--plain">
            <span className="sl-empty-ic" aria-hidden="true"><Icon name="doc" size={26} /></span>
            <b>No past questions yet</b>
            <p>Your past questions appear here after your first session.</p>
          </div>
        ) : null}
        {shownConversations.length ? (
          <ul className="sl-sessions">
            {shownConversations.map((row) => {
              const active = row.id === selectedId;
              return (
                <li key={row.id} className={`sl-session${active ? ' is-active' : ''}`}>
                  <button type="button" className="sl-session-open" onClick={() => loadDetail(row.id)} aria-pressed={active}>
                    <b>{row.title || 'New conversation'}</b>
                    <small>
                      {row.document_title || 'Chapter'}
                      {row.started_at ? ` · ${formatWhen(row.started_at)}` : ''}
                    </small>
                  </button>
                  <div className="sl-session-actions">
                    <button
                      type="button"
                      className="sd-btn sd-btn--outline sd-btn--sm"
                      onClick={() => startCall({ resumeId: row.id })}
                      disabled={phase !== 'idle'}
                    >
                      Continue
                    </button>
                    {confirmDeleteId === row.id ? (
                      <button type="button" className="sd-btn sd-btn--danger sd-btn--sm" onClick={() => removeConversation(row.id)}>
                        Confirm delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sd-btn sd-btn--ghost sd-btn--sm"
                        onClick={() => setConfirmDeleteId(row.id)}
                        aria-label={`Delete ${row.title || 'conversation'}`}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <div className="sl-tutor-main">
        <section className="sl-card sl-voice" aria-labelledby="sl-voice-h">
          <div className="sl-voice-bar">
            <span className="sl-inline">
              <Icon name="bookOpen" size={18} />
              {/* One text node so the subject wraps after the title on phones (not a second column). */}
              <span>{chapterTitle || 'Choose a chapter'}{subjectName ? <span className="sl-muted"> · {subjectName}</span> : null}</span>
            </span>
            <span className={`sl-live${isLive ? ' is-live' : ''}${isConnecting ? ' is-connecting' : ''}`}>
              <i aria-hidden="true" /> {statusLabel}
            </span>
          </div>

          {Array.isArray(chapters) && chapters.length > 1 && typeof onSelectChapter === 'function' ? (
            <div className="sl-chapter-pick" role="group" aria-label="Choose the chapter to ask about">
              <span>Asking about</span>
              {chapters.map((c) => (
                <button
                  key={c.job_id}
                  type="button"
                  className={`sl-pickbtn${c.job_id === jobId ? ' is-active' : ''}`}
                  aria-pressed={c.job_id === jobId}
                  disabled={phase !== 'idle'}
                  onClick={() => onSelectChapter(c.job_id)}
                >
                  {c.chapter_title || 'Untitled chapter'}
                </button>
              ))}
            </div>
          ) : null}

          <div className="sl-voice-body">
            <h2 id="sl-voice-h">{isLive ? (tutorJoined ? 'I’m listening — ask your question' : 'Connecting you to your tutor…') : 'What would you like to understand?'}</h2>
            <p>{isLive ? 'Speak naturally. A short silence ends the call.' : 'Ask a question about this chapter using your voice.'}</p>
            <span className={`sl-orb${isLive ? ' is-live' : ''}${isConnecting ? ' is-connecting' : ''}`} aria-hidden="true">
              <span><Icon name="mic" size={34} /></span>
            </span>
            {isLive || isConnecting ? (
              <button type="button" className="sd-btn sd-btn--outline" onClick={hangUp}>
                <Icon name="phone" size={18} /> {isConnecting ? 'Cancel' : 'End session'}
              </button>
            ) : (
              <button type="button" className="sd-btn sd-btn--amber sd-btn--lg" onClick={() => startCall()} disabled={!jobId}>
                Start voice session
              </button>
            )}
            <p className="sl-voice-langs"><Icon name="chat" size={18} /> Speaks English, Tamil and Tanglish</p>
          </div>

          {isLive && needsAudioUnlock ? (
            <div className="sl-audio-unlock" role="status">
              <span><Icon name="info" size={18} /> Your browser paused the tutor&apos;s audio.</span>
              <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={unlockAudio}>Enable audio</button>
            </div>
          ) : null}

          {callError ? (
            <SectionState
              tone="err"
              title={callError.title}
              action={callError.retry && phase === 'idle' ? (
                <button type="button" className="sd-btn sd-btn--outline sd-btn--sm" onClick={() => startCall(lastStart)}>
                  <Icon name="refresh" size={14} /> Retry
                </button>
              ) : null}
            >
              {callError.message}
            </SectionState>
          ) : null}

          <p className="sl-scope">
            <Icon name="info" size={20} />
            <span><b>Answers are based only on this chapter’s material.</b>The tutor cannot answer outside this document.</span>
          </p>
        </section>

        <section className="sl-card sl-transcript" aria-labelledby="sl-tr-h">
          <div className="sl-card-h">
            <h3 id="sl-tr-h" className="sl-inline"><Icon name="doc" size={18} /> Transcript{detail?.title ? <span className="sl-muted"> · {detail.title}</span> : null}</h3>
          </div>
          <div className="sl-chat" aria-live="polite">
            {detailLoading ? <SectionState title="Loading transcript…" /> : null}
            {!detailLoading && !turns.length ? (
              <p className="sl-dashed"><Icon name="doc" size={22} /> {isLive ? 'Your questions and answers appear here as they are saved.' : 'Your conversation will appear here once a session begins.'}</p>
            ) : null}
            {turns.map((turn) => (
              <div key={turn.turn_number || turn.created_at} className="sl-turn">
                <div className="sl-bubble sl-bubble--me">{turn.question || '—'}</div>
                <div className="sl-bubble sl-bubble--ai">
                  {turn.answer || '—'}
                  {turn.detected_language ? <small>{turn.detected_language}</small> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
