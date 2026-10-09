/**
 * UI-level permission checks.
 *
 * IMPORTANT: these only decide what the interface *shows*. The Express API is
 * authoritative and must enforce every rule itself. Hiding a button is never
 * a security control.
 *
 * If the backend returns `user.permissions`, that list is used verbatim.
 * Otherwise we fall back to the role matrix below.
 */
import type { Role, User } from "@/types/domain";

export const PERMISSIONS = [
  "dashboard:company",
  "dashboard:operations",
  "dashboard:team",
  "projects:read_all",
  "projects:create",
  "projects:update",
  /** Permanent: admins only. */
  "projects:delete",
  "tasks:create",
  "tasks:assign",
  "tasks:review",
  "tasks:read_all",
  "daily_tasks:manage",
  "teams:read",
  "clients:read",
  "clients:manage",
  "analytics:read",
  "analytics:company",
  "users:manage",
  "departments:manage",
  "settings:company",
  "timeline:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const MANAGEMENT: readonly Permission[] = [
  "dashboard:operations",
  "dashboard:team",
  "projects:read_all",
  "projects:create",
  "projects:update",
  "tasks:create",
  "tasks:assign",
  "tasks:review",
  "tasks:read_all",
  "daily_tasks:manage",
  "teams:read",
  "clients:read",
  "clients:manage",
  "analytics:read",
  "analytics:company",
  "timeline:read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,
  CEO: [...MANAGEMENT, "dashboard:company", "settings:company"],
  MANAGING_DIRECTOR: [...MANAGEMENT, "dashboard:company"],
  PROJECT_MANAGER: [
    "dashboard:team",
    "projects:create",
    "projects:update",
    "tasks:create",
    "tasks:assign",
    "tasks:review",
    "daily_tasks:manage",
    "teams:read",
    "clients:read",
    "analytics:read",
    "timeline:read",
  ],
  DEPARTMENT_HEAD: [
    "dashboard:team",
    "tasks:create",
    "tasks:assign",
    "tasks:review",
    "daily_tasks:manage",
    "teams:read",
    "analytics:read",
    "timeline:read",
  ],
  EMPLOYEE: ["timeline:read"],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  CEO: "CEO",
  MANAGING_DIRECTOR: "Managing Director",
  PROJECT_MANAGER: "Project Manager",
  DEPARTMENT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
  // DEVELOPER: "Developer",
  // QA: "QA",
};

type PermissionSubject = Pick<User, "role" | "permissions"> | null | undefined;

export function permissionsFor(user: PermissionSubject): ReadonlySet<string> {
  if (!user) return new Set();
  if (user.permissions && user.permissions.length > 0) return new Set(user.permissions);
  return new Set(ROLE_PERMISSIONS[user.role] ?? []);
}

export function hasPermission(user: PermissionSubject, permission: Permission): boolean {
  return permissionsFor(user).has(permission);
}

/** `can(user, "tasks:review")` or `can(user, ["a", "b"], "any")`. */
export function can(
  user: PermissionSubject,
  permission: Permission | readonly Permission[],
  mode: "all" | "any" = "all",
): boolean {
  const granted = permissionsFor(user);
  const list = typeof permission === "string" ? [permission] : permission;
  if (list.length === 0) return true;
  return mode === "all" ? list.every((p) => granted.has(p)) : list.some((p) => granted.has(p));
}

export type DashboardKind = "company" | "operations" | "team" | "employee";

export function dashboardKindFor(user: PermissionSubject): DashboardKind {
  if (!user) return "employee";
  if (user.role === "CEO" || user.role === "ADMIN") return "company";
  if (user.role === "MANAGING_DIRECTOR") return "operations";
  if (can(user, "dashboard:company")) return "company";
  if (can(user, "dashboard:operations")) return "operations";
  if (can(user, "dashboard:team")) return "team";
  return "employee";
}

/** Where to land after login. Employees go straight to their day. */
export function homePathFor(user: PermissionSubject): string {
  return dashboardKindFor(user) === "employee" ? "/my-day" : "/dashboard";
}
