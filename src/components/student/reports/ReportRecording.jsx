'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/student/ui';
import { reportsApi } from '@/lib/api/reports';

const AUDIO_POLL_MS = 5000;
const AUDIO_MAX_MS = 2 * 60 * 1000;

function mmss(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function AudioPlayer({ src, label }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
  }, [src]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  return (
    <div className="srp-player">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button type="button" className="srp-play" onClick={toggle} aria-label={playing ? `Pause ${label}` : `Play ${label}`}>
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
        )}
      </button>
      <div className="srp-player-track">
        <span className="srp-player-time">{mmss(time)} / {mmss(duration)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const el = ref.current;
            if (el) el.currentTime = Number(e.target.value);
          }}
          aria-label={`Seek ${label}`}
        />
      </div>
    </div>
  );
}

/** GET /reports/livekit/{id}/audio-summary — polls while the recap is generating. */
function useAudioSummary(sessionId) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    let timer = null;
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await reportsApi.getLivekitAudioSummary(sessionId);
        if (cancelled) return;
        setState(res || { status: 'none' });
        if (res?.status === 'generating' && Date.now() - started < AUDIO_MAX_MS) {
          timer = setTimeout(tick, AUDIO_POLL_MS);
        }
      } catch {
        if (!cancelled) setState({ status: 'failed' });
      }
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId]);
  return state;
}

function AudioSummary({ sessionId, isFull }) {
  const audio = useAudioSummary(sessionId);
  const [lang, setLang] = useState('en');
  const urls = { en: audio.url_en, ta: audio.url_ta };
  const ready = audio.status === 'ready' && (urls.en || urls.ta);
  const active = urls[lang] ? lang : (urls.en ? 'en' : 'ta');

  let body;
  if (audio.status === 'loading') {
    body = <div className="srp-empty"><b>Loading audio recap…</b></div>;
  } else if (ready) {
    body = (
      <>
        <div className="srp-seg" role="group" aria-label="Recap language">
          <button type="button" aria-pressed={active === 'en'} disabled={!urls.en} onClick={() => setLang('en')}>English</button>
          <button type="button" aria-pressed={active === 'ta'} disabled={!urls.ta} onClick={() => setLang('ta')}>Tamil</button>
        </div>
        <AudioPlayer src={urls[active]} label={active === 'ta' ? 'Tamil recap' : 'English recap'} />
      </>
    );
  } else if (audio.status === 'generating') {
    body = <div className="srp-empty"><b>Preparing your audio recap</b><span>This takes a minute or two after scoring. It will appear here.</span></div>;
  } else if (audio.status === 'failed') {
    body = <div className="srp-empty"><b>Audio recap unavailable</b><span>We could not create the spoken recap for this interview. Your written feedback is below.</span></div>;
  } else {
    body = (
      <div className="srp-empty">
        <b>No audio recap for this interview</b>
        <span>{isFull ? 'A spoken recap was not created for this interview.' : 'Spoken recaps are created for full interviews.'}</span>
      </div>
    );
  }

  return (
    <div className="srp-well">
      <h4>Audio summary</h4>
      <p>A short spoken recap of how your interview went — general feedback only.</p>
      {body}
    </div>
  );
}

function VideoPanel({ report, isFull }) {
  const status = report.recording_status || 'none';
  const url = report.recording_url;
  let body;
  if (status === 'ready' && url) {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    body = <video className="srp-video" src={url} controls preload="metadata" />;
  } else if (['starting', 'recording', 'processing', 'uploading'].includes(status)) {
    body = <div className="srp-empty"><b>Your recording is being processed</b><span>Check back in a few minutes.</span></div>;
  } else {
    body = (
      <div className="srp-empty">
        <b>No video for this interview</b>
        <span>{isFull ? 'This interview was not recorded.' : 'Video is recorded for full interviews only.'}</span>
      </div>
    );
  }
  return (
    <div className="srp-well">
      <h4>Video</h4>
      {body}
    </div>
  );
}

export default function ReportRecording({ report, sessionId, interviewType }) {
  const isFull = interviewType === 'full';
  return (
    <section className="srp-card" aria-labelledby="srp-rec-h">
      <div className="srp-card-h">
        <div>
          <h3 id="srp-rec-h">Interview recording</h3>
          <p>Watch and listen back to your interview.</p>
        </div>
      </div>
      <div className="srp-rec">
        <VideoPanel report={report} isFull={isFull} />
        <AudioSummary sessionId={sessionId} isFull={isFull} />
      </div>
    </section>
  );
}
