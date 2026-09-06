// Timeouts and network failures (backend unreachable) don't carry an
// err.response, so every page's existing `err.response?.data?.error` read
// would fall through to a generic "failed" message. Normalize those into
// the same shape so pages don't need special-casing.
export function normalizeError(error) {
  if (!error.response) {
    error.response = {
      data: {
        error:
          error.code === 'ECONNABORTED'
            ? 'The server took too long to respond. Please check your connection and try again.'
            : 'Could not reach the server. Please check your connection and try again.',
      },
    };
  }
  return Promise.reject(error);
}
