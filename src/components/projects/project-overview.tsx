"use client";

import { addDays } from "date-fns";
import { Flag, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton, ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/hooks/queries/use-misc";
import { useMilestones, useProject } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { formatDate, formatHours, toISODate } from "@/lib/format";
import type { ID } from "@/types/domain";
import { ProjectAssignments } from "./project-assignments";
import { ProjectQaPicker, ProjectStatusPicker } from "./project-inline-pickers";
import { ProjectWorkflow } from "./project-workflow";
import { ProjectProgress } from "./project-progress";
import { MilestoneStatusBadge } from "./project-status-badge";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ProjectOverview({ projectId }: { projectId: ID }) {
  const project = useProject(projectId);
  const milestones = useMilestones({ projectId });
  const activity = useActivity({ projectId, limit: 10 });
  const today = useMemo(() => toISODate(new Date()), []);
  const in14 = useMemo(() => toISODate(addDays(new Date(), 14)), []);
  const upcoming = useTasks({ projectId, dueFrom: today, dueTo: in14, sortBy: "dueDate", sortOrder: "asc", pageSize: 6 });

  if (project.isLoading) return <DetailSkeleton />;
  if (project.isError || !project.data) return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;
  const p = project.data;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <ProjectWorkflow project={p} />
        <SectionCard title="Project details">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Client">{p.client?.name ?? "Internal"}</Fact>
            <Fact label="Status">
              <ProjectStatusPicker project={p} />
            </Fact>
            <Fact label="Priority">
              <TaskPriorityBadge priority={p.priority} />
            </Fact>
            <Fact label="Project manager">{p.manager?.name ?? "—"}</Fact>
            <Fact label="QA">
              <ProjectQaPicker project={p} className="-ml-0.5" />
            </Fact>
            <Fact label="Start date">{formatDate(p.startDate)}</Fact>
            <Fact label="Deadline">{formatDate(p.deadline)}</Fact>
            <Fact label="Tasks">
              {p.completedTaskCount}/{p.taskCount} done
            </Fact>
            <Fact label="Estimated">{formatHours(p.estimatedHours)}</Fact>
          </dl>
          <ProjectProgress value={p.progress} className="mt-5" />
          {p.description ? <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{p.description}</p> : null}
        </SectionCard>

        <ProjectAssignments projectId={projectId} />

        <SectionCard
          title="Milestones"
          action={
            <Button asChild variant="ghost" size="xs">
              <Link href={`/projects/${projectId}/milestones`}>Manage</Link>
            </Button>
          }
        >
          {milestones.isLoading ? (
            <ListSkeleton rows={2} />
          ) : milestones.isError ? (
            <ErrorState error={milestones.error} onRetry={() => void milestones.refetch()} compact />
          ) : (milestones.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Flag} title="No milestones yet." compact />
          ) : (
            <ul className="divide-y">
              {milestones.data?.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <Flag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(m.dueDate)} · {m.taskCount} tasks</p>
                  </div>
                  <ProjectProgress value={m.progress} showLabel={false} className="hidden w-24 sm:block" />
                  <MilestoneStatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Upcoming tasks" description="Due in the next 14 days">
          {upcoming.isLoading ? (
            <ListSkeleton rows={3} />
          ) : upcoming.isError ? (
            <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} compact />
          ) : (upcoming.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="No upcoming tasks." compact />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {upcoming.data?.items.map((t) => (
                <TaskCard key={t.id} task={t} showProject={false} showAssignee />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard
          title="Team"
          action={
            <Button asChild variant="ghost" size="xs">
              <Link href={`/projects/${projectId}/members`}>All</Link>
            </Button>
          }
        >
          {p.members.length === 0 ? (
            <EmptyState icon={Users} title="No members yet." compact />
          ) : (
            <ul className="space-y-2">
              {p.members.slice(0, 10).map((m) => (
                <li key={m.id}>
                  <Link href={`/team/${m.id}`} className="flex items-center gap-2 rounded-md p-1 text-sm hover:bg-muted">
                    <UserAvatar user={m} size="sm" />
                    <span className="truncate">{m.name}</span>
                    {m.id === p.manager?.id ? <span className="ml-auto text-xs text-muted-foreground">PM</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Recent activity">
          <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} compact />
        </SectionCard>
      </div>
    </div>
  );
}
