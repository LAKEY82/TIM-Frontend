/**
 * Public runtime configuration. `NEXT_PUBLIC_*` values are inlined at build
 * time, so they must be referenced statically (no dynamic `process.env[key]`).
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl && process.env.NODE_ENV === "production" && typeof window !== "undefined") {
  console.error("NEXT_PUBLIC_API_URL is not set. API requests will fail.");
}

export const env = {
  /** Origin of the Express API, without the `/api` suffix. e.g. http://localhost:5000 */
  apiUrl: apiUrl ?? "http://localhost:5000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Theiavora",
  /**
   * Preview mode: skip login and act as a local preview user, to check the UI
   * without a working auth backend. Only honoured by `next dev`; a production
   * build ignores it, so it can never ship enabled.
   */
  authDisabled: process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_DISABLED === "true",
} as const;
