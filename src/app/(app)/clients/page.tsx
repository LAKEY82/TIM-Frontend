import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ClientsView } from "@/components/clients/clients-views";

export const metadata: Metadata = { title: "Clients" };

export default function Page() {
  return (
    <PermissionGuard permission="clients:read" page>
      <ClientsView />
    </PermissionGuard>
  );
}
