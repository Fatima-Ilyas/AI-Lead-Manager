import { readFileSync } from "node:fs";
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearToken,
  getToken,
  isExpired,
  setToken,
  signOut,
  subscribe,
  tokenExpiry,
} from "./auth.js";

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// Same shape as the server's tokens. The signature is not checked client-side.
function makeToken(claims) {
  return `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.signature`;
}

const now = Date.UTC(2030, 0, 1);
const future = makeToken({ sub: "admin", exp: now / 1000 + 3600 });
const past = makeToken({ sub: "admin", exp: now / 1000 - 3600 });

function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

beforeEach(() => {
  globalThis.sessionStorage = fakeStorage();
  clearToken();
});

test("tokenExpiry reads exp in milliseconds and returns null for anything unreadable", () => {
  assert.equal(tokenExpiry(future), now + 3600 * 1000);
  for (const value of [
    "",
    "not-a-jwt",
    "a.b.c",
    makeToken({ sub: "admin" }),
    makeToken({ exp: "soon" }),
    null,
    undefined,
  ])
    assert.equal(tokenExpiry(value), null);
});

test("isExpired treats unreadable tokens and the exact expiry second as expired", () => {
  assert.equal(isExpired(future, now), false);
  assert.equal(isExpired(past, now), true);
  assert.equal(isExpired(makeToken({ exp: now / 1000 }), now), true);
  assert.equal(isExpired("garbage", now), true);
});

test("a stored token round-trips and survives a reload through sessionStorage", () => {
  const live = makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 });
  setToken(live);
  assert.equal(getToken(), live);

  clearToken();
  globalThis.sessionStorage.setItem("lead-manager-admin-token-v1", live);
  assert.equal(getToken(), live);
});

test("an expired token is not returned and is left for clearToken", () => {
  // Expired against the real clock, which getToken uses.
  const expired = makeToken({ sub: "admin", exp: Date.now() / 1000 - 60 });
  setToken(expired);

  assert.equal(getToken(), null);
  assert.equal(
    globalThis.sessionStorage.getItem("lead-manager-admin-token-v1"),
    expired,
  );
});

test("clearToken removes the token from memory and storage", () => {
  setToken(makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 }));
  clearToken();

  assert.equal(getToken(), null);
  assert.equal(globalThis.sessionStorage.data.size, 0);
});

test("listeners hear about sign-in and sign-out, and clearing nothing is silent", () => {
  let calls = 0;
  const unsubscribe = subscribe(() => calls++);

  clearToken();
  assert.equal(calls, 0);
  setToken(future);
  assert.equal(calls, 1);
  clearToken();
  assert.equal(calls, 2);
  clearToken();
  assert.equal(calls, 2);

  unsubscribe();
  setToken(future);
  assert.equal(calls, 2);
});

test("the session works in memory when browser storage throws", () => {
  const broken = () => {
    throw new Error("storage disabled");
  };
  globalThis.sessionStorage = {
    getItem: broken,
    setItem: broken,
    removeItem: broken,
  };
  const live = makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 });

  setToken(live);
  assert.equal(getToken(), live);
  clearToken();
  assert.equal(getToken(), null);
});

test("signOut drops the token and the saved lead-form draft, and tells listeners", () => {
  setToken(makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 }));
  globalThis.sessionStorage.setItem("lead-manager-draft-v1", '{"name":"Ada"}');
  globalThis.sessionStorage.setItem("unrelated-key", "kept");
  let calls = 0;
  const unsubscribe = subscribe(() => calls++);

  signOut();
  unsubscribe();

  assert.equal(getToken(), null);
  assert.equal(
    globalThis.sessionStorage.getItem("lead-manager-draft-v1"),
    null,
  );
  assert.equal(globalThis.sessionStorage.getItem("unrelated-key"), "kept");
  assert.equal(calls, 1);
});

test("signOut still signs out when browser storage throws", () => {
  setToken(makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 }));
  const broken = () => {
    throw new Error("storage disabled");
  };
  globalThis.sessionStorage = {
    getItem: broken,
    setItem: broken,
    removeItem: broken,
  };

  signOut();

  assert.equal(getToken(), null);
});

// There is no DOM test tooling in this project, so the part of sign-out that
// empties the in-memory lead list cannot be run here. It rests on one line in
// App.jsx: the workspace is keyed by the token, so React unmounts it (and every
// lead its hook holds) as soon as the token goes. This guards that line.
test("App.jsx mounts the workspace keyed by the token, so sign-out unmounts it", () => {
  const source = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");

  assert.match(source, /<Workspace key=\{token\} \/>/);
  assert.match(source, /useSyncExternalStore\(subscribe, getToken\)/);
});

test("the session works when sessionStorage does not exist at all", () => {
  delete globalThis.sessionStorage;
  const live = makeToken({ sub: "admin", exp: Date.now() / 1000 + 3600 });

  setToken(live);
  assert.equal(getToken(), live);
  clearToken();
  assert.equal(getToken(), null);
});
