"use client";

import { Ban, Clock, Eye, FolderKanban, ListChecks } from "lucide-react";
import { DepartmentWorkloadChart, ProjectProgressChart, TaskStatusChart } from "@/components/analytics/lazy-charts";
import { ProjectCreateButton } from "@/components/projects/project-create-modal";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCardsSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { TaskCreateButton } from "@/components/tasks/task-create-modal";
import { useCompanyAnalytics } from "@/hooks/queries/use-misc";
import { formatDate } from "@/lib/format";
import { ProjectsRequiringAttention } from "./project-health-card";
import { StatCard } from "./stat-card";
import { UpcomingDeadlines } from "./upcoming-deadlines";

/** Managing Director dashboard: operational view (projects, task flow, departments). */
export function OperationsDashboard() {
  const query = useCompanyAnalytics();
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        description={`Projects, operational tasks and department workload · ${formatDate(new Date(), "EEEE, MMMM d")}`}
        actions={
          <>
            <TaskCreateButton />
            <ProjectCreateButton variant="outline" />
          </>
        }
      />

      {query.isError ? <ErrorState error={query.error} title="Unable to load operations data." onRetry={() => void query.refetch()} /> : null}

      {query.isLoading ? (
        <StatCardsSkeleton count={5} />
      ) : data ? (
        <section aria-label="Operational figures" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Active projects" value={data.summary.activeProjects} icon={FolderKanban} href="/projects?status=ACTIVE" />
          <StatCard label="Open tasks" value={data.summary.openTasks} icon={ListChecks} href="/tasks?scope=all" />
          <StatCard label="In review" value={data.summary.inReviewTasks} icon={Eye} href="/tasks?scope=all&status=IN_REVIEW" />
          <StatCard label="Blocked" value={data.summary.blockedTasks} icon={Ban} href="/tasks?scope=all&status=BLOCKED" tone={data.summary.blockedTasks > 0 ? "critical" : "default"} />
          <StatCard label="Overdue" value={data.summary.overdueTasks} icon={Clock} href="/tasks?scope=all&overdue=true" tone={data.summary.overdueTasks > 0 ? "warning" : "default"} />
        </section>
      ) : null}

      {!query.isError ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Projects requiring attention" className="lg:col-span-1">
              <ProjectsRequiringAttention items={data?.projectsRequiringAttention} isLoading={query.isLoading} />
            </SectionCard>
            <ProjectProgressChart data={data?.projectProgress ?? []} isLoading={query.isLoading} className="lg:col-span-2" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TaskStatusChart title="Operational tasks" data={data?.taskStatus ?? []} isLoading={query.isLoading} />
            <DepartmentWorkloadChart data={data?.departmentWorkload ?? []} isLoading={query.isLoading} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Deadlines">
              <UpcomingDeadlines items={data?.upcomingDeadlines} isLoading={query.isLoading} limit={10} />
            </SectionCard>
            <SectionCard title="Recent activity">
              <ActivityTimeline items={data?.recentActivity} isLoading={query.isLoading} />
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
