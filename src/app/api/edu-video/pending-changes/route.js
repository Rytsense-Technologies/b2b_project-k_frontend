import { NextResponse } from 'next/server';
import { readPendingStore, removePendingChange } from '@/lib/eduVideoPendingStore';

/** List HOD→CA pending slide edits (temporary Next bridge). */
export async function GET() {
  try {
    const store = await readPendingStore();
    return NextResponse.json({
      items: store.items,
      total: store.items.length,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err?.message || 'Could not load pending changes.' },
      { status: 500 },
    );
  }
}

/** Clear one pending item after CA regenerates / dismisses. */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    if (!jobId) {
      return NextResponse.json({ detail: 'job_id is required.' }, { status: 422 });
    }
    const result = await removePendingChange(jobId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { detail: err?.message || 'Could not clear pending change.' },
      { status: 500 },
    );
  }
}
