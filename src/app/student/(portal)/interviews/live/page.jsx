'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Room, RoomEvent, Track } from 'livekit-client';
import toast from 'react-hot-toast';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { interviewApi } from '@/lib/api/interview';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import {
  clearLivekitSessionStorage,
  readLivekitSession,
} from '@/lib/livekitSession';
import { formatLivekitError, probeLivekitToken, LOCAL_LIVEKIT_WS } from '@/lib/livekitUrl';

const AGENT_WAIT_MS = 45000;

function avatarIdentity(sessionId) {
  if (!sessionId) return null;
  return `avatar-${String(sessionId).slice(0, 8)}`;
}

function isAvatarParticipant(participant, sessionId) {
  const id = participant?.identity || '';
  if (!id) return false;
  if (id.startsWith('avatar-')) return true;
  const expected = avatarIdentity(sessionId);
  return Boolean(expected && id === expected);
}

/** Voice interviewer worker — not the candidate and not the MuseTalk avatar. */
function isAgentParticipant(participant, sessionId) {
  const id = participant?.identity || '';
  if (!id) return false;
  if (isAvatarParticipant(participant, sessionId)) return false;
  return true;
}

export default function StudentInterviewLivePage() {
  const router = useRouter();
  const roomRef = useRef(null);
  const audioEls = useRef(new Map());
  const videoRef = useRef(null);
  const startedTalking = useRef(false);
  const endingRef = useRef(false);
  const agentTimer = useRef(null);

  const [session, setSession] = useState(null);
  const sessionIdRef = useRef(null);
  const [agentState, setAgentState] = useState('waiting'); // waiting | LISTENING | THINKING | TALKING
  const [transcript, setTranscript] = useState([]);
  const [connecting, setConnecting] = useState(true);
  const [connectError, setConnectError] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState(null);
  const [micOn, setMicOn] = useState(true);

  /** Agent already in the room (track/status/participant) — stop the join timeout. */
  const markAgentPresent = useCallback((nextState) => {
    startedTalking.current = true;
    clearTimeout(agentTimer.current);
    agentTimer.current = null;
    if (nextState) setAgentState(nextState);
  }, []);

  const goToReport = useCallback((sessionId) => {
    clearLivekitSessionStorage();
    router.replace(`/student/interviews?session=${encodeURIComponent(sessionId)}`);
  }, [router]);

  const safeAbort = useCallback(async (sessionId) => {
    if (!sessionId || startedTalking.current) return;
    try {
      await interviewApi.abortLivekitInterview(sessionId);
    } catch {
      /* 409 if already started — ignore */
    }
  }, []);

  const detachTracks = useCallback(() => {
    audioEls.current.forEach((el) => {
      try {
        el.remove();
      } catch {
        /* ignore */
      }
    });
    audioEls.current.clear();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const disconnectRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    clearTimeout(agentTimer.current);
    detachTracks();
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    }
  }, [detachTracks]);

  const endInterview = useCallback(async ({ aborted = false } = {}) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const sid = session?.sessionId || readLivekitSession()?.sessionId;
    if (aborted && sid) {
      await safeAbort(sid);
    }
    await disconnectRoom();
    if (sid) goToReport(sid);
    else router.replace('/student/interviews');
  }, [disconnectRoom, goToReport, router, safeAbort, session]);

  const attachTrack = useCallback((track, participant) => {
    if (
      track.kind === Track.Kind.Audio
      && isAgentParticipant(participant, sessionIdRef.current)
    ) {
      markAgentPresent();
    }
    if (track.kind === Track.Kind.Audio) {
      const el = track.attach();
      el.autoplay = true;
      document.body.appendChild(el);
      audioEls.current.set(track.sid, el);
      return;
    }
    if (track.kind === Track.Kind.Video) {
      const expected = avatarIdentity(sessionIdRef.current);
      if (expected && participant?.identity === expected && videoRef.current) {
        track.attach(videoRef.current);
      }
    }
  }, [markAgentPresent]);

  const onData = useCallback(async (payload) => {
    let msg;
    try {
      msg = JSON.parse(new TextDecoder().decode(payload));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'status' && msg.state) {
      const state = String(msg.state);
      // Any agent status means the interviewer worker is live — never abort as "did not join".
      if (/^(LISTENING|THINKING|TALKING)$/i.test(state)) {
        markAgentPresent(state);
      } else {
        setAgentState(state);
      }
      return;
    }

    if (msg.type === 'transcript') {
      if (msg.role === 'agent') {
        markAgentPresent();
      }
      setTranscript((prev) => [
        ...prev,
        { role: msg.role === 'user' ? 'you' : 'interviewer', text: msg.text || '' },
      ]);
      return;
    }

    if (msg.type === 'interview_ending') {
      toast.success(
        msg.reason === 'time_limit'
          ? 'Time is up — wrapping up.'
          : msg.reason === 'no_answer'
            ? 'Interview ended after silence.'
            : 'Interview ending.',
      );
      await endInterview({ aborted: false });
      return;
    }

    if (msg.type === 'avatar_unavailable') {
      setAvatarPrompt({
        timeoutSeconds: Number(msg.timeout_seconds) || 45,
      });
    }
  }, [endInterview, markAgentPresent]);

  const replyAvatarFallback = async (choice) => {
    const room = roomRef.current;
    setAvatarPrompt(null);
    if (!room) return;
    try {
      const data = new TextEncoder().encode(
        JSON.stringify({ type: 'avatar_fallback_choice', choice }),
      );
      await room.localParticipant.publishData(data, { reliable: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send your choice.'));
    }
    if (choice === 'no') {
      toast('Interview cancelled — video interviewer was unavailable.');
      await endInterview({ aborted: false });
    }
  };

  useEffect(() => {
    const stored = readLivekitSession();
    if (!stored?.sessionId || !stored?.token || !stored?.url) {
      setConnecting(false);
      setConnectError('No live interview session found. Start again from Interviews.');
      return undefined;
    }
    setSession(stored);
    sessionIdRef.current = stored.sessionId;

    let cancelled = false;
    let connectFailed = false;
    const room = new Room();
    roomRef.current = room;

    const onTrackSubscribed = (track, _pub, participant) => {
      attachTrack(track, participant);
    };
    const onTrackUnsubscribed = (track) => {
      const el = audioEls.current.get(track.sid);
      if (el) {
        track.detach(el);
        el.remove();
        audioEls.current.delete(track.sid);
      }
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.detach(videoRef.current);
      }
    };
    const onParticipantConnected = (participant) => {
      if (isAgentParticipant(participant, stored.sessionId)) {
        markAgentPresent();
      }
    };
    const onDisconnected = () => {
      // Connect failures already show an on-page error — do not bounce to a
      // "no report" modal for a room that never joined.
      if (endingRef.current || cancelled || connectFailed) return;
      if (!startedTalking.current) {
        endingRef.current = true;
        clearLivekitSessionStorage();
        safeAbort(stored.sessionId).finally(() => {
          router.replace('/student/interviews');
        });
        return;
      }
      endingRef.current = true;
      clearLivekitSessionStorage();
      router.replace(`/student/interviews?session=${encodeURIComponent(stored.sessionId)}`);
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.Disconnected, onDisconnected);

    (async () => {
      try {
        // Always prefer the normalized local URL when on localhost.
        const connectUrl = stored.url || LOCAL_LIVEKIT_WS;
        const probe = await probeLivekitToken(connectUrl, stored.token);
        // Soft probe: network/CORS failures should not block room.connect —
        // livekit-client will validate again. Hard-fail only on signature 401.
        if (!probe.ok && probe.status === 401) {
          throw new Error(probe.detail || 'LiveKit token validation failed.');
        }
        if (!probe.ok && probe.status && probe.status !== 400) {
          console.warn('[livekit] preflight validate', probe);
        }
        await room.connect(connectUrl, stored.token);
        if (cancelled) return;
        setConnecting(false);
        setAgentState('waiting');

        // Agent is often already in the room (dispatched at /start) before this
        // page connects — greeting transcripts may have already been sent.
        room.remoteParticipants.forEach((p) => {
          if (isAgentParticipant(p, stored.sessionId)) markAgentPresent();
          p.trackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track) attachTrack(pub.track, p);
          });
        });

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setMicOn(true);
        } catch (micErr) {
          setMicOn(false);
          toast.error(
            formatLivekitError(micErr, connectUrl).includes('Microphone')
              ? formatLivekitError(micErr, connectUrl)
              : 'Microphone could not be enabled. Use Mute mic after allowing access.',
          );
        }
        // Only wait for the interviewer if they are not already in the room.
        // Greeting data packets are often published before this page connects.
        if (!startedTalking.current) {
          agentTimer.current = setTimeout(async () => {
            if (startedTalking.current || endingRef.current) return;
            toast.error('The interviewer did not join in time. Please try again.');
            await endInterview({ aborted: true });
          }, AGENT_WAIT_MS);
        }
      } catch (err) {
        if (cancelled) return;
        connectFailed = true;
        endingRef.current = true;
        setConnecting(false);
        setConnectError(formatLivekitError(err, stored.url || LOCAL_LIVEKIT_WS));
        await safeAbort(stored.sessionId);
        clearLivekitSessionStorage();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(agentTimer.current);
      agentTimer.current = null;
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.Disconnected, onDisconnected);
      detachTracks();
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // Connect once on mount for the stored session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change microphone.'));
    }
  };

  const onUserEnd = async () => {
    const ok = window.confirm(
      startedTalking.current
        ? 'End this interview now? Your answers so far will still be scored.'
        : 'Leave before the interviewer starts? This attempt will be cancelled.',
    );
    if (!ok) return;
    await endInterview({ aborted: !startedTalking.current });
  };

  const personaName = session?.persona?.name || 'your interviewer';
  const stateLabel = {
    waiting: 'Waiting for interviewer…',
    LISTENING: 'Listening',
    THINKING: 'Thinking…',
    TALKING: 'Speaking',
  }[agentState] || agentState;

  if (connectError) {
    return (
      <div className="animate-fade-in">
        <div className="notice err">
          <div>
            <b>Could not start the live interview</b>
            {connectError}
          </div>
        </div>
        <QuirriBtn type="button" variant="primary" onClick={() => router.replace('/student/interviews')}>
          Back to Interviews
        </QuirriBtn>
      </div>
    );
  }

  return (
    <div className="animate-fade-in si-live">
      <div className="section-head">
        <div>
          <div className="t">{session?.position || 'Live interview'}</div>
          <div className="d">
            {session?.mode === 'full' ? 'Full interview' : 'Mock interview'}
            {' · '}
            with {personaName}
          </div>
        </div>
        <div className="si-live-actions">
          <QuirriBtn type="button" variant="ghost" onClick={toggleMic} disabled={connecting}>
            {micOn ? 'Mute mic' : 'Unmute mic'}
          </QuirriBtn>
          <QuirriBtn type="button" variant="primary" onClick={onUserEnd} disabled={connecting}>
            End interview
          </QuirriBtn>
        </div>
      </div>

      {connecting ? (
        <div className="notice info">
          <div>
            <b>Connecting</b>
            Joining the interview room…
          </div>
        </div>
      ) : null}

      <div className="si-live-grid">
        <div className="card si-live-stage">
          <video
            ref={videoRef}
            className="si-live-video"
            autoPlay
            playsInline
            muted={false}
          />
          {!connecting ? (
            <div className="si-live-status" aria-live="polite">
              {stateLabel}
            </div>
          ) : null}
        </div>

        <div className="card si-live-transcript">
          <div className="card-h"><h3>Live transcript</h3></div>
          {!transcript.length ? (
            <div className="notice info" style={{ margin: 16 }}>
              <div>
                <b>Captions will appear here</b>
                The interviewer greets you first — wait for them to speak.
              </div>
            </div>
          ) : (
            <ul className="si-transcript-list">
              {transcript.map((line, i) => (
                <li key={`${i}-${line.role}`} className={`si-transcript-line is-${line.role}`}>
                  <span className="si-transcript-who">
                    {line.role === 'you' ? 'You' : personaName}
                  </span>
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <QuirriModal
        open={Boolean(avatarPrompt)}
        onClose={() => replyAvatarFallback('no')}
        title="Video interviewer unavailable"
        crumb="Full interview"
        footer={(
          <>
            <QuirriBtn type="button" variant="ghost" onClick={() => replyAvatarFallback('no')}>
              Cancel interview
            </QuirriBtn>
            <QuirriBtn type="button" variant="primary" onClick={() => replyAvatarFallback('yes')}>
              Continue with voice only
            </QuirriBtn>
          </>
        )}
      >
        <p style={{ margin: 0, textAlign: 'left', lineHeight: 1.5 }}>
          The video avatar could not start. Continue with voice only, or cancel this interview.
          {avatarPrompt?.timeoutSeconds
            ? ` If you do not choose within about ${avatarPrompt.timeoutSeconds}s, the interview will cancel.`
            : null}
        </p>
      </QuirriModal>
    </div>
  );
}
