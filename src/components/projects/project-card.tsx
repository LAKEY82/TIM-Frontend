import { CalendarClock, ListTodo } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { dueState, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/domain";
import { ProjectProgress } from "./project-progress";
import { ProjectStatusBadge } from "./project-status-badge";

/** Card: name, client, status, progress, PM, deadline, task count. */
export function ProjectCard({ project, compact }: { project: Project; compact?: boolean }) {
  const overdue = project.status !== "COMPLETED" && dueState(project.deadline) === "overdue";
  return (
    <article className="relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 focus-within:border-foreground/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            <Link href={`/projects/${project.id}`} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:underline">
              {project.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground">{project.client?.name ?? (project.type === "INTERNAL" ? "Internal" : "No client")}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <ProjectProgress value={project.progress} />
      {!compact ? (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {project.manager ? (
            <span className="flex min-w-0 items-center gap-1.5" title={`Project manager: ${project.manager.name}`}>
              <UserAvatar user={project.manager} size="xs" />
              <span className="truncate">{project.manager.name}</span>
            </span>
          ) : (
            <span>No PM</span>
          )}
          <span className="flex items-center gap-1" title="Tasks">
            <ListTodo className="size-3.5" aria-hidden />
            {project.completedTaskCount}/{project.taskCount}
            <span className="sr-only">tasks completed</span>
          </span>
          <span className={cn("ml-auto flex items-center gap-1 whitespace-nowrap", overdue && "font-medium text-red-700 dark:text-red-400")}>
            <CalendarClock className="size-3.5" aria-hidden />
            {project.deadline ? formatShortDate(project.deadline) : "No deadline"}
            {overdue ? " · Overdue" : ""}
          </span>
          <TaskPriorityBadge priority={project.priority} iconOnly />
        </div>
      ) : null}
    </article>
  );
}
