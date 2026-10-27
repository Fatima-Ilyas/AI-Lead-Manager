// What the workspace does when loading the lead list fails.
//
// A signed-in user never gets sample data in place of their real leads: a
// failure on the first load shows the "unavailable" state with a retry button.
// After the leads have loaded, a failed refresh keeps them on screen.
//
// Returns null when the request was cancelled (nothing to report), otherwise
// { mode, error } where mode is the workspace mode to be in afterwards.
export function loadFailureOutcome({ failure, wasLive, cancelled = false }) {
  if (cancelled) return null;

  const mode = wasLive ? "live" : "unavailable";
  const status = failure?.response?.status;

  // The API client has already dropped the token on a 401.
  if (status === 401)
    return { mode, error: "Your session has expired. Sign in again." };
  if (status === 503)
    return { mode, error: "Sign-in isn’t set up on the server yet." };

  // Timeout, network error, 5xx, or a response that isn't a lead list.
  if (wasLive)
    return {
      mode,
      error:
        "We couldn’t refresh your leads. Your last loaded information is still available.",
    };
  return {
    mode,
    error: "We couldn’t load your leads. Check your connection and try again.",
  };
}
