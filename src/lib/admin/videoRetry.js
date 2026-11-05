/**
 * Retry on a failed chapter (POST /edu_video/jobs/{id}/regenerate) re-renders from the saved plan.
 * Slides exist only once planning succeeded, so a job that failed while planning has nothing to
 * re-render: the server answers 400 "No plan available" and only a new upload helps.
 */
export function canRetryFailedJob(job) {
  return job?.status === 'FAILED' && Number(job?.total_scenes) > 0;
}

/** The job is being made (a regenerate puts it back to RENDERING); only DONE and FAILED can be edited and regenerated. */
export function isRegenerating(job) {
  const status = job?.status;
  return Boolean(status) && status !== 'DONE' && status !== 'FAILED';
}
