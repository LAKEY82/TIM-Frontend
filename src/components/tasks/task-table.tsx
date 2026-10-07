"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
            <TaskRow key={task.id} task={task} showProject={showProject} deadline={deadline} onOpen={() => router.push(`/tasks/${task.id}`)} />
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
}: {
  task: TaskSummary;
  showProject?: boolean;
  deadline?: "dueDate" | "qaDueDate";
  onOpen: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="max-w-0">
        <Link href={`/tasks/${task.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {task.title}
        </Link>
        {showProject && task.project ? <p className="truncate text-xs text-muted-foreground">{task.project.name}</p> : null}
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
