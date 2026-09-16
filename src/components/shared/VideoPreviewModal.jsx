'use client';

import QuirriModal from '@/components/superadmin/QuirriModal';

/**
 * Plays a finished edu_video job inline instead of only offering a bare
 * download link (GET /edu_video/download/{job_id} - see
 * CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md). A plain <a href> works
 * for downloading, but some browsers just save the file silently instead
 * of showing anything, which reads as "I can't view this" even though the
 * link itself was fine. The <video> tag hits the same authenticated
 * endpoint directly - browsers attach cookies to media requests the same
 * way they do for a top-level navigation, so no separate auth wiring is
 * needed here.
 */
export default function VideoPreviewModal({ open, onClose, title, src }) {
  return (
    <QuirriModal open={open} onClose={onClose} title={title || 'Video preview'} wide>
      {src ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            controls
            autoPlay
            style={{ width: '100%', maxHeight: '70vh', borderRadius: 8, background: '#000', display: 'block' }}
            src={src}
          >
            Your browser does not support embedded video playback.
          </video>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              Open in a new tab
            </a>
          </div>
        </>
      ) : null}
    </QuirriModal>
  );
}
