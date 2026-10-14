import axios from "axios";

// Empty VITE_API_URL means "same origin": in development Vite proxies /api and
// /socket.io to the backend, and in production nginx does the same.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const API_BASE = `${API_ORIGIN}/api`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ORIGIN || undefined;

// The access token lives only in memory (never localStorage), so a script
// injected into the page can't read a long-lived credential. On reload we get
// a new one from the httpOnly refresh cookie.
let accessToken = null;
const tokenListeners = new Set();

export const tokenStore = {
  get: () => accessToken,
  set(token) {
    accessToken = token;
    tokenListeners.forEach((listener) => listener(token));
  },
  subscribe(listener) {
    tokenListeners.add(listener);
    return () => tokenListeners.delete(listener);
  },
};

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight = null;
let sessionExpiredHandler = () => {};

export const onSessionExpired = (handler) => {
  sessionExpiredHandler = handler;
};

/**
 * Gets a new access token using the refresh cookie. Concurrent callers share
 * one request, because the server rotates the cookie on every refresh.
 */
export const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        tokenStore.set(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const SESSION_ENDED = new Set(["TOKEN_REVOKED", "INVALID_TOKEN", "ACCOUNT_BLOCKED"]);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.code;

    // Access token expired: refresh once and replay the original request.
    if (response?.status === 401 && code === "TOKEN_EXPIRED" && config && !config._retried) {
      config._retried = true;
      try {
        await refreshAccessToken();
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch (refreshError) {
        tokenStore.set(null);
        sessionExpiredHandler(refreshError?.response?.data?.code);
        return Promise.reject(error);
      }
    }

    if (SESSION_ENDED.has(code) && accessToken) {
      tokenStore.set(null);
      sessionExpiredHandler(code);
    }
    return Promise.reject(error);
  }
);

/** A message that's safe to show the user for any API error. */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  const data = error?.response?.data;
  if (data?.code === "VALIDATION_ERROR" && data.details?.length) return data.details[0].message;
  if (data?.message) return data.message;
  if (error?.request && !error.response) return "Can't reach the server. Check your connection and try again.";
  return fallback;
};

/** `{ field: message }` from a VALIDATION_ERROR response, for inline form errors. */
export const getFieldErrors = (error) =>
  Object.fromEntries((error?.response?.data?.details || []).map((detail) => [detail.field, detail.message]));

export default api;
