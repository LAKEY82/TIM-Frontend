"use client";

import { addDays } from "date-fns";
import { Building2, FolderKanban, Mail } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { ProjectCard } from "@/components/projects/project-card";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { SectionCard } from "@/components/shared/section-card";
import { CardGridSkeleton, DetailSkeleton, ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskCard } from "@/components/tasks/task-card";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "@/hooks/queries/use-misc";
import { useUser, useUserWorkload } from "@/hooks/queries/use-people";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { formatHours, toISODate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import type { ID } from "@/types/domain";

function Figure({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={alert ? "text-xl font-semibold text-red-700 tabular-nums dark:text-red-400" : "text-xl font-semibold tabular-nums"}>{value}</dd>
    </div>
  );
}

/**
 * Employee profile. Every section is fetched separately, so if the API
 * denies one (403) only that section shows "Permission denied".
 */
export function EmployeeProfile({ userId }: { userId: ID }) {
  const user = useUser(userId);
  const workload = useUserWorkload(userId);
  const current = useTasks({ assigneeId: userId, status: ["IN_PROGRESS", "BLOCKED", "IN_REVIEW", "CHANGES_REQUESTED", "TODO"], sortBy: "dueDate", sortOrder: "asc", pageSize: 8 });
  const from = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const to = useMemo(() => toISODate(addDays(new Date(), 14)), []);
  const upcoming = useTasks({ assigneeId: userId, dueFrom: from, dueTo: to, sortBy: "dueDate", sortOrder: "asc", pageSize: 6 });
  const projects = useProjects({ memberId: userId, pageSize: 6 });
  const activity = useActivity({ userId, limit: 15 });
  useBreadcrumbLabel(userId, user.data?.name);

  if (user.isLoading) return <DetailSkeleton />;
  if (user.isError || !user.data) return <ErrorState error={user.error} title="Unable to load profile." onRetry={() => void user.refetch()} />;
  const u = user.data;
  const w = workload.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <UserAvatar user={u} size="xl" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{u.name}</h1>
            {u.status === "INACTIVE" ? <Badge variant="secondary">Inactive</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{u.jobTitle ?? ROLE_LABELS[u.role]}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{ROLE_LABELS[u.role]}</span>
            {u.department ? (
              <Link href={`/teams/${u.department.id}`} className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <Building2 className="size-3.5" aria-hidden />
                {u.department.name}
              </Link>
            ) : null}
            {u.email ? (
              <a href={`mailto:${u.email}`} className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
                <Mail className="size-3.5" aria-hidden />
                {u.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <SectionCard title="Workload">
        {workload.isLoading ? (
          <ListSkeleton rows={1} />
        ) : workload.isError ? (
          <ErrorState error={workload.error} onRetry={() => void workload.refetch()} compact />
        ) : w ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Figure label="Assigned" value={w.assigned} />
            <Figure label="Estimated" value={formatHours(w.estimatedHours)} />
            <Figure label="Completed" value={w.completed} />
            <Figure label="In review" value={w.inReview} />
            <Figure label="Blocked" value={w.blocked} alert={w.blocked > 0} />
            <Figure label="Overdue" value={w.overdue} alert={w.overdue > 0} />
          </dl>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Current tasks">
          {current.isLoading ? (
            <ListSkeleton rows={3} />
          ) : current.isError ? (
            <ErrorState error={current.error} onRetry={() => void current.refetch()} compact />
          ) : (current.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No current tasks." compact />
          ) : (
            <div className="grid gap-2">{current.data?.items.map((t) => <TaskCard key={t.id} task={t} showActions={false} />)}</div>
          )}
        </SectionCard>
        <SectionCard title="Upcoming tasks" description="Next 14 days">
          {upcoming.isLoading ? (
            <ListSkeleton rows={3} />
          ) : upcoming.isError ? (
            <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} compact />
          ) : (upcoming.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No upcoming tasks." compact />
          ) : (
            <div className="grid gap-2">{upcoming.data?.items.map((t) => <TaskCard key={t.id} task={t} showActions={false} />)}</div>
          )}
        </SectionCard>
      </div>

      <section className="space-y-3" aria-labelledby="profile-projects">
        <h2 id="profile-projects" className="text-sm font-semibold">Projects</h2>
        {projects.isLoading ? (
          <CardGridSkeleton count={3} />
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} compact />
        ) : (projects.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={FolderKanban} title="Not on any projects." compact />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{projects.data?.items.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
        )}
      </section>

      <SectionCard title="Activity">
        <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />
      </SectionCard>
    </div>
  );
}
