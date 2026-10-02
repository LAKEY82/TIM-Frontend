import type { Metadata } from "next";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DailyTaskPlanner } from "@/components/daily-tasks/daily-task-planner";

export const metadata: Metadata = { title: "Daily Tasks" };

export default function Page() {
  return (
    <PermissionGuard permission="daily_tasks:manage" page>
      <DailyTaskPlanner />
    </PermissionGuard>
  );
}
