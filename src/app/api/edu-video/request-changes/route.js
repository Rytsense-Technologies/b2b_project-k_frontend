import { NextResponse } from 'next/server';
import { upsertPendingChange } from '@/lib/eduVideoPendingStore';

/**
 * Temporary bridge until FastAPI ships POST /edu_video/jobs/{id}/request-changes.
 * Stores HOD/Faculty edited plans so College Admin can see them in-app.
 * Prefer the real FastAPI route when it exists (client tries that first).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const jobId = body?.job_id || body?.jobId;
    const plan = body?.plan;
    if (!jobId || !plan || typeof plan !== 'object') {
      return NextResponse.json(
        { detail: 'job_id and plan are required.' },
        { status: 422 },
      );
    }

    const entry = await upsertPendingChange({
      job_id: String(jobId),
      plan,
      note: typeof body?.note === 'string' ? body.note : '',
      chapter_title: body?.chapter_title || plan?.title || '',
      source_filename: body?.source_filename || '',
      department_name: body?.department_name || '',
      department_id: body?.department_id || null,
      status: 'DONE',
      sent_to_hod_at: body?.sent_to_hod_at || null,
      changes_requested_at: new Date().toISOString(),
      bridge: true,
    });

    return NextResponse.json({
      job_id: entry.job_id,
      changes_requested: true,
      bridge: true,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err?.message || 'Could not store pending changes.' },
      { status: 500 },
    );
  }
}
