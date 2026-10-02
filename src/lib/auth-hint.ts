/**
 * A non-sensitive, first-party "signed in" hint cookie.
 *
 * It contains no token and grants nothing: it only lets `proxy.ts` send
 * clearly signed-out visitors to /login before any JS runs (avoiding a flash
 * of the app shell). Real auth is always verified against the API.
 */
export const AUTH_HINT_COOKIE = "tv_signed_in";

export function setAuthHint() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_HINT_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 14}; SameSite=Lax${secure}`;
}

export function clearAuthHint() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
