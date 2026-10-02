"use client";

import { Building2, FolderKanban, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { ProjectCard } from "@/components/projects/project-card";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { CardGridSkeleton, DetailSkeleton, ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskTable } from "@/components/tasks/task-table";
import { DepartmentAnalyticsPanel } from "@/components/analytics/department-analytics";
import { useActivity, useWorkload } from "@/hooks/queries/use-misc";
import { useDepartment, useDepartments } from "@/hooks/queries/use-people";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { ROLE_LABELS } from "@/lib/permissions";
import type { ID } from "@/types/domain";
import { WorkloadList } from "./workload-list";

export function TeamsView() {
  const query = useDepartments();
  return (
    <div className="space-y-5">
      <PageHeader title="Teams" description="Departments, their people and current work." />
      {query.isLoading ? (
        <CardGridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load departments." onRetry={() => void query.refetch()} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Building2} title="No departments yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {query.data?.map((d) => (
            <Link key={d.id} href={`/teams/${d.id}`} className="space-y-3 rounded-xl border bg-card p-4 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" aria-hidden />
                <h2 className="truncate font-semibold">{d.name}</h2>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {d.head ? (
                  <>
                    <UserAvatar user={d.head} size="sm" />
                    <span className="truncate">{d.head.name}</span>
                    <span className="text-xs text-muted-foreground">Head</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No department head</span>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground"><Users className="size-3" aria-hidden />Members</dt>
                  <dd className="text-base font-semibold tabular-nums">{d.memberCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground"><ListChecks className="size-3" aria-hidden />Active tasks</dt>
                  <dd className="text-base font-semibold tabular-nums">{d.activeTaskCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-muted-foreground"><FolderKanban className="size-3" aria-hidden />Projects</dt>
                  <dd className="text-base font-semibold tabular-nums">{d.projectCount}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentView({ departmentId }: { departmentId: ID }) {
  const dept = useDepartment(departmentId);
  const workload = useWorkload({ departmentId });
  const tasks = useTasks({ departmentId, status: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "CHANGES_REQUESTED"], sortBy: "dueDate", sortOrder: "asc", pageSize: 15 });
  const projects = useProjects({ departmentId, status: "ACTIVE", pageSize: 12 });
  const activity = useActivity({ departmentId, limit: 15 });
  useBreadcrumbLabel(departmentId, dept.data?.name);

  if (dept.isLoading) return <DetailSkeleton />;
  if (dept.isError || !dept.data) return <ErrorState error={dept.error} title="Unable to load department." onRetry={() => void dept.refetch()} />;
  const d = dept.data;

  return (
    <div className="space-y-6">
      <PageHeader title={d.name} description={d.description ?? `${d.memberCount} members`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Department head">
          {d.head ? (
            <Link href={`/team/${d.head.id}`} className="flex items-center gap-3 rounded-md p-1 hover:bg-muted">
              <UserAvatar user={d.head} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-medium">{d.head.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.head.jobTitle ?? (d.head.role ? ROLE_LABELS[d.head.role] : "")}</p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">No department head assigned.</p>
          )}
        </SectionCard>
        <SectionCard title={`Members (${d.members.length})`} className="lg:col-span-2">
          {d.members.length === 0 ? (
            <EmptyState icon={Users} title="No members yet." compact />
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {d.members.map((m) => (
                <li key={m.id}>
                  <Link href={`/team/${m.id}`} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted">
                    <UserAvatar user={m} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{m.jobTitle ?? ROLE_LABELS[m.role]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Workload">
          <WorkloadList items={workload.data} isLoading={workload.isLoading} error={workload.error} onRetry={() => void workload.refetch()} />
        </SectionCard>
        <SectionCard title="Recent activity">
          <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />
        </SectionCard>
      </div>

      <SectionCard title="Active tasks">
        {tasks.isLoading ? (
          <ListSkeleton rows={4} />
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} compact />
        ) : (
          <TaskTable tasks={tasks.data?.items ?? []} showProject emptyTitle="No active tasks." />
        )}
      </SectionCard>

      <section className="space-y-3" aria-labelledby="dept-projects">
        <h2 id="dept-projects" className="text-sm font-semibold">Projects</h2>
        {projects.isLoading ? (
          <CardGridSkeleton count={3} />
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} compact />
        ) : (projects.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={FolderKanban} title="No active projects." compact />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.data?.items.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="dept-analytics">
        <h2 id="dept-analytics" className="text-sm font-semibold">Analytics</h2>
        <DepartmentAnalyticsPanel departmentId={departmentId} />
      </section>
    </div>
  );
}
