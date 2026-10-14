'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DisconnectReason, Room, RoomEvent, Track } from 'livekit-client';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { Icon, SectionState } from '@/components/student/ui';
import { interviewApi } from '@/lib/api/interview';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { DIFFICULTY_OPTIONS, WAITING_TIPS, experienceLabel } from '@/lib/constants/interview';
import {
  clearLivekitLifecycle,
  clearLivekitSessionStorage,
  consumeFreshStart,
  hasReachedLive,
  markReachedLive,
  readLivekitSession,
} from '@/lib/livekitSession';
import { formatLivekitError, probeLivekitToken, LOCAL_LIVEKIT_WS } from '@/lib/livekitUrl';
import '@/styles/student-interview.css';

/**
 * Student · Live interview (Interview flow guide + owner mock-ups, Oct 2026)
 *
 *   connect immediately → WAITING ROOM (interviewer audio muted, abort = refund)
 *        │  latch once:
 *        │   mock / voice-only full → interviewer ready (status, agent audio or agent speech)
 *        │   premium full (record_session) → avatar video subscribed, or student accepts voice-only
 *        ▼
 *   INTERVIEW ROOM (unmute, mark reached-live, credit spent — no abort) → report
 */

const SETUP_PATH = '/student/interviews';
const WAIT_MS_VOICE = 45000;
const WAIT_MS_AVATAR = 120000;
const AVATAR_BACKUP_MS = 8000;

