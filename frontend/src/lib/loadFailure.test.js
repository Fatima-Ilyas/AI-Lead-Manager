import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { loadFailureOutcome } from "./loadFailure.js";

const timeout = Object.assign(new Error("timeout of 10000ms exceeded"), {
  code: "ECONNABORTED",
});
const networkError = Object.assign(new Error("Network Error"), {
  code: "ERR_NETWORK",
});
const status = (code) =>
  Object.assign(new Error(`HTTP ${code}`), { response: { status: code } });
const notALeadList = new Error("Unexpected response");

const otherFailures = {
  timeout,
  "network error": networkError,
  500: status(500),
  502: status(502),
  504: status(504),
  404: status(404),
  "invalid response": notALeadList,
  "no error object": undefined,
};

test("any failure on the first load is the unavailable state with a message, never sample data", () => {
  for (const [name, failure] of Object.entries(otherFailures)) {
    const outcome = loadFailureOutcome({ failure, wasLive: false });

    assert.equal(outcome.mode, "unavailable", name);
    assert.match(outcome.error, /couldn’t load your leads/, name);
    assert.notEqual(outcome.mode, "sample", name);
  }
});

test("after the leads have loaded, a failed refresh keeps them on screen with the refresh error", () => {
  for (const [name, failure] of Object.entries(otherFailures)) {
    const outcome = loadFailureOutcome({ failure, wasLive: true });

    assert.equal(outcome.mode, "live", name);
    assert.match(outcome.error, /couldn’t refresh your leads/, name);
    assert.match(outcome.error, /still available/, name);
  }
});

test("a 401 reports the expired session on first load and after", () => {
  const first = loadFailureOutcome({ failure: status(401), wasLive: false });
  const later = loadFailureOutcome({ failure: status(401), wasLive: true });

  assert.deepEqual(first, {
    mode: "unavailable",
    error: "Your session has expired. Sign in again.",
  });
  assert.deepEqual(later, { mode: "live", error: first.error });
});

test("a 503 says sign-in is not set up, on first load and after", () => {
  const first = loadFailureOutcome({ failure: status(503), wasLive: false });
  const later = loadFailureOutcome({ failure: status(503), wasLive: true });

  assert.equal(first.mode, "unavailable");
  assert.equal(later.mode, "live");
  assert.match(first.error, /isn’t set up/);
  assert.equal(later.error, first.error);
});

test("a cancelled request reports nothing", () => {
  assert.equal(
    loadFailureOutcome({
      failure: new Error("canceled"),
      wasLive: false,
      cancelled: true,
    }),
    null,
  );
  assert.equal(
    loadFailureOutcome({
      failure: new Error("canceled"),
      wasLive: true,
      cancelled: true,
    }),
    null,
  );
});

test("the outcome only ever picks the unavailable or live mode", () => {
  const failures = [...Object.values(otherFailures), status(401), status(503)];
  for (const failure of failures)
    for (const wasLive of [false, true])
      assert.ok(
        ["unavailable", "live"].includes(
          loadFailureOutcome({ failure, wasLive }).mode,
        ),
      );
});

// The hook is React code that can't run here, so guard the wiring: it must use
// the function above and must not bring back the sample-data fallback.
test("useLeads uses loadFailureOutcome and has no sample fallback on load failure", () => {
  const source = readFileSync(
    new URL("../hooks/useLeads.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /loadFailureOutcome\(/);
  assert.doesNotMatch(source, /storedPreview/);
  assert.doesNotMatch(source, /setMode\("sample"\)/);
});
