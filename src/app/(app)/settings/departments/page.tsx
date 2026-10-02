import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DepartmentsSettings } from "@/components/settings/admin-settings";

export const metadata: Metadata = { title: "Departments" };

export default function Page() {
  return (
    <PermissionGuard permission="departments:manage" page>
      <DepartmentsSettings />
    </PermissionGuard>
  );
}
