const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const ACCESS_TOKEN_STORAGE_KEY = 'abes_tracker_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'abes_tracker_refresh_token';

let inMemoryAccessToken = null;
let refreshInFlight = null;
let unauthorizedHandler = null;

/**
 * Normalized API error preserving HTTP status, machine error code, and validation details.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const tokenStore = {
  getAccessToken() {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      const stored = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (stored) inMemoryAccessToken = stored;
      return stored;
    } catch {
      return null;
    }
  },
  setAccessToken(token) {
    inMemoryAccessToken = token || null;
    try {
      if (token) {
        window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
      } else {
        window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access restriction errors
    }
  },
  getRefreshToken() {
    try {
      return window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken(token) {
    try {
      if (token) {
        window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      } else {
        window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage access restriction errors
    }
  },
  setTokens(accessToken, refreshToken) {
    tokenStore.setAccessToken(accessToken);
    if (refreshToken !== undefined) {
      tokenStore.setRefreshToken(refreshToken);
    }
  },
  clear() {
    tokenStore.setAccessToken(null);
    tokenStore.setRefreshToken(null);
  }
};

export function registerUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * Deduplicates concurrent refresh token exchanges so rotating refresh tokens
 * are never replayed by parallel requests or React StrictMode double-mounts.
 */
export async function refreshSessionSingleFlight() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const storedRefreshToken = tokenStore.getRefreshToken();
  if (!storedRefreshToken) {
    return null;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data?.accessToken) {
        tokenStore.clear();
        return null;
      }

      tokenStore.setTokens(payload.data.accessToken, payload.data.refreshToken);
      return payload.data;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Core HTTP request helper with automatic Bearer injection and single-flight 401 refresh retry.
 */
export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    headers = {},
    skipAuth = false,
    _isRetry = false
  } = options;

  let url = `${API_BASE_URL}${path}`;
  if (query && typeof query === 'object') {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = { ...headers };
  if (body !== undefined && !isFormData && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && inMemoryAccessToken) {
    requestHeaders.Authorization = `Bearer ${inMemoryAccessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401 && !skipAuth && !_isRetry) {
    const refreshed = await refreshSessionSingleFlight();
    if (refreshed?.accessToken) {
      return apiRequest(path, { ...options, _isRetry: true });
    }

    tokenStore.clear();
    if (typeof unauthorizedHandler === 'function') {
      unauthorizedHandler();
    }
  }

  if (!response.ok || payload?.success === false) {
    const code = payload?.error?.code || `HTTP_${response.status}`;
    const message =
      payload?.error?.message ||
      payload?.message ||
      'An unexpected error occurred while communicating with the server.';
    const details = payload?.error?.details || null;
    throw new ApiError(response.status, code, message, details);
  }

  return payload;
}

/**
 * Downloads a private binary document with Authorization header and single-flight 401 refresh.
 */
export async function downloadProtectedFile(path, fallbackFilename = 'evidence', _isRetry = false) {
  const headers = {};
  if (inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && !_isRetry) {
    const refreshed = await refreshSessionSingleFlight();
    if (refreshed?.accessToken) {
      return downloadProtectedFile(path, fallbackFilename, true);
    }
    tokenStore.clear();
    if (typeof unauthorizedHandler === 'function') {
      unauthorizedHandler();
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      payload?.error?.code || `HTTP_${response.status}`,
      payload?.error?.message || 'Unable to download evidence document.'
    );
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
