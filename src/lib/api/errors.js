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
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean);
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