const isAvatarIdentity = (id = '') => id.startsWith('avatar-');
const reportPath = (sid) => `/student/reports/view?session=${encodeURIComponent(sid)}`;
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function Wave({ active }) {
  return (
    <span className={`siv-wave${active ? ' is-on' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}
    </span>
  );
}

function useTicker(running) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const t0 = Date.now();
    setS(0);
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);
  return s;
}

export default function StudentInterviewLivePage() {
  const router = useRouter();
  const roomRef = useRef(null);
  const audioEls = useRef(new Map());
  const avatarVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const sessionRef = useRef(null);
  const enteredRef = useRef(false);
  const endingRef = useRef(false);
  const avatarVideoRef2 = useRef(false);
  const avatarTrackRef = useRef(null);
  const voiceFallbackRef = useRef(false);
  const waitTimer = useRef(null);
  const backupTimer = useRef(null);

  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('connecting'); // connecting | waiting | live | error
  const [connectError, setConnectError] = useState('');
  const [agentHere, setAgentHere] = useState(false);
  const [agentState, setAgentState] = useState('WAITING_FOR_INTERVIEWER');
  const [hasAvatarVideo, setHasAvatarVideo] = useState(false);
  const [youSpeaking, setYouSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camTick, setCamTick] = useState(0);
  const [avatarPrompt, setAvatarPrompt] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'leave' | 'end'
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState(0);

  const waitSecs = useTicker(phase === 'waiting');
  const liveSecs = useTicker(phase === 'live');
  const expectsAvatar = session?.mode === 'full' && session?.recordSession === true;

  /* ------------------------------------------------------------ helpers */
  const detachAll = useCallback(() => {
    audioEls.current.forEach((el) => { try { el.remove(); } catch { /* ignore */ } });
    audioEls.current.clear();
    if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;
  }, []);

  const disconnect = useCallback(async () => {
    clearTimeout(waitTimer.current);
    clearTimeout(backupTimer.current);
    const room = roomRef.current;
    roomRef.current = null;
    detachAll();
    if (room) { try { await room.disconnect(); } catch { /* ignore */ } }
  }, [detachAll]);

  /** Refund path — only ever called while still in the waiting room. */
  const abortSession = useCallback(async (sid) => {
    if (!sid || enteredRef.current) return { refunded: false };
    try {
      const res = await interviewApi.abortLivekitInterview(sid);
      return { refunded: Boolean(res?.quota_reversed ?? true) };
    } catch (err) {
      const st = err?.response?.status;
      if (st === 409 || st === 404) return { refunded: false };
      if (st === 503) toast.error('Could not cancel the session right now. Your college admin can restore the credit.');
      return { refunded: false };
    }
  }, []);

  const goReport = useCallback((sid) => {
    clearLivekitSessionStorage();
    clearLivekitLifecycle();
    router.replace(sid ? reportPath(sid) : SETUP_PATH);
  }, [router]);

  const finishToReport = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    const sid = sessionRef.current?.sessionId;
    await disconnect();
    goReport(sid);
  }, [disconnect, goReport]);

  const leaveWaitingRoom = useCallback(async (message) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const sid = sessionRef.current?.sessionId;
    const { refunded } = await abortSession(sid);
    await disconnect();
    clearLivekitSessionStorage();
    clearLivekitLifecycle();
    if (message) toast(message);
    else if (refunded) toast.success('You left the waiting room. This interview was not counted.');
    router.replace(SETUP_PATH);
  }, [abortSession, disconnect, router]);

  /** Latch: waiting room → interview room (once). */
  const enterRoom = useCallback(() => {
    if (enteredRef.current || endingRef.current) return;
    enteredRef.current = true;
    clearTimeout(waitTimer.current);
    clearTimeout(backupTimer.current);
    audioEls.current.forEach((el) => { el.muted = false; });
    if (sessionRef.current?.sessionId) markReachedLive(sessionRef.current.sessionId);
    setPhase('live');
  }, []);

  /** Decide whether the room is ready for the candidate. */
  const evaluateReady = useCallback((signal) => {
    if (enteredRef.current) return;
    const s = sessionRef.current;
    const avatar = s?.mode === 'full' && s?.recordSession === true;
    if (!avatar) {
      if (['status', 'audio', 'speech'].includes(signal)) enterRoom();
      return;
    }
    if (avatarVideoRef2.current || voiceFallbackRef.current) {
      enterRoom();
      return;
    }
    /* Premium full speaking with no video — backup popup, never enter silently. */
    if ((signal === 'talking' || signal === 'speech') && !backupTimer.current) {
      backupTimer.current = setTimeout(() => {
        if (!enteredRef.current && !avatarVideoRef2.current) setAvatarPrompt({ timeoutSeconds: 45, backup: true });
      }, AVATAR_BACKUP_MS);
    }
  }, [enterRoom]);

  /* ------------------------------------------------------------ connect */
  useEffect(() => {
    const stored = readLivekitSession();
    if (!stored?.sessionId || !stored?.token || !stored?.url) {
      setPhase('error');
      setConnectError('No interview session found. Set up your interview again.');
      return undefined;
    }
    sessionRef.current = stored;
    setSession(stored);
    const fresh = consumeFreshStart(stored.sessionId);
    const alreadyLive = hasReachedLive(stored.sessionId);
    if (alreadyLive) enteredRef.current = true; // refresh after entering: this is the real interview

    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const onTrack = (track, _pub, participant) => {
      const pid = participant?.identity || '';
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        el.muted = !enteredRef.current; // interviewer voice stays muted in the waiting room
        document.body.appendChild(el);
        audioEls.current.set(track.sid, el);
        if (!isAvatarIdentity(pid)) { setAgentHere(true); evaluateReady('audio'); }
        return;
      }
      if (track.kind === Track.Kind.Video) {
        const s = sessionRef.current;
        if (s?.mode === 'full') {
          avatarTrackRef.current = track; // attached once the interview room renders
          if (avatarVideoRef.current) { track.attach(avatarVideoRef.current); avatarVideoRef.current.muted = true; }
          avatarVideoRef2.current = true;
          setHasAvatarVideo(true);
          setAvatarPrompt(null);
          evaluateReady('video');
        }
      }
    };
    const onUntrack = (track) => {
      const el = audioEls.current.get(track.sid);
      if (el) { track.detach(el); el.remove(); audioEls.current.delete(track.sid); }
    };
    const onParticipant = (p) => { if (!isAvatarIdentity(p?.identity)) setAgentHere(true); };
    const onSpeakers = (speakers) => setYouSpeaking(speakers.some((sp) => sp.isLocal || sp === room.localParticipant));
    const onData = (payload) => {
      let msg;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'status' && msg.state) {
        const st = String(msg.state).toUpperCase();
        setAgentState(st);
        if (st !== 'WAITING_FOR_INTERVIEWER') setAgentHere(true);
        if (/^(LISTENING|THINKING|TALKING)$/.test(st)) evaluateReady(st === 'TALKING' ? 'talking' : 'status');
        return;
      }
      if (msg.type === 'transcript') {
        const who = msg.role === 'user' ? 'you' : 'interviewer';
        if (who === 'interviewer') { setAgentHere(true); evaluateReady('speech'); }
        const text = String(msg.text || '').trim();
        if (!text) return;
        // STT sends one final segment per phrase — keep one bubble per answer.
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (who === 'you' && last?.who === 'you') {
            return [...prev.slice(0, -1), { ...last, text: `${last.text} ${text}`, at: Date.now() }];
          }
          return [...prev, { who, text, at: Date.now() }];
        });
        return;
      }
      if (msg.type === 'interview_ending') {
        toast(msg.reason === 'time_limit' ? 'Time is up — wrapping up your interview.' : 'Your interview is complete.');
        setTimeout(() => { finishToReport(); }, 1500);
        return;
      }
      if (msg.type === 'avatar_unavailable') {
        setAvatarPrompt({ timeoutSeconds: Number(msg.timeout_seconds) || 45 });
      }
    };
    const onDisconnected = (reason) => {
      if (endingRef.current || cancelled) return;
      if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
        // Another tab / connection took over this session — never abort it from here.
        endingRef.current = true;
        setPhase('error');
        setConnectError('This interview is open in another tab or window. Continue there.');
        return;
      }
      if (enteredRef.current) { endingRef.current = true; goReport(stored.sessionId); return; }
      leaveWaitingRoom('The connection closed before your interview began. It was not counted.');
    };

    room.on(RoomEvent.TrackSubscribed, onTrack);
    room.on(RoomEvent.TrackUnsubscribed, onUntrack);
    room.on(RoomEvent.ParticipantConnected, onParticipant);
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.Disconnected, onDisconnected);

    (async () => {
      try {
        const url = stored.url || LOCAL_LIVEKIT_WS;
        const probe = await probeLivekitToken(url, stored.token);
        // A cleaned-up effect (React dev double-mount, fast navigation) must never
        // connect: the same identity joining twice makes LiveKit kick the live
        // connection (DUPLICATE_IDENTITY), which looked like a dropped waiting
        // room and aborted the session.
        if (cancelled) return;
        if (!probe.ok && probe.status === 401) throw new Error(probe.detail || 'LiveKit token validation failed.');
        await room.connect(url, stored.token);
        if (cancelled) { room.disconnect().catch(() => {}); return; }
        setPhase(enteredRef.current ? 'live' : 'waiting');

        try { await room.localParticipant.setMicrophoneEnabled(true); setMicOn(true); } catch { setMicOn(false); toast.error('Microphone could not be enabled. Check browser permissions.'); }
        try { await room.localParticipant.setCameraEnabled(true); setCamOn(true); setCamTick((t) => t + 1); } catch { setCamOn(false); }

        room.remoteParticipants.forEach((p) => {
          if (!isAvatarIdentity(p.identity)) setAgentHere(true);
          p.trackPublications.forEach((pub) => { if (pub.isSubscribed && pub.track) onTrack(pub.track, pub, p); });
        });

        if (!enteredRef.current) {
          const s = sessionRef.current;
          const wait = s?.mode === 'full' && s?.recordSession === true ? WAIT_MS_AVATAR : WAIT_MS_VOICE;
          waitTimer.current = setTimeout(() => {
            if (!enteredRef.current && !endingRef.current) leaveWaitingRoom('Your interviewer could not join in time. This interview was not counted — please try again.');
          }, wait);
        }
      } catch (err) {
        if (cancelled) return;
        endingRef.current = true;
        if (alreadyLive) { // credit already used — open the report instead of refunding
          toast.error('Could not reconnect. Opening your report.');
          goReport(stored.sessionId);
          return;
        }
        await abortSession(stored.sessionId);
        clearLivekitSessionStorage();
        clearLivekitLifecycle();
        setPhase('error');
        setConnectError(`${formatLivekitError(err, stored.url || LOCAL_LIVEKIT_WS)}${fresh ? '' : ' (reconnect after refresh failed)'}`);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(waitTimer.current);
      clearTimeout(backupTimer.current);
      room.off(RoomEvent.TrackSubscribed, onTrack);
      room.off(RoomEvent.TrackUnsubscribed, onUntrack);
      room.off(RoomEvent.ParticipantConnected, onParticipant);
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.Disconnected, onDisconnected);
      detachAll();
      room.disconnect().catch(() => {});
      roomRef.current = null;
    };
    // Connect once for the stored session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Attach the local camera to whichever pane is showing. */
  useEffect(() => {
    const room = roomRef.current;
    const el = localVideoRef.current;
    if (!room || !el) return;
    const pub = room.localParticipant?.getTrackPublication?.(Track.Source.Camera);
    if (pub?.track && camOn) pub.track.attach(el);
  }, [phase, camOn, camTick]);

  /* Attach the avatar video when the interview room renders. */
  useEffect(() => {
    if (phase !== 'live' || !avatarTrackRef.current || !avatarVideoRef.current) return;
    avatarTrackRef.current.attach(avatarVideoRef.current);
    avatarVideoRef.current.muted = true;
  }, [phase, hasAvatarVideo]);

  /* Rotate waiting-room tips. */
  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const id = setInterval(() => setTip((t) => (t + 1) % WAITING_TIPS.length), 7000);
    return () => clearInterval(id);
  }, [phase]);

  /* ------------------------------------------------------------ actions */
  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    try { await room.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(!micOn); } catch (err) { toast.error(apiErrorMessage(err, 'Could not change the microphone.')); }
  };
  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    try { await room.localParticipant.setCameraEnabled(!camOn); setCamOn(!camOn); setCamTick((t) => t + 1); } catch (err) { toast.error(apiErrorMessage(err, 'Could not change the camera.')); }
  };

  const replyAvatar = async (choice) => {
    const room = roomRef.current;
    setAvatarPrompt(null);
    try {
      await room?.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'avatar_fallback_choice', choice })), { reliable: true });
    } catch { /* agent also times out on its own */ }
    if (choice === 'accept') {
      voiceFallbackRef.current = true;
      enterRoom();
    } else {
      /* Agent cancels the session and reverses the quota itself — no abort call. */
      endingRef.current = true;
      await disconnect();
      clearLivekitSessionStorage();
      clearLivekitLifecycle();
      toast('Interview cancelled. It was not counted.');
      router.replace(SETUP_PATH);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    if (confirm === 'leave') await leaveWaitingRoom();
    else await finishToReport();
    setBusy(false);
    setConfirm(null);
  };

  /* ------------------------------------------------------------ view */
  const setup = session?.setup || {};
  const persona = session?.persona || {};
  const personaName = persona.name || 'Your interviewer';
  const personaRole = persona.role || 'Interviewer';
  const modeLabel = session?.mode === 'full' ? 'Full Interview' : 'Mock Interview';
  const chips = [
    setup.experience ? experienceLabel(setup.experience) : null,
    setup.difficulty ? `${DIFFICULTY_OPTIONS.find((o) => o.value === setup.difficulty)?.label || setup.difficulty} level` : null,
    session?.mode === 'full' ? (expectsAvatar ? 'Video interviewer' : 'Voice interviewer') : 'Voice interviewer',
  ].filter(Boolean);
  const talking = agentState === 'TALKING';
  const stateLabel = talking ? 'Speaking' : agentState === 'THINKING' ? 'Thinking' : agentState === 'LISTENING' ? 'Listening' : 'Joining';
  const caption = [...transcript].reverse().find((l) => l.who === 'interviewer')?.text || '';
  const initials = String(personaName).split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'AI';

  if (phase === 'error') {
    return (
      <div className="siv siv-hide-topbar">
        <SectionState
          tone="err"
          title="Could not open the interview room"
          action={<button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={() => router.replace(SETUP_PATH)}><Icon name="back" size={16} /> Back to setup</button>}
        >
          {connectError}
        </SectionState>
      </div>
    );
  }

  const header = (
    <header className="siv-room-h">
      <div>
        <h1>Interview Room</h1>
        <p>{modeLabel}: {session?.position || setup.position || 'Interview'}</p>
        <div className="siv-chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
      </div>
      <div className="siv-room-status">
        <span className={`siv-conn${phase === 'connecting' ? ' is-pending' : ''}`}><i aria-hidden="true" /> {phase === 'connecting' ? 'Connecting' : 'Connected'}</span>
        {phase === 'live' ? (
          <span className="siv-speaking" aria-live="polite">{stateLabel} {clock(liveSecs)} <Wave active={talking} /></span>
        ) : null}
      </div>
    </header>
  );

  return (
    <div className="siv siv-room siv-hide-topbar animate-fade-in">
      {header}

      {phase !== 'live' ? (
        /* ===================================================== WAITING ROOM */
        <>
          <div className="siv-wait">
            <section className="siv-card siv-wait-main" aria-labelledby="siv-w-h">
              <div className="siv-wait-top">
                <span className="siv-wait-pill"><i aria-hidden="true" /> Waiting room <b>{clock(waitSecs)}</b></span>
                <span className="siv-wait-spin" aria-live="polite">Please wait <span className="siv-spinner" aria-hidden="true" /></span>
              </div>
              <h2 id="siv-w-h">Preparing your session</h2>
              <p>{agentHere ? `${personaName} is getting ready.` : 'Connecting your interviewer.'} You will join automatically.</p>
              <div className="siv-cam">
                {camOn ? <video ref={localVideoRef} autoPlay muted playsInline aria-label="Your camera preview" /> : <span className="siv-cam-off"><Icon name="video" size={28} /> Camera is off</span>}
                <div className="siv-cam-ctrls">
                  <button type="button" className={`siv-round${micOn ? '' : ' is-off'}`} onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}><Icon name={micOn ? 'mic' : 'micOff'} size={18} /></button>
                  <button type="button" className={`siv-round${camOn ? ' is-on' : ' is-off'}`} onClick={toggleCam} aria-pressed={!camOn} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}><Icon name="video" size={18} /></button>
                </div>
              </div>
              <p className="siv-wait-note">We’ll automatically check your camera and microphone before you join.</p>
            </section>

            <section className="siv-check-col" aria-labelledby="siv-ac-h">
              <h2 id="siv-ac-h">Admission Checklist</h2>
              <p>We’ll get you in as soon as everything is ready.</p>
              <ol className="siv-admit">
                <li className={phase !== 'connecting' ? 'is-done' : 'is-active'}>
                  <span aria-hidden="true">{phase !== 'connecting' ? <Icon name="tick" size={14} /> : null}</span>
                  <div><b>Connected to room</b><small>Secure session link established</small></div>
                </li>
                <li className={agentHere ? 'is-done' : phase !== 'connecting' ? 'is-active' : ''}>
                  <span aria-hidden="true">{agentHere ? <Icon name="tick" size={14} /> : null}</span>
                  <div><b>Interviewer assigned</b><small>{agentHere ? `${personaName} is on your session` : 'Waiting for your interviewer to join'}</small></div>
                </li>
                <li className={agentHere ? 'is-active' : ''}>
                  <span aria-hidden="true" />
                  <div><b>Ready to begin</b><small>{expectsAvatar ? 'Interviewer video and audio warm-up in progress' : 'Interviewer and audio warm-up in progress'}</small></div>
                </li>
              </ol>
              <div className="siv-tip" aria-live="polite">
                <span className="siv-tip-tag"><Icon name="spark" size={12} /> While you wait</span>
                <b>{WAITING_TIPS[tip].title}</b>
                <p>{WAITING_TIPS[tip].body}</p>
                <span className="siv-tip-dots" aria-hidden="true">{WAITING_TIPS.map((t, i) => <i key={t.title} className={i === tip ? 'is-on' : ''} />)}</span>
              </div>
            </section>
          </div>

          <footer className="siv-card siv-room-foot">
            <span><span className="siv-i" aria-hidden="true">!</span> You will join the interview room automatically when your interviewer is ready.</span>
            <button type="button" className="siv-btn siv-btn--soft" onClick={() => setConfirm('leave')} disabled={phase === 'connecting'}>Leave</button>
          </footer>
        </>
      ) : (
        /* ===================================================== INTERVIEW ROOM */
        <>
          <div className="siv-panes">
            <section className="siv-pane siv-pane--ai" aria-label={`${personaName}, ${personaRole}`}>
              <div className="siv-pane-media">
                <video ref={avatarVideoRef} autoPlay playsInline muted className={hasAvatarVideo ? '' : 'is-hidden'} aria-hidden={!hasAvatarVideo} />
                {!hasAvatarVideo ? <span className={`siv-face${talking ? ' is-talking' : ''}`} aria-hidden="true">{initials}</span> : null}
              </div>
              <div className="siv-pane-bar">
                <span><b>{personaName}</b><small>{personaRole}</small></span>
                <span className="siv-pane-state">{stateLabel} <Wave active={talking} /></span>
              </div>
            </section>
            <section className="siv-pane siv-pane--you" aria-label="You, candidate">
              <div className="siv-pane-media">
                {camOn ? <video ref={localVideoRef} autoPlay muted playsInline /> : <span className="siv-cam-off"><Icon name="video" size={28} /> Camera is off</span>}
                <div className="siv-cam-ctrls">
                  <button type="button" className={`siv-round${micOn ? '' : ' is-off'}`} onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}><Icon name={micOn ? 'mic' : 'micOff'} size={18} /></button>
                  <button type="button" className={`siv-round${camOn ? ' is-on' : ' is-off'}`} onClick={toggleCam} aria-pressed={!camOn} aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}><Icon name="video" size={18} /></button>
                </div>
              </div>
              <div className="siv-pane-bar">
                <span><b>You</b><small>Candidate</small></span>
                <span className="siv-pane-state">{youSpeaking ? 'Speaking' : talking ? 'Listening' : micOn ? 'Your turn' : 'Muted'} <Wave active={youSpeaking} /></span>
              </div>
            </section>
          </div>

          <section className="siv-caption" aria-live="polite" aria-label="Live caption">
            <span className="siv-caption-tag"><Icon name="chat" size={14} /> Live Caption</span>
            <p>{caption || `${personaName} will greet you in a moment.`}</p>
          </section>

          <footer className="siv-card siv-room-foot siv-room-foot--live">
            <div>
              <label className="siv-switch">
                <input type="checkbox" role="switch" checked={showTranscript} onChange={(e) => setShowTranscript(e.target.checked)} />
                <span aria-hidden="true" />
                <b>Live Transcript</b>
              </label>
              <small>Captures and shows conversation in real time.</small>
            </div>
            <button type="button" className="siv-btn siv-btn--danger" onClick={() => setConfirm('end')}>
              <Icon name="phone" size={16} /> End Interview
            </button>
          </footer>

          {showTranscript ? (
            <section className="siv-card siv-transcript" aria-label="Transcript">
              {transcript.length ? (
                <ol>
                  {transcript.map((l, i) => (
                    <li key={`${l.at}-${i}`} className={`is-${l.who}`}>
                      <b>{l.who === 'you' ? 'You' : personaName}</b>
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="siv-muted">The conversation appears here as you talk.</p>}
            </section>
          ) : null}
        </>
      )}

      <QuirriModal
        open={confirm === 'leave'}
        onClose={() => !busy && setConfirm(null)}
        title="Leave the waiting room?"
        crumb={modeLabel}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirm(null)} disabled={busy}>Stay</button>
            <div className="right"><button type="button" className="sd-btn sd-btn--teal" onClick={onConfirm} disabled={busy}>{busy ? 'Leaving…' : 'Leave'}</button></div>
          </>
        )}
      >
        <p className="siv-modal-p">Your interview hasn’t started, so it won’t be counted. You can start again any time.</p>
      </QuirriModal>

      <QuirriModal
        open={confirm === 'end'}
        onClose={() => !busy && setConfirm(null)}
        title="End this interview?"
        crumb={modeLabel}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirm(null)} disabled={busy}>Keep going</button>
            <div className="right"><button type="button" className="sd-btn un-btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Ending…' : 'End interview'}</button></div>
          </>
        )}
      >
        <p className="siv-modal-p">This attempt counts. Your answers so far will be scored and your report will open next.</p>
      </QuirriModal>

      <QuirriModal
        open={Boolean(avatarPrompt)}
        onClose={() => replyAvatar('decline')}
        title="Video interviewer unavailable"
        crumb="Full interview"
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => replyAvatar('decline')}>Leave interview</button>
            <div className="right"><button type="button" className="sd-btn sd-btn--teal" onClick={() => replyAvatar('accept')}>Continue with voice only</button></div>
          </>
        )}
      >
        <p className="siv-modal-p">
          The video avatar could not start. You can continue with a voice-only interviewer, or leave — leaving now won’t count this interview.
          {avatarPrompt?.timeoutSeconds ? ` If you don’t choose within about ${avatarPrompt.timeoutSeconds} seconds, the interview is cancelled.` : ''}
        </p>
      </QuirriModal>
    </div>
  );
}
