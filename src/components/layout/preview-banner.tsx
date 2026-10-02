"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelectField } from "@/components/forms/select-field";
import { env } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/permissions";
import { previewUser, setPreviewRole } from "@/lib/preview-user";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { ROLES, type Role } from "@/types/domain";

/** Shown only in preview mode (`NEXT_PUBLIC_AUTH_DISABLED=true` under `next dev`). */
export function PreviewBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  if (!env.authDisabled || !user) return null;

  const switchRole = (role: Role) => {
    setPreviewRole(role);
    // Drop data fetched as the previous role, then re-seed the session.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    queryClient.setQueryData(queryKeys.auth.me, previewUser(role));
    router.push("/dashboard");
  };

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-900 sm:px-6 dark:text-amber-200">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium">Preview mode: authentication is disabled.</span>
      <span className="hidden text-amber-900/80 sm:inline dark:text-amber-200/80">Permissions are simulated in the UI only.</span>
      <span className="ml-auto flex items-center gap-2">
        <label htmlFor="preview-role">View as</label>
        <SelectField
          id="preview-role"
          className="h-7 w-44 bg-background text-foreground"
          value={user.role}
          onChange={(v) => v && switchRole(v as Role)}
          options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      </span>
    </div>
  );
}
