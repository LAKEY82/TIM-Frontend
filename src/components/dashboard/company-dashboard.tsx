"use client";

import { AlertTriangle, CheckCircle2, Clock, Eye, FolderCheck, FolderKanban } from "lucide-react";
import { ActivityChart, DepartmentWorkloadChart, ProjectProgressChart, ProjectStatusChart, TaskStatusChart } from "@/components/analytics/lazy-charts";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCardsSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { useCompanyAnalytics } from "@/hooks/queries/use-misc";
import { formatDate } from "@/lib/format";
import { ProjectsRequiringAttention } from "./project-health-card";
import { StatCard } from "./stat-card";
import { UpcomingDeadlines } from "./upcoming-deadlines";

/** CEO dashboard: company-wide overview from /api/analytics/company. */
export function CompanyDashboard() {
  const query = useCompanyAnalytics();
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Company overview" description={`As of ${formatDate(new Date(), "EEEE, MMMM d")}`} />

      {query.isError ? <ErrorState error={query.error} title="Unable to load company analytics." onRetry={() => void query.refetch()} /> : null}

      {query.isLoading ? (
        <StatCardsSkeleton />
      ) : data ? (
        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Active projects" value={data.summary.activeProjects} icon={FolderKanban} href="/projects?status=ACTIVE" />
          <StatCard label="Completed projects" value={data.summary.completedProjects} icon={FolderCheck} href="/projects?status=COMPLETED" tone="good" />
          <StatCard label="At risk" value={data.summary.atRiskProjects} icon={AlertTriangle} href="/projects?status=AT_RISK" tone={data.summary.atRiskProjects > 0 ? "critical" : "default"} />
          <StatCard label="Overdue tasks" value={data.summary.overdueTasks} icon={Clock} href="/tasks?scope=all&overdue=true" tone={data.summary.overdueTasks > 0 ? "warning" : "default"} />
          <StatCard label="Tasks completed" value={data.summary.completedTasks} icon={CheckCircle2} href="/tasks?scope=all&status=APPROVED" tone="good" />
          <StatCard label="Tasks in review" value={data.summary.inReviewTasks} icon={Eye} href="/tasks?scope=all&status=IN_REVIEW" />
        </section>
      ) : null}

      {!query.isError ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ProjectStatusChart data={data?.projectStatus ?? []} isLoading={query.isLoading} />
            <TaskStatusChart data={data?.taskStatus ?? []} isLoading={query.isLoading} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DepartmentWorkloadChart data={data?.departmentWorkload ?? []} isLoading={query.isLoading} />
            <ActivityChart data={data?.weeklyActivity ?? []} isLoading={query.isLoading} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ProjectProgressChart data={data?.projectProgress ?? []} isLoading={query.isLoading} className="lg:col-span-2" />
            <SectionCard title="Upcoming deadlines">
              <UpcomingDeadlines items={data?.upcomingDeadlines} isLoading={query.isLoading} />
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Projects requiring attention">
              <ProjectsRequiringAttention items={data?.projectsRequiringAttention} isLoading={query.isLoading} />
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
