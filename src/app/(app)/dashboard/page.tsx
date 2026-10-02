import type { Metadata } from "next";
import { RoleDashboard } from "@/components/dashboard/role-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <RoleDashboard />
  );
}
