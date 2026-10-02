/**
 * Centralized HTTP client for the Theiavora Express API.
 *
 * Auth model:
 *  - The backend owns authentication. We send `credentials: "include"` so an
 *    httpOnly refresh/session cookie set by the API travels with every request.
 *  - If the backend also returns a short-lived access token, it is kept in
 *    memory only (never localStorage) and sent as a Bearer header.
 *  - On a 401 we attempt one single-flight refresh via POST /api/auth/refresh,
 *    then replay the request. If refresh fails, the registered
 *    `onAuthFailure` handler runs (AuthProvider clears state and redirects).
 */

import { env } from "@/lib/env";

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Skip the automatic refresh-and-retry on 401 (used by auth endpoints). */
  skipAuthRefresh?: boolean;
}

export interface ApiEnvelope {
  data: unknown;
  meta: unknown;
}

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: FieldErrors;
  readonly retryAfterSeconds?: number;

  constructor(init: {
    status: number;
    message: string;
    code?: string;
    fieldErrors?: FieldErrors;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 422 || this.status === 400;
  }
  get isRateLimited() {
    return this.status === 429;
  }
  get isServerError() {
    return this.status >= 500;
  }
  get isNetworkError() {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** User-facing message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (isApiError(error)) {
    if (error.isNetworkError) return "Unable to reach the server. Check your connection.";
    if (error.isForbidden) return "You don't have permission to do that.";
    if (error.isNotFound) return error.message || "The requested resource was not found.";
    if (error.isRateLimited) {
      return error.retryAfterSeconds
        ? `Too many requests. Try again in ${error.retryAfterSeconds}s.`
        : "Too many requests. Please slow down and try again.";
    }
    if (error.isServerError) return "The server ran into a problem. Please try again.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// In-memory token store
// ---------------------------------------------------------------------------

let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildUrl(path: string, params?: QueryParams): string {
  const base = env.apiUrl.replace(/\/+$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Accepts either `{ data, meta }`-style envelopes (with optional `success` /
 * `message`) or a bare payload, and returns a consistent `{ data, meta }`.
 */
export function unwrapEnvelope(body: unknown): ApiEnvelope {
  if (isRecord(body) && "data" in body) {
    const envelopeKeys = new Set(["data", "meta", "success", "message", "pagination", "status"]);
    const looksLikeEnvelope = Object.keys(body).every((k) => envelopeKeys.has(k));
    if (looksLikeEnvelope) {
      return { data: body.data, meta: body.meta ?? body.pagination ?? null };
    }
  }
  return { data: body, meta: null };
}

function extractFieldErrors(body: Record<string, unknown>): FieldErrors {
  const source = body.errors ?? (isRecord(body.error) ? body.error.details : undefined) ?? body.details;
  const result: FieldErrors = {};
  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!isRecord(entry)) continue;
      const rawPath = entry.path ?? entry.field ?? entry.param;
      const path = Array.isArray(rawPath) ? rawPath.join(".") : typeof rawPath === "string" ? rawPath : null;
      const message = typeof entry.message === "string" ? entry.message : typeof entry.msg === "string" ? entry.msg : null;
      if (path && message && !result[path]) result[path] = message;
    }
  } else if (isRecord(source)) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "string") result[key] = value;
      else if (Array.isArray(value) && typeof value[0] === "string") result[key] = value[0];
    }
  }
  return result;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error body; fall through with defaults.
  }
  const record = isRecord(body) ? body : {};
  const errorObj = isRecord(record.error) ? record.error : null;
  const message =
    (typeof record.message === "string" && record.message) ||
    (errorObj && typeof errorObj.message === "string" && errorObj.message) ||
    (typeof record.error === "string" && record.error) ||
    defaultMessageForStatus(response.status);
  const code =
    (typeof record.code === "string" && record.code) ||
    (errorObj && typeof errorObj.code === "string" && errorObj.code) ||
    undefined;
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) || undefined : undefined;
  return new ApiError({
    status: response.status,
    message,
    code,
    fieldErrors: extractFieldErrors(record),
    retryAfterSeconds,
  });
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to access this.";
    case 404:
      return "Not found.";
    case 422:
      return "Please correct the highlighted fields.";
    case 429:
      return "Too many requests.";
    default:
      return status >= 500 ? "Server error." : "Request failed.";
  }
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

/** Pulls an access token out of common auth response shapes. */
export function extractAccessToken(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const candidates = [payload.accessToken, payload.token, payload.access_token];
  if (isRecord(payload.tokens)) candidates.push(payload.tokens.accessToken, payload.tokens.access);
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
}

/**
 * Attempts to refresh the session. Concurrent callers share one request.
 * Resolves `true` when the backend accepted the refresh.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const attempt = (async () => {
    try {
      const response = await fetch(buildUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return false;
      const body: unknown = await response.json().catch(() => null);
      const token = extractAccessToken(unwrapEnvelope(body).data);
      if (token) tokenStore.set(token);
      return true;
    } catch {
      return false;
    }
  })();
  refreshInFlight = attempt;
  // Callers that arrive while this is pending share it; release once settled.
  void attempt.finally(() => {
    if (refreshInFlight === attempt) refreshInFlight = null;
  });
  return attempt;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

async function request(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions = {},
  isRetry = false,
): Promise<ApiEnvelope> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      credentials: "include",
      signal: options.signal,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ status: 0, message: "Network error" });
  }

  if (response.status === 401 && !options.skipAuthRefresh) {
    // First 401: try one refresh and replay. A 401 after that means the session is gone.
    if (!isRetry && (await refreshSession())) return request(method, path, body, options, true);
    tokenStore.clear();
    authFailureHandler?.();
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return { data: null, meta: null };
  const text = await response.text();
  if (!text) return { data: null, meta: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError({ status: response.status, message: "Received an invalid response from the server." });
  }
  return unwrapEnvelope(parsed);
}

/**
 * Typed helpers. The generic is the caller's expectation of the payload;
 * services should pass `unknown` and normalize when the shape is uncertain.
 */
export const api = {
  get: async <T = unknown>(path: string, options?: RequestOptions) =>
    (await request("GET", path, undefined, options)).data as T,
  post: async <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    (await request("POST", path, body ?? {}, options)).data as T,
  patch: async <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    (await request("PATCH", path, body ?? {}, options)).data as T,
  put: async <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    (await request("PUT", path, body ?? {}, options)).data as T,
  delete: async <T = unknown>(path: string, options?: RequestOptions) =>
    (await request("DELETE", path, undefined, options)).data as T,
  /** GET returning both payload and pagination metadata. */
  getWithMeta: (path: string, options?: RequestOptions) => request("GET", path, undefined, options),
};
