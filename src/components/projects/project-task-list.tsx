"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CornerDownRight, Flag, ListPlus, ListTree, Loader2, MessageSquare, Plus, Search, UserRound } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  AssigneeSelect,
  TaskAssigneePicker,
  TaskDueDatePicker,
  TaskPriorityPicker,
  TaskQaDueDatePicker,
  TaskQaPicker,
  TaskStatusPicker,
} from "@/components/tasks/inline-pickers";
import { TaskCreateButton } from "@/components/tasks/task-create-modal";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMilestones } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { useCan } from "@/hooks/use-permission";
import { getErrorMessage } from "@/lib/api";
import { DONE_STATUSES, TASK_STATUS_META } from "@/lib/constants";
import { formatHours } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { tasksService } from "@/lib/services/tasks";
import { cn } from "@/lib/utils";
import type { ID, TaskStatus, TaskSummary, UserSummary } from "@/types/domain";
import { TaskBreakdownButton, TaskBreakdownDialog } from "./task-breakdown-dialog";

type GroupBy = "status" | "assignee" | "milestone";

interface Group {
  key: string;
  label: string;
  dotClass?: string;
  avatar?: UserSummary | null;
  icon?: "milestone" | "unassigned";
  tasks: TaskSummary[];
  /** Defaults applied to tasks added from this group. */
  preset: { assignee?: UserSummary | null; milestoneId?: ID | null };
}

const STATUS_ORDER: TaskStatus[] = ["WAITING", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "IN_QA", "TESTED", "CHANGES_REQUESTED", "COMPLETED", "APPROVED"];
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[minmax(0,1fr)_9rem_7.5rem_7rem_4.5rem]";

/**
 * ClickUp-style list for a project: grouped, collapsible, nested subtasks,
 * inline editing and rapid task entry.
 */
