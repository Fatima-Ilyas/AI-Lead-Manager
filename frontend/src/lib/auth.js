// The admin token lives in memory and in sessionStorage (gone when the tab
// closes). The server is the only judge of a token. The expiry check here
// just avoids sending requests that are certain to fail.
const STORAGE_KEY = "lead-manager-admin-token-v1";

let memoryToken = null;
const listeners = new Set();

function readStored() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null; /* Browser storage may be unavailable. Memory still works. */
  }
}

function notify() {
  for (const listener of [...listeners]) listener();
}

// Milliseconds since the epoch, or null if the token has no readable `exp`.
// Does not check the signature.
export function tokenExpiry(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isExpired(token, now = Date.now()) {
  const expiry = tokenExpiry(token);
  return expiry === null || expiry <= now;
}

// Pure read, safe to call while rendering. Returns null for an expired token
// but leaves clearing it to clearToken().
export function getToken() {
  const token = memoryToken ?? readStored();
  if (!token || isExpired(token)) return null;
  memoryToken = token;
  return token;
}

export function setToken(token) {
  memoryToken = token;
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* Keep the session in memory without storage. */
  }
  notify();
}

export function clearToken() {
  const hadToken = memoryToken !== null || readStored() !== null;
  memoryToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing stored to remove. */
  }
  if (hadToken) notify();
}

// Storage keys that hold lead details typed by the signed-in user.
const SESSION_DATA_KEYS = ["lead-manager-draft-v1"];

// What the "Sign out" button calls. Drops the token and the unsaved lead-form
// draft. The in-memory lead list goes when the gate in App.jsx unmounts the
// workspace, which it does because the token is gone.
export function signOut() {
  for (const key of SESSION_DATA_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Nothing stored to remove. */
    }
  }
  clearToken();
}

// For useSyncExternalStore(subscribe, getToken). Returns the unsubscribe function.
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
