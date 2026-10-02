"use client";

import { addDays } from "date-fns";
import { CalendarPlus, CheckCircle2, FolderKanban, ListTodo } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ProjectCreateButton } from "@/components/projects/project-create-modal";
import { ProjectProgress } from "@/components/projects/project-progress";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskCreateButton } from "@/components/tasks/task-create-modal";
import { WorkloadList } from "@/components/teams/workload-list";
import { Button } from "@/components/ui/button";
import { useWorkload } from "@/hooks/queries/use-misc";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import { firstName, formatShortDate, greeting, toISODate } from "@/lib/format";
import { useCurrentUser } from "@/providers/auth-provider";
import type { DeadlineItem, TaskSummary } from "@/types/domain";
import { UpcomingDeadlines } from "./upcoming-deadlines";

function TaskList({
  query,
  empty,
  showAssignee = true,
}: {
  query: ReturnType<typeof useTasks>;
  empty: string;
  showAssignee?: boolean;
}) {
  if (query.isLoading) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />;
  const items = query.data?.items ?? [];
  if (items.length === 0) return <EmptyState icon={CheckCircle2} title={empty} compact />;
  return (
    <div className="grid gap-2">
      {items.map((t) => (
        <TaskCard key={t.id} task={t} showAssignee={showAssignee} />
      ))}
    </div>
  );
}

function toDeadlines(tasks: TaskSummary[]): DeadlineItem[] {
  return tasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: t.id,
      kind: "TASK" as const,
      title: t.title,
      dueDate: t.dueDate ?? "",
      projectId: t.project?.id,
      projectName: t.project?.name,
      assignee: t.assignee,
      status: t.status,
    }));
}

/** Project Manager / Department Head dashboard. */
export function TeamDashboard() {
  const me = useCurrentUser();
  const canDaily = usePermission("daily_tasks:manage");
  const today = useMemo(() => toISODate(new Date()), []);
  const nextWeek = useMemo(() => toISODate(addDays(new Date(), 7)), []);
  const tomorrow = useMemo(() => toISODate(addDays(new Date(), 1)), []);

  // The API scopes these lists to the projects/teams this manager can see.
  const todays = useTasks({ dueFrom: today, dueTo: today, sortBy: "priority", sortOrder: "desc", pageSize: 12 });
  const review = useTasks({ status: "IN_REVIEW", reviewerId: "me", sortBy: "dueDate", sortOrder: "asc", pageSize: 10 });
  const overdue = useTasks({ overdue: true, sortBy: "dueDate", sortOrder: "asc", pageSize: 10 });
  const upcoming = useTasks({ dueFrom: tomorrow, dueTo: nextWeek, sortBy: "dueDate", sortOrder: "asc", pageSize: 10 });
  const workload = useWorkload({ managerId: me.id });
  const projects = useProjects({ managerId: me.id, status: "ACTIVE", pageSize: 8, sortBy: "deadline", sortOrder: "asc" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName(me.name)}`}
        description="Your team's work at a glance."
        actions={
          <>
            <TaskCreateButton />
            {canDaily ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/daily-tasks">
                  <CalendarPlus /> Daily task
                </Link>
              </Button>
            ) : null}
            <ProjectCreateButton variant="outline" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Today's tasks"
          className="lg:col-span-2"
          action={
            <Button asChild variant="ghost" size="xs">
              <Link href="/tasks?scope=all">View all</Link>
            </Button>
          }
        >
          <TaskList query={todays} empty="No tasks due today." />
        </SectionCard>
        <SectionCard title="Tasks waiting for review" description={review.data ? `${review.data.total} waiting` : undefined}>
          <TaskList query={review} empty="Nothing waiting for your review." />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Team workload" className="lg:col-span-2">
          <WorkloadList items={workload.data} isLoading={workload.isLoading} error={workload.error} onRetry={() => void workload.refetch()} emptyLabel="No team members yet." />
        </SectionCard>
        <SectionCard title="Overdue tasks" description={overdue.data ? `${overdue.data.total} overdue` : undefined}>
          <TaskList query={overdue} empty="No overdue tasks." />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Upcoming deadlines" description="Next 7 days">
          {upcoming.isError ? (
            <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} compact />
          ) : (
            <UpcomingDeadlines items={toDeadlines(upcoming.data?.items ?? [])} isLoading={upcoming.isLoading} />
          )}
        </SectionCard>
        <SectionCard
          title="Active projects"
          action={
            <Button asChild variant="ghost" size="xs">
              <Link href="/projects">All projects</Link>
            </Button>
          }
        >
          {projects.isLoading ? (
            <ListSkeleton rows={3} />
          ) : projects.isError ? (
            <ErrorState error={projects.error} onRetry={() => void projects.refetch()} compact />
          ) : (projects.data?.items.length ?? 0) === 0 ? (
            <EmptyState icon={FolderKanban} title="No active projects." compact />
          ) : (
            <ul className="divide-y">
              {projects.data?.items.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link href={`/projects/${p.id}`} className="block space-y-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium hover:underline">{p.name}</span>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <ProjectProgress value={p.progress} showLabel={false} className="flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">{p.progress}%</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ListTodo className="size-3.5" aria-hidden />
                        {p.taskCount}
                      </span>
                      {p.deadline ? <span className="text-xs text-muted-foreground">Due {formatShortDate(p.deadline)}</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
