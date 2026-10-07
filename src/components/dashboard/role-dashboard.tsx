"use client";

import { dashboardKindFor } from "@/lib/permissions";
import { QaSetupSection } from "@/components/tasks/qa-setup-section";
import { useCurrentUser } from "@/providers/auth-provider";
import { CompanyDashboard } from "./company-dashboard";
import { EmployeeDashboard } from "./employee-dashboard";
import { OperationsDashboard } from "./operations-dashboard";
import { TeamDashboard } from "./team-dashboard";

/** Picks the dashboard for the signed-in user's role. */
export function RoleDashboard() {
  const user = useCurrentUser();
  const kind = dashboardKindFor(user);
  // Project managers' QA set-up to-do comes first on any dashboard.
  return (
    <div className="space-y-6">
      {kind === "employee" ? null : <QaSetupSection />}
      <DashboardFor kind={kind} />
    </div>
  );
}

function DashboardFor({ kind }: { kind: ReturnType<typeof dashboardKindFor> }) {
  switch (kind) {
    case "company":
      return <CompanyDashboard />;
    case "operations":
      return <OperationsDashboard />;
    case "team":
      return <TeamDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}
