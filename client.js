// Axios instance. Auth lives in HttpOnly cookies, so nothing is stored in
// localStorage/sessionStorage. Mutating requests send the CSRF token that the
// server exposes in a readable cookie.
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

function readCookie(name) {
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

http.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (MUTATING.has(method)) {
    const cookieName = config.url === '/auth/refresh' ? 'csrf_refresh_token' : 'csrf_access_token';
    const token = readCookie(cookieName);
    if (token) config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});

// ---- Single-flight refresh on 401 "token_expired" ----
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = http
      .post('/auth/refresh', null, { _skipRefresh: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_AUTH_URLS = ['/auth/login', '/auth/refresh', '/auth/me'];

function expireSession() {
  window.dispatchEvent(new Event('auth:expired'));
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    if (response.status === 403 && response.data?.error === 'password_change_required') {
      window.dispatchEvent(new Event('auth:password-required'));
    }

    if (response.status === 401 && !config._skipRefresh) {
      const code = response.data?.error;
      if (code === 'token_expired' && !config._retry) {
        config._retry = true;
        try {
          await refreshSession();
          return http(config); // retry the original request once
        } catch (refreshErr) {
          expireSession();
          return Promise.reject(error);
        }
      }
      if (!NO_AUTH_URLS.includes(config.url)) {
        expireSession();
      }
    }
    return Promise.reject(error);
  }
);

// Drop empty filter values so they are not sent as "?q=&role="
export function cleanParams(params) {
  if (!params) return undefined;
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === '' || v === null || v === undefined) return;
    out[k] = v;
  });
  return out;
}

export const api = {
  get: (url, params, config) =>
    http.get(url, { ...config, params: cleanParams(params) }).then((r) => r.data),
  post: (url, body, config) => http.post(url, body, config).then((r) => r.data),
  patch: (url, body, config) => http.patch(url, body, config).then((r) => r.data),
  put: (url, body, config) => http.put(url, body, config).then((r) => r.data),
  del: (url, config) => http.delete(url, config).then((r) => r.data),
};

// ---- Error helpers ----
export function errMsg(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err.response) return err.response.data?.message || fallback;
  if (err.request) return 'Cannot reach the server. Check your connection and try again.';
  return err.message || fallback;
}

export function errCode(err) {
  return err?.response?.data?.error || null;
}

export function errStatus(err) {
  return err?.response?.status || null;
}

export function errDetails(err) {
  const d = err?.response?.data?.details;
  return d && typeof d === 'object' ? d : null;
}

// Flatten server details into { "student.class_level": "message" }.
// Supports { field: [msgs] } and nested { student: { field: [msgs] } }.
export function flattenDetails(details, prefix = '') {
  const out = {};
  if (!details || typeof details !== 'object') return out;
  Object.entries(details).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      out[path] = value.map(String).join(' ');
    } else if (value && typeof value === 'object') {
      Object.assign(out, flattenDetails(value, path));
    } else if (value !== null && value !== undefined) {
      out[path] = String(value);
    }
  });
  return out;
}
