import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { UsersSettings } from "@/components/settings/admin-settings";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <PermissionGuard permission="users:manage" page>
      <UsersSettings />
    </PermissionGuard>
  );
}