export function ProjectTaskList({ projectId }: { projectId: ID }) {
  const can = useCan();
  const canEdit = can("tasks:assign");
  const canCreate = can("tasks:create");
  const query = useTasks({ projectId, pageSize: 500, sortBy: "createdAt", sortOrder: "asc" });
  const milestones = useMilestones({ projectId });
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["status:COMPLETED", "status:APPROVED"]));
  const [expanded, setExpanded] = useState<Set<ID>>(() => new Set());
  const [openTaskId, setOpenTaskId] = useState<ID | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<TaskSummary | null>(null);

  const all = useMemo(() => query.data?.items ?? [], [query.data]);
  const { topLevel, childrenOf } = useMemo(() => {
    const ids = new Set(all.map((t) => t.id));
    const children = new Map<ID, TaskSummary[]>();
    const top: TaskSummary[] = [];
    for (const t of all) {
      if (t.parentId && ids.has(t.parentId)) children.set(t.parentId, [...(children.get(t.parentId) ?? []), t]);
      else top.push(t);
    }
    return { topLevel: top, childrenOf: children };
  }, [all]);

  // Searching shows matching tasks (including subtasks) as a flat list.
  const q = search.trim().toLowerCase();
  const visible = q ? all.filter((t) => t.title.toLowerCase().includes(q)) : topLevel;

  const groups = useMemo<Group[]>(() => {
    if (groupBy === "status") {
      return STATUS_ORDER.map((status) => ({
        key: `status:${status}`,
        label: TASK_STATUS_META[status].label,
        dotClass: TASK_STATUS_META[status].dot,
        tasks: visible.filter((t) => t.status === status),
        preset: {},
      })).filter((g) => g.tasks.length > 0 || (g.key === "status:TODO" && !q));
    }
    if (groupBy === "assignee") {
      const people = new Map<ID, UserSummary>();
      for (const t of visible) if (t.assignee) people.set(t.assignee.id, t.assignee);
      const byName = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
      return [
        ...byName.map((u) => ({ key: `user:${u.id}`, label: u.name, avatar: u, tasks: visible.filter((t) => t.assignee?.id === u.id), preset: { assignee: u } })),
        { key: "user:none", label: "Unassigned", icon: "unassigned" as const, tasks: visible.filter((t) => !t.assignee), preset: { assignee: null } },
      ].filter((g) => g.tasks.length > 0 || (g.key === "user:none" && !q));
    }
    const list = milestones.data ?? [];
    return [
      ...list.map((m) => ({ key: `ms:${m.id}`, label: m.name, icon: "milestone" as const, tasks: visible.filter((t) => t.milestone?.id === m.id), preset: { milestoneId: m.id } })),
      { key: "ms:none", label: "No milestone", tasks: visible.filter((t) => !t.milestone), preset: { milestoneId: null } },
    ].filter((g) => g.tasks.length > 0 || !q);
  }, [groupBy, visible, milestones.data, q]);

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  if (query.isLoading) return <TableSkeleton columns={5} rows={8} />;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load tasks." onRetry={() => void query.refetch()} />;

  if (all.length === 0) {
    return (
      <>
        <EmptyState
          icon={ListTree}
          title="This project has no tasks yet."
          description="Break the work into tasks and assign a developer to each one."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <TaskBreakdownButton projectId={projectId} variant="default" />
              <TaskCreateButton defaults={{ projectId }} />
            </div>
          }
        />
      </>
    );
  }

  const done = all.filter((t) => DONE_STATUSES.includes(t.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" className="pl-8" />
        </div>
        <ToggleGroup type="single" variant="outline" size="sm" value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)} aria-label="Group tasks by">
          <ToggleGroupItem value="status">Status</ToggleGroupItem>
          <ToggleGroupItem value="assignee">Assignee</ToggleGroupItem>
          <ToggleGroupItem value="milestone">Milestone</ToggleGroupItem>
        </ToggleGroup>
        <span className="text-sm text-muted-foreground">
          {done}/{all.length} done
        </span>
        <div className="ml-auto flex gap-2">
          <TaskBreakdownButton projectId={projectId} />
          <TaskCreateButton defaults={{ projectId }} />
        </div>
      </div>

      <div className="space-y-5">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.key);
          return (
            <section key={group.key} aria-label={`${group.label}, ${group.tasks.length} tasks`}>
              <button
                type="button"
                onClick={() => setCollapsed((s) => toggle(s, group.key))}
                aria-expanded={!isCollapsed}
                className="mb-1 flex items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isCollapsed ? <ChevronRight className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                {group.dotClass ? <span className={cn("size-2.5 rounded-full", group.dotClass)} aria-hidden /> : null}
                {group.avatar ? <UserAvatar user={group.avatar} size="xs" /> : null}
                {group.icon === "unassigned" ? <UserRound className="size-4 text-muted-foreground" aria-hidden /> : null}
                {group.icon === "milestone" ? <Flag className="size-4 text-muted-foreground" aria-hidden /> : null}
                <span>{group.label}</span>
                <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">{group.tasks.length}</span>
              </button>

              {!isCollapsed ? (
                <div className="overflow-hidden rounded-lg border">
                  <div className={cn(GRID, "hidden border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground md:grid")}>
                    <span>Name</span>
                    {/* A task in QA is with its tester, against the QA due date. */}
                    <span>{group.tasks.length > 0 && group.tasks.every((t) => t.status === "IN_QA") ? "QA tester" : "Assignee"}</span>
                    <span>{group.tasks.length > 0 && group.tasks.every((t) => t.status === "IN_QA") ? "QA due" : "Due date"}</span>
                    <span>Priority</span>
                    <span className="text-right">Est.</span>
                  </div>
                  <ul>
                    {group.tasks.map((task) => (
                      <TaskTreeRow
                        key={task.id}
                        task={task}
                        depth={0}
                        childrenOf={q ? new Map() : childrenOf}
                        expanded={expanded}
                        onToggle={(id) => setExpanded((s) => toggle(s, id))}
                        onOpen={setOpenTaskId}
                        onBreakdown={setBreakdownFor}
                        canEdit={canEdit}
                        canCreate={canCreate}
                        projectId={projectId}
                      />
                    ))}
                  </ul>
                  {canCreate && !q ? <QuickAddRow projectId={projectId} preset={group.preset} /> : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <TaskDrawer taskId={openTaskId} onOpenChange={(open) => !open && setOpenTaskId(null)} />
      {breakdownFor ? (
        <TaskBreakdownDialog
          projectId={projectId}
          parentTask={breakdownFor}
          open
          onOpenChange={(open) => !open && setBreakdownFor(null)}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

interface TaskTreeRowProps {
  task: TaskSummary;
  depth: number;
  childrenOf: Map<ID, TaskSummary[]>;
  expanded: Set<ID>;
  onToggle: (id: ID) => void;
  onOpen: (id: ID) => void;
  onBreakdown: (task: TaskSummary) => void;
  canEdit: boolean;
  canCreate: boolean;
  projectId: ID;
}

function TaskTreeRow({ task, depth, childrenOf, expanded, onToggle, onOpen, onBreakdown, canEdit, canCreate, projectId }: TaskTreeRowProps) {
  const children = childrenOf.get(task.id) ?? [];
  const isOpen = expanded.has(task.id);
  const done = DONE_STATUSES.includes(task.status);
  const doneChildren = children.filter((c) => DONE_STATUSES.includes(c.status)).length;

  // Plain click opens the side panel; Ctrl/Cmd/middle-click still opens the page.
  const openPanel = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen(task.id);
  };

  return (
    <li className="border-b last:border-b-0">
      <div className={cn(GRID, "group px-3 py-1.5 hover:bg-muted/40")}>
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 22 }}>
          {children.length > 0 ? (
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} subtasks of ${task.title}`}
              className="rounded p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="w-[22px] shrink-0" aria-hidden>
              {depth > 0 ? <CornerDownRight className="size-3.5 text-muted-foreground/60" /> : null}
            </span>
          )}
          <TaskStatusPicker task={task} />
          <a
            href={`/tasks/${task.id}`}
            onClick={openPanel}
            className={cn("min-w-0 truncate text-sm font-medium outline-none hover:underline focus-visible:underline", done && "text-muted-foreground line-through")}
          >
            {task.title}
          </a>
          {children.length > 0 ? (
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 text-xs text-muted-foreground hover:bg-muted"
              title="Subtasks"
            >
              <ListTree className="size-3" aria-hidden />
              {doneChildren}/{children.length}
            </button>
          ) : null}
          {task.commentCount ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground" title="Comments">
              <MessageSquare className="size-3" aria-hidden />
              {task.commentCount}
            </span>
          ) : null}
          {canCreate && depth === 0 ? (
            <button
              type="button"
              onClick={() => onBreakdown(task)}
              className="ml-1 hidden shrink-0 items-center gap-0.5 rounded px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:inline-flex"
              aria-label={`Break ${task.title} into subtasks`}
            >
              <ListPlus className="size-3" /> Subtasks
            </button>
          ) : null}
        </div>
        {task.status === "IN_QA" ? (
          <>
            <TaskQaPicker task={task} projectId={projectId} disabled={!canEdit} />
            <span className="hidden md:inline-flex">
              <TaskQaDueDatePicker task={task} disabled={!canEdit} />
            </span>
          </>
        ) : (
          <>
            <TaskAssigneePicker task={task} projectId={projectId} disabled={!canEdit} showName={false} />
            <span className="hidden md:inline-flex">
              <TaskDueDatePicker task={task} disabled={!canEdit} />
            </span>
          </>
        )}
        <span className="hidden md:inline-flex">
          <TaskPriorityPicker task={task} disabled={!canEdit} />
        </span>
        <span className="hidden text-right text-xs text-muted-foreground tabular-nums md:block">{task.estimatedHours ? formatHours(task.estimatedHours) : "—"}</span>
      </div>

      {isOpen && (children.length > 0 || canCreate) ? (
        <ul className="border-t bg-muted/20">
          {children.map((child) => (
            <TaskTreeRow
              key={child.id}
              task={child}
              depth={depth + 1}
              childrenOf={childrenOf}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
              onBreakdown={onBreakdown}
              canEdit={canEdit}
              canCreate={canCreate}
              projectId={projectId}
            />
          ))}
          {canCreate ? <QuickAddRow projectId={projectId} parent={task} depth={depth + 1} preset={{ milestoneId: task.milestone?.id ?? null }} /> : null}
        </ul>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Rapid entry: type, (optionally) pick someone, press Enter, keep going
// ---------------------------------------------------------------------------

function QuickAddRow({
  projectId,
  preset,
  parent,
  depth = 0,
}: {
  projectId: ID;
  preset: Group["preset"];
  parent?: TaskSummary;
  depth?: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<UserSummary | null>(preset.assignee ?? null);
  const [saving, setSaving] = useState(false);
  const label = parent ? "Add subtask" : "Add task";

  const save = async () => {
    const value = title.trim();
    if (value.length < 3) {
      toast.error("Task names need at least 3 characters.");
      return;
    }
    setSaving(true);
    try {
      await tasksService.create({
        title: value,
        projectId,
        parentId: parent?.id ?? null,
        milestoneId: preset.milestoneId ?? parent?.milestone?.id ?? null,
        assigneeId: assignee?.id ?? null,
        priority: parent?.priority ?? "MEDIUM",
        type: parent?.type ?? "FEATURE",
        tags: [],
      });
      setTitle("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-muted-foreground outline-none hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/40"
        style={{ paddingLeft: 12 + depth * 22 + 22 }}
      >
        <Plus className="size-3.5" aria-hidden /> {label}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2 border-t bg-background px-3 py-1.5"
      style={{ paddingLeft: 12 + depth * 22 }}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder={parent ? `Subtask of ${parent.title}… (Enter to save, Esc to close)` : "Task name… (Enter to save, Esc to close)"}
        aria-label={label}
        className="h-8"
        disabled={saving}
      />
      <AssigneeSelect value={assignee} onChange={setAssignee} projectId={projectId} showName className="shrink-0" />
      <Button type="submit" size="sm" disabled={saving || title.trim().length < 3}>
        {saving ? <Loader2 className="animate-spin" /> : null}
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
