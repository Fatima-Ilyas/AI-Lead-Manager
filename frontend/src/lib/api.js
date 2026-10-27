import axios from "axios";
import { clearToken, getToken, setToken } from "./auth.js";

const LOGIN_PATH = "/auth/login";

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (failure) => {
    // The server rejected our token, so drop it. A wrong password on the login
    // call is not a reason to sign out.
    if (failure.response?.status === 401 && failure.config?.url !== LOGIN_PATH)
      clearToken();
    return Promise.reject(failure);
  },
);

// 401: no valid token. 503: the server has no login configured. In both cases
// the answer is not "show sample data".
export function isAuthFailure(failure) {
  const status = failure?.response?.status;
  return status === 401 || status === 503;
}

export async function login(password) {
  const { data } = await api.post(LOGIN_PATH, { password });
  setToken(data.access_token);
}

export function loginErrorMessage(failure) {
  const status = failure?.response?.status;
  if (status === 401) return "That password isn’t right.";
  if (status === 422) return "Enter your password.";
  if (status === 503) return "Sign-in isn’t set up on the server yet.";
  if (!failure?.response)
    return "We couldn’t reach the server. Check your connection and try again.";
  return "Sign-in failed. Please try again.";
}
