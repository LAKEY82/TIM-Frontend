"use client";

import { useMemo } from "react";
import { can, type Permission } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";

/** UI-only check. The API still enforces every permission. */
export function usePermission(permission: Permission | readonly Permission[], mode: "all" | "any" = "all"): boolean {
  const { user } = useAuth();
  return useMemo(() => can(user, permission, mode), [user, permission, mode]);
}

/** Returns a bound `can()` for checking several permissions in one component. */
export function useCan() {
  const { user } = useAuth();
  return useMemo(
    () => (permission: Permission | readonly Permission[], mode: "all" | "any" = "all") => can(user, permission, mode),
    [user],
  );
}
