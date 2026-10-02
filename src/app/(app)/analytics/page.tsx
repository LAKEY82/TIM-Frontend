import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Suspense } from "react";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <Suspense>
      <PermissionGuard permission="analytics:read" page>
      <AnalyticsView />
    </PermissionGuard>
    </Suspense>
  );
}
