'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

/**
 * <video> for edu_video playback whose source survives URL expiry
 * (FRONTEND_CHANGES.md §6). `src` is the stable /edu_video/download/{id}
 * endpoint, which redirects to a presigned S3 URL valid for 1 hour. After
 * that, the browser's next range request hits the expired S3 URL (403) and
 * the player errors. On error we request the endpoint again (fresh URL),
 * seek back to where playback was and resume - at most MAX_REFRESHES times.
 */
const MAX_REFRESHES = 3;

function withBuster(src, n) {
  if (!src || !n) return src;
  return `${src}${src.includes('?') ? '&' : '?'}r=${n}`;
}

const RefreshingVideo = forwardRef(function RefreshingVideo({ src, onError, onLoadedMetadata, ...props }, ref) {
  const videoRef = useRef(null);
  const resume = useRef(null); // { time, playing }
  const [refreshes, setRefreshes] = useState(0);

  useImperativeHandle(ref, () => videoRef.current);
  useEffect(() => { setRefreshes(0); resume.current = null; }, [src]);

  const handleError = useCallback((e) => {
    const el = videoRef.current;
    if (el && refreshes < MAX_REFRESHES) {
      resume.current = { time: el.currentTime || 0, playing: !el.paused || el.autoplay };
      setRefreshes((n) => n + 1);
      return;
    }
    onError?.(e);
  }, [refreshes, onError]);

  const handleLoadedMetadata = useCallback((e) => {
    const el = videoRef.current;
    const r = resume.current;
    if (el && r) {
      resume.current = null;
      if (r.time > 0) el.currentTime = Math.min(r.time, Math.max((el.duration || r.time) - 0.5, 0));
      if (r.playing) el.play().catch(() => {});
    }
    onLoadedMetadata?.(e);
  }, [onLoadedMetadata]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={videoRef}
      src={withBuster(src, refreshes)}
      onError={handleError}
      onLoadedMetadata={handleLoadedMetadata}
      {...props}
      // Videos are watch-only (owner, 16 Oct 2026): no download in the player menu or right-click.
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
});

export default RefreshingVideo;
