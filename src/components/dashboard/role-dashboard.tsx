"use client";

import { dashboardKindFor } from "@/lib/permissions";
import { useCurrentUser } from "@/providers/auth-provider";
import { CompanyDashboard } from "./company-dashboard";
import { EmployeeDashboard } from "./employee-dashboard";
import { OperationsDashboard } from "./operations-dashboard";
import { TeamDashboard } from "./team-dashboard";

/** Picks the dashboard for the signed-in user's role. */
export function RoleDashboard() {
  const user = useCurrentUser();
  switch (dashboardKindFor(user)) {
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
