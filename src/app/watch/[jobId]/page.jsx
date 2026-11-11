'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import RefreshingVideo from '@/components/shared/RefreshingVideo';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';

/**
 * "Open in a new tab" target for a chapter video. The tab used to open the presigned S3 file itself,
 * where the browser's own player offers Download. Videos are watch-only (owner, 16 Oct 2026), so the
 * new tab plays through the same player as the in-page preview: no download in the menu, no right-click.
 * The API still decides who may watch (GET /edu_video/download/{job_id} checks the role and scope).
 */
function WatchVideo() {
  const { jobId } = useParams();
  const title = useSearchParams().get('title') || 'Chapter video';
  const id = Array.isArray(jobId) ? jobId[0] : jobId;
  return (
    <main className="wv-page">
      <h1 className="wv-title">{title}</h1>
      <div className="wv-stage">
        {id ? (
          <RefreshingVideo controls autoPlay src={eduVideoApi.getDownloadUrl(id)}>
            Your browser does not support embedded video playback.
          </RefreshingVideo>
        ) : null}
      </div>
    </main>
  );
}

export default function WatchVideoPage() {
  return (
    <Suspense fallback={<main className="wv-page" />}>
      <WatchVideo />
    </Suspense>
  );
}
