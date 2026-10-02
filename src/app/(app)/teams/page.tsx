import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { TeamsView } from "@/components/teams/teams-views";

export const metadata: Metadata = { title: "Teams" };

export default function Page() {
  return (
    <PermissionGuard permission="teams:read" page>
      <TeamsView />
    </PermissionGuard>
  );
}
