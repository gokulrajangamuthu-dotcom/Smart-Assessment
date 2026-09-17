// Supabase calls use Node's native fetch under the hood, which throws a bare
// "TypeError: fetch failed" when the network/DNS is unreachable. That raw
// message isn't useful to an end user, so translate it into something readable
// before it goes out in a res.status(500).json({ error }) response.
const NETWORK_ERROR_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'];

export function friendlyErrorMessage(err) {
  const isNetworkFailure =
    err?.message?.includes('fetch failed') || NETWORK_ERROR_CODES.includes(err?.cause?.code);

  if (isNetworkFailure) {
    return 'Could not reach the service. Please check your internet connection and try again.';
  }

  if (typeof err?.message === 'string') {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // Not JSON, continue with err.message
    }
  }

  return err?.message || 'An unexpected error occurred.';
}

