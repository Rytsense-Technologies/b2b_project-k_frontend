/**
 * University / college codes. A typed code that is already in use (case-insensitive) is refused
 * with 409, so the form shows it as a field error. A blank code gets the next UNI- / COL- code.
 */
/** The code the API saved: POST /colleges nests the record under `college`, POST /universities does not. */
export function savedCodeOf(response) {
  return response?.college?.code ?? response?.code ?? undefined;
}

export function createdMessage(noun, requested, saved) {
  const typed = String(requested || '').trim();
  const code = String(saved || '').trim();
  if (!typed && code) return `${noun} created as ${code}`;
  return `${noun} created`;
}

/** The API sentence for "this code is taken" (409), or null for any other error. */
export function codeTakenMessage(err) {
  if (err?.response?.status !== 409) return null;
  const detail = err.response.data?.detail;
  return typeof detail === 'string' && /code .+ already in use/i.test(detail) ? detail : null;
}
