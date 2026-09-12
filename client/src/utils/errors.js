/** Friendly message for any error thrown by the API layer. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.code === 'ERR_CANCELED') return '';
  if (error.isNetworkError || error.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  return error.response?.data?.message || error.message || fallback;
}

export const getFieldErrors = (error) => error?.response?.data?.errors || [];

/**
 * Maps server-side validation errors onto react-hook-form fields.
 * Returns true when at least one field error was applied.
 */
export function applyServerErrors(error, setError) {
  const errors = getFieldErrors(error);
  let applied = false;
  for (const e of errors) {
    if (!e.field || ['body', 'query', 'params'].includes(e.field)) continue;
    setError(e.field, { type: 'server', message: e.message });
    applied = true;
  }
  return applied;
}
