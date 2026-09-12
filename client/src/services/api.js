import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly refresh cookie
  timeout: 30000,
});

// The access token lives in memory only (never localStorage) to limit XSS exposure.
let accessToken = null;
let onSessionExpired = () => {};
let onTokenRefreshed = () => {};

export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const getAccessToken = () => accessToken;
export const configureSession = ({ expired, refreshed }) => {
  if (expired) onSessionExpired = expired;
  if (refreshed) onTokenRefreshed = refreshed;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];
let refreshPromise = null;

/** Single-flight refresh: concurrent 401s wait for one refresh call. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true, timeout: 15000 })
      .then((res) => {
        const { accessToken: token, user } = res.data.data;
        setAccessToken(token);
        onTokenRefreshed({ token, user });
        return res.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) {
      error.isNetworkError = error.code !== 'ERR_CANCELED';
      return Promise.reject(error);
    }
    const isAuthCall = AUTH_ENDPOINTS.some((p) => config?.url?.startsWith(p));
    if (response.status === 401 && !isAuthCall && !config._retry) {
      config._retry = true;
      try {
        await refreshSession();
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch (refreshError) {
        setAccessToken(null);
        onSessionExpired();
        return Promise.reject(error);
      }
    }
    if (response.status === 403 && response.data?.code === 'ACCOUNT_BLOCKED') {
      setAccessToken(null);
      onSessionExpired('blocked');
    }
    return Promise.reject(error);
  }
);

/** Unwraps the { success, data, meta, message } envelope. */
export const unwrap = (promise) => promise.then((res) => res.data);
