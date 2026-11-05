/**
 * FastAPI 422 entries about a URL parameter (a bad id or filter in an address) are validator
 * text for developers, not for users. Entries about a submitted form stay readable.
 */
export function readableValidationParts(detail) {
  const parts = detail
    .filter((item) => !['path', 'query'].includes(item?.loc?.[0]))
    .map((item) => (typeof item === 'string' ? item : item?.msg || item?.message))
    .filter(Boolean);
  if (!parts.length && detail.length) return ['That link is not valid. Check the address and try again.'];
  return parts;
}

/**
 * Turn FastAPI / axios errors into calm, user-facing copy.
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
  if (!detail) return fallback;

  if (typeof detail === 'string') {
    if (detail === 'Not Found') return fallback;
    return detail;
  }

  if (Array.isArray(detail)) {
    const parts = readableValidationParts(detail);
    if (parts.length) return parts.join(' ');
  }

  if (typeof detail === 'object' && detail.msg) return detail.msg;

  return fallback;
}

/** Only credential failures should feed the client-side lockout counter. */
export function isCredentialFailure(err) {
  const status = err?.response?.status ?? err?.status;
  return status === 401 || status === 403;
}
