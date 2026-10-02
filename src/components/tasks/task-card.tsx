"use client";

import { Clock, FolderKanban, MessageSquare, SquareCheck } from "lucide-react";
import Link from "next/link";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskSummary } from "@/types/domain";
import { TaskAssignee } from "./task-assignee";
import { TaskDueDate } from "./task-due-date";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskQuickActions } from "./task-quick-actions";
import { TaskStatusBadge } from "./task-status-badge";

interface TaskCardProps {
  task: TaskSummary;
  showActions?: boolean;
  showAssignee?: boolean;
  showProject?: boolean;
  className?: string;
}

/** My Day / dashboard card: name, project, priority, status, deadline, estimate + quick actions. */
export function TaskCard({ task, showActions = true, showAssignee = false, showProject = true, className }: TaskCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/20 focus-within:border-foreground/30",
        className,
      )}
      aria-labelledby={`task-${task.id}-title`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 id={`task-${task.id}-title`} className="text-sm leading-snug font-medium">
            <Link href={`/tasks/${task.id}`} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:underline">
              {task.title}
            </Link>
          </h3>
          {showProject && task.project ? (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <FolderKanban className="size-3" aria-hidden />
              <span className="truncate">{task.project.name}</span>
              {task.milestone ? <span className="truncate"> · {task.milestone.name}</span> : null}
            </p>
          ) : null}
        </div>
        <TaskPriorityBadge priority={task.priority} iconOnly />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <TaskStatusBadge status={task.status} />
        <TaskDueDate dueDate={task.dueDate} status={task.status} />
        {task.estimatedHours ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Estimated hours">
            <Clock className="size-3.5" aria-hidden />
            {formatHours(task.estimatedHours)}
            <span className="sr-only">estimated</span>
          </span>
        ) : null}
        {task.subtaskCount ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Subtasks">
            <SquareCheck className="size-3.5" aria-hidden />
            {task.completedSubtaskCount ?? 0}/{task.subtaskCount}
          </span>
        ) : null}
        {task.commentCount ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Comments">
            <MessageSquare className="size-3.5" aria-hidden />
            {task.commentCount}
          </span>
        ) : null}
        {showAssignee ? <TaskAssignee user={task.assignee} className="relative z-10 ml-auto text-xs" /> : null}
      </div>

      {showActions ? <TaskQuickActions task={task} size="xs" className="relative z-10" /> : null}
    </article>
  );
}
