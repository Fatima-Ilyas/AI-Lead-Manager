import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { api, isAuthFailure, login, loginErrorMessage } from "./api.js";
import { clearToken, getToken, setToken, subscribe } from "./auth.js";

function makeToken() {
  const part = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${part({ alg: "HS256" })}.${part({ sub: "admin", exp })}.signature`;
}

// Replaces the network: records requests, answers with the queued reply.
let requests;
let reply;

beforeEach(() => {
  globalThis.sessionStorage = undefined;
  clearToken();
  requests = [];
  reply = { status: 200, data: [] };
  api.defaults.adapter = async (config) => {
    requests.push(config);
    const response = {
      status: reply.status,
      statusText: "",
      headers: {},
      config,
      data: reply.data,
    };
    if (reply.status >= 400)
      throw new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
    return response;
  };
});

test("requests carry the bearer token once signed in, and nothing before", async () => {
  await api.get("/leads");
  assert.equal(requests[0].headers.Authorization, undefined);

  const token = makeToken();
  setToken(token);
  await api.get("/leads");
  assert.equal(requests[1].headers.Authorization, `Bearer ${token}`);
});

test("a 401 from the API signs the user out", async () => {
  setToken(makeToken());
  let signedOut = 0;
  subscribe(() => {
    if (getToken() === null) signedOut++;
  });
  reply = { status: 401, data: { detail: "Not authenticated" } };

  await assert.rejects(api.get("/leads"), (failure) => isAuthFailure(failure));

  assert.equal(getToken(), null);
  assert.equal(signedOut, 1);
});

test("a 503 or a 500 does not sign the user out", async () => {
  setToken(makeToken());
  for (const status of [503, 500]) {
    reply = { status, data: {} };
    await assert.rejects(api.get("/leads"));
  }

  assert.notEqual(getToken(), null);
});

test("a wrong password on the login call does not clear an existing token", async () => {
  const token = makeToken();
  setToken(token);
  reply = { status: 401, data: { detail: "Invalid credentials" } };

  await assert.rejects(login("wrong"));

  assert.equal(getToken(), token);
});

test("login posts the password and stores the returned token", async () => {
  const token = makeToken();
  reply = {
    status: 200,
    data: { access_token: token, token_type: "bearer", expires_in: 28800 },
  };

  await login("correct horse");

  assert.equal(requests[0].url, "/auth/login");
  assert.equal(requests[0].method, "post");
  assert.deepEqual(JSON.parse(requests[0].data), { password: "correct horse" });
  assert.equal(getToken(), token);
});

test("isAuthFailure matches only 401 and 503 responses", () => {
  const failure = (status) => ({ response: { status } });
  assert.equal(isAuthFailure(failure(401)), true);
  assert.equal(isAuthFailure(failure(503)), true);
  for (const value of [failure(200), failure(404), failure(500)])
    assert.equal(isAuthFailure(value), false);
  assert.equal(isAuthFailure(new Error("Network Error")), false);
  assert.equal(isAuthFailure(undefined), false);
});

test("login error messages tell the user what to do without leaking details", () => {
  const failure = (status) => ({ response: { status } });
  assert.match(loginErrorMessage(failure(401)), /isn’t right/);
  assert.match(loginErrorMessage(failure(422)), /Enter your password/);
  assert.match(loginErrorMessage(failure(503)), /isn’t set up/);
  assert.match(
    loginErrorMessage(new Error("Network Error")),
    /reach the server/,
  );
  assert.match(loginErrorMessage(failure(500)), /failed/);
});
