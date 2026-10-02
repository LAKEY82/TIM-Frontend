"use client";

import type { ReactNode } from "react";
import { ForbiddenState } from "@/components/shared/states";
import { usePermission } from "@/hooks/use-permission";
import type { Permission } from "@/lib/permissions";

interface PermissionGuardProps {
  permission: Permission | readonly Permission[];
  mode?: "all" | "any";
  /** What to render when not permitted. Defaults to nothing (inline) or a 403 panel (`page`). */
  fallback?: ReactNode;
  /** Render a full "permission denied" panel instead of nothing. */
  page?: boolean;
  children: ReactNode;
}

/**
 * Hides UI the current user can't use. This is a UX affordance only: the API
 * remains the authority and will reject unauthorized requests regardless.
 */
export function PermissionGuard({ permission, mode = "all", fallback, page = false, children }: PermissionGuardProps) {
  const allowed = usePermission(permission, mode);
  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return page ? <ForbiddenState /> : null;
}
