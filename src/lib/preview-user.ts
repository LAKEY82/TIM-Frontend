/**
 * Preview mode only (see `env.authDisabled`). Builds the local user that stands
 * in for a signed-in account so each role's UI can be inspected. The chosen
 * role is a per-browser convenience kept in localStorage.
 */
import { ROLES, type Role, type User } from "@/types/domain";

const ROLE_KEY = "tv-preview-role";

export function getPreviewRole(): Role {
  try {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored && (ROLES as readonly string[]).includes(stored)) return stored as Role;
  } catch {
    // Storage unavailable (private mode, blocked site data): use the default.
  }
  return "CEO";
}

export function setPreviewRole(role: Role) {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Non-critical: the role still applies for this session.
  }
}

export function previewUser(role: Role = getPreviewRole()): User {
  return {
    // Match a real user id (e.g. from seed data) so "my tasks" actions apply.
    id: process.env.NEXT_PUBLIC_PREVIEW_USER_ID || "preview-user",
    name: "Preview User",
    email: "preview@localhost",
    role,
    status: "ACTIVE",
    departmentId: null,
    department: null,
    jobTitle: "Preview mode",
  };
}
