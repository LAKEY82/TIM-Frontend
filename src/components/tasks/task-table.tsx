"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Bug, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { EmptyState } from "@/components/shared/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatHours } from "@/lib/format";
import type { TaskFilters } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";
import type { SortDirection, TaskSummary } from "@/types/domain";
import { TaskAssignee } from "./task-assignee";
import { TaskDueDate } from "./task-due-date";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusPicker } from "./inline-pickers";
import { TaskIssuesList } from "./task-issues-list";

export type TaskSortKey = NonNullable<TaskFilters["sortBy"]>;

interface SortState {
  sortBy?: TaskSortKey;
  sortOrder?: SortDirection;
}

interface TaskTableProps {
  tasks: TaskSummary[];
  sort?: SortState;
  onSortChange?: (sort: Required<SortState>) => void;
  showProject?: boolean;
  /** Which deadline the date column shows (the QA queue shows the QA deadline). */
  deadline?: "dueDate" | "qaDueDate";
  emptyTitle?: string;
  emptyDescription?: string;
}

function SortHeader({
  label,
  column,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  column: TaskSortKey;
  sort?: SortState;
  onSortChange?: TaskTableProps["onSortChange"];
  className?: string;
}) {
  const active = sort?.sortBy === column;
  const dir = active ? sort?.sortOrder : undefined;
  if (!onSortChange) return <TableHead className={className}>{label}</TableHead>;
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead className={className} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
      <button
        type="button"
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSortChange({ sortBy: column, sortOrder: active && dir === "asc" ? "desc" : "asc" })}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}

/** Task list table: Task, Assignee, Priority, Status, Due Date, Estimated, Actual. */
export function TaskTable({
  tasks,
  sort,
  onSortChange,
  showProject = false,
  deadline = "dueDate",
  emptyTitle = "No tasks found.",
  emptyDescription,
}: TaskTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (tasks.length === 0) return <EmptyState icon={ListChecks} title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="relative overflow-x-auto rounded-lg border">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <SortHeader label="Task" column="title" sort={sort} onSortChange={onSortChange} className="w-[36%]" />
            <TableHead>Assignee</TableHead>
            <SortHeader label="Priority" column="priority" sort={sort} onSortChange={onSortChange} />
            <SortHeader label="Status" column="status" sort={sort} onSortChange={onSortChange} />
            <SortHeader label={deadline === "qaDueDate" ? "QA deadline" : "Due date"} column={deadline} sort={sort} onSortChange={onSortChange} />
            <SortHeader label="Est." column="estimatedHours" sort={sort} onSortChange={onSortChange} className="text-right" />
            <SortHeader label="Actual" column="actualHours" sort={sort} onSortChange={onSortChange} className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <Fragment key={task.id}>
              <TaskRow
                task={task}
                showProject={showProject}
                deadline={deadline}
                onOpen={() => router.push(`/tasks/${task.id}`)}
                expanded={expanded.has(task.id)}
                onToggle={() => toggle(task.id)}
              />
              {expanded.has(task.id) ? (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={7} className="py-2 pl-10">
                    <TaskIssuesList taskId={task.id} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TaskRow({
  task,
  showProject,
  deadline = "dueDate",
  onOpen,
  expanded = false,
  onToggle,
}: {
  task: TaskSummary;
  showProject?: boolean;
  deadline?: "dueDate" | "qaDueDate";
  onOpen: () => void;
  /** Whether the bugs QA reported on this task are shown under it. */
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const issues = task.issueCount ?? 0;
  const open = task.openIssueCount ?? 0;
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="max-w-0">
        <div className="flex min-w-0 items-start gap-1.5">
          {issues && onToggle ? (
            <button
              type="button"
              className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={expanded}
              aria-label={`${expanded ? "Hide" : "Show"} bugs for ${task.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : null}
          <div className="min-w-0">
            <Link href={`/tasks/${task.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {task.title}
            </Link>
            {(showProject && task.project) || issues ? (
              <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                {showProject && task.project ? <span className="truncate">{task.project.name}</span> : null}
                {issues ? (
                  <span className={cn("inline-flex shrink-0 items-center gap-1", open ? "text-red-700 dark:text-red-400" : undefined)}>
                    <Bug className="size-3" aria-hidden />
                    {open ? `${open} of ${issues} bug${issues === 1 ? "" : "s"} open` : `${issues} bug${issues === 1 ? "" : "s"} fixed`}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <TaskAssignee user={task.assignee} className="max-w-40" />
      </TableCell>
      <TableCell>
        <TaskPriorityBadge priority={task.priority} />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <TaskStatusPicker task={task} withLabel />
      </TableCell>
      <TableCell>
        {deadline === "qaDueDate" ? (
          <TaskDueDate dueDate={task.qaDueDate} status={task.status === "IN_QA" ? "IN_QA" : "APPROVED"} showIcon={false} />
        ) : (
          <TaskDueDate dueDate={task.dueDate} status={task.status} showIcon={false} />
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatHours(task.estimatedHours)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatHours(task.actualHours)}</TableCell>
    </TableRow>
  );
}
