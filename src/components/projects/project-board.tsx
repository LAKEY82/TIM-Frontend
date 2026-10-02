"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskAssignee } from "@/components/tasks/task-assignee";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { RequestChangesDialog } from "@/components/tasks/request-changes-dialog";
import { TASK_STATUS_ICONS } from "@/components/tasks/task-status-badge";
import { useApproveTask, useSubmitForReview, useTasks, useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { KANBAN_COLUMNS, TASK_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ID, TaskStatus, TaskSummary } from "@/types/domain";

/**
 * Decides which API call a column move maps to. Review outcomes use the
 * dedicated review endpoints so the backend records review history.
 */
export type BoardMove = { kind: "status"; status: TaskStatus } | { kind: "submit" } | { kind: "approve" } | { kind: "request_changes" };

export function moveFor(target: TaskStatus): BoardMove {
  if (target === "IN_REVIEW") return { kind: "submit" };
  if (target === "APPROVED") return { kind: "approve" };
  if (target === "CHANGES_REQUESTED") return { kind: "request_changes" };
  return { kind: "status", status: target };
}

function BoardCard({ task, overlay }: { task: TaskSummary; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { status: task.status } });
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={cn(
        "group rounded-lg border bg-card p-2.5 shadow-xs",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-1 shadow-lg ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="-ml-1 mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Move ${task.title}. Press space to pick up, arrow keys to move, space to drop.`}
          {...(overlay ? {} : listeners)}
          {...(overlay ? {} : attributes)}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
        <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 text-sm leading-snug font-medium hover:underline">
          {task.title}
        </Link>
        <TaskPriorityBadge priority={task.priority} iconOnly />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 pl-5">
        <TaskDueDate dueDate={task.dueDate} status={task.status} />
        <TaskAssignee user={task.assignee} showName={false} />
      </div>
    </div>
  );
}

function BoardColumn({ status, tasks }: { status: TaskStatus; tasks: TaskSummary[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TASK_STATUS_META[status];
  const Icon = TASK_STATUS_ICONS[status];
  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label}, ${tasks.length} tasks`}
      className={cn("flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors", isOver && "border-primary/50 bg-primary/5")}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{meta.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
        {tasks.length === 0 ? <p className="rounded-lg border border-dashed px-2 py-6 text-center text-xs text-muted-foreground">Drop tasks here</p> : null}
        {tasks.map((t) => (
          <BoardCard key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}

export function ProjectBoard({ projectId }: { projectId: ID }) {
  const query = useTasks({ projectId, pageSize: 500, sortBy: "priority", sortOrder: "desc" });
  const updateStatus = useUpdateTaskStatus();
  const submit = useSubmitForReview();
  const approve = useApproveTask();
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [changesFor, setChangesFor] = useState<TaskSummary | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const tasks = useMemo(() => query.data?.items ?? [], [query.data]);
  const columns = useMemo(() => {
    const hasCompleted = tasks.some((t) => t.status === "COMPLETED");
    const order: TaskStatus[] = hasCompleted ? [...KANBAN_COLUMNS.slice(0, 3), "COMPLETED", ...KANBAN_COLUMNS.slice(3)] : [...KANBAN_COLUMNS];
    return order.map((status) => ({ status, tasks: tasks.filter((t) => t.status === status) }));
  }, [tasks]);
  const active = tasks.find((t) => t.id === activeId) ?? null;

  const label = (id: string | number | undefined) => (typeof id === "string" && id in TASK_STATUS_META ? TASK_STATUS_META[id as TaskStatus].label : "");
  const title = (id: string | number) => tasks.find((t) => t.id === id)?.title ?? "task";
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${title(a.id)}.`,
    onDragOver: ({ active: a, over }) => (over ? `${title(a.id)} is over ${label(over.id)}.` : `${title(a.id)} is not over a column.`),
    onDragEnd: ({ active: a, over }) => (over ? `${title(a.id)} dropped in ${label(over.id)}.` : `${title(a.id)} dropped.`),
    onDragCancel: ({ active: a }) => `Moving ${title(a.id)} was cancelled.`,
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const task = tasks.find((t) => t.id === e.active.id);
    const target = e.over?.id as TaskStatus | undefined;
    if (!task || !target || target === task.status) return;
    const move = moveFor(target);
    // Optimistic update + rollback on failure lives in the mutation hooks.
    if (move.kind === "status") updateStatus.mutate({ id: task.id, status: move.status });
    else if (move.kind === "submit") submit.mutate({ id: task.id });
    else if (move.kind === "approve") approve.mutate({ id: task.id });
    else setChangesFor(task); // feedback is required before the move happens
  };

  if (query.isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-hidden>
        {KANBAN_COLUMNS.map((c) => (
          <Skeleton key={c} className="h-80 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState error={query.error} title="Unable to load the board." onRetry={() => void query.refetch()} />;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)} accessibility={{ announcements }}>
        <div className="-mx-4 flex gap-3 relative overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {columns.map((c) => (
            <BoardColumn key={c.status} status={c.status} tasks={c.tasks} />
          ))}
        </div>
        <DragOverlay>{active ? <BoardCard task={active} overlay /> : null}</DragOverlay>
      </DndContext>
      {changesFor ? (
        <RequestChangesDialog taskId={changesFor.id} taskTitle={changesFor.title} open onOpenChange={(o) => !o && setChangesFor(null)} />
      ) : null}
    </>
  );
}
