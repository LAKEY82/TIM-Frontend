import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { CompanySettingsForm } from "@/components/settings/admin-settings";

export const metadata: Metadata = { title: "Company settings" };

export default function Page() {
  return (
    <PermissionGuard permission="settings:company" page>
      <CompanySettingsForm />
    </PermissionGuard>
  );
}
