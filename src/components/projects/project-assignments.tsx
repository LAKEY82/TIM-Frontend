"use client";

import { ChevronDown, ChevronRight, CornerDownRight, ListTree, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskStatusPicker } from "@/components/tasks/inline-pickers";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/hooks/queries/use-tasks";
import { DONE_STATUSES, TASK_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ID, TaskStatus, TaskSummary, UserSummary } from "@/types/domain";
import { TaskBreakdownButton } from "./task-breakdown-dialog";

const STATUS_ORDER: TaskStatus[] = ["IN_PROGRESS", "BLOCKED", "IN_REVIEW", "IN_QA", "CHANGES_REQUESTED", "TODO", "WAITING", "COMPLETED", "TESTED", "APPROVED"];
const PREVIEW = 5;

interface PersonGroup {
  key: string;
  person: UserSummary | null;
  tasks: TaskSummary[];
  counts: Partial<Record<TaskStatus, number>>;
  done: number;
}

/**
 * Who is working on what in a project: every task grouped by assignee, with
 * its live status, so a project manager can see progress per person at a glance.
 */
export function ProjectAssignments({ projectId }: { projectId: ID }) {
  const query = useTasks({ projectId, pageSize: 500, sortBy: "dueDate", sortOrder: "asc" });
  const [showFinished, setShowFinished] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [openTaskId, setOpenTaskId] = useState<ID | null>(null);

  const all = useMemo(() => query.data?.items ?? [], [query.data]);
  const titleOf = useMemo(() => new Map(all.map((t) => [t.id, t.title])), [all]);

  const groups = useMemo<PersonGroup[]>(() => {
    const byPerson = new Map<string, PersonGroup>();
    for (const t of all) {
      const key = t.assignee?.id ?? "unassigned";
      const g = byPerson.get(key) ?? { key, person: t.assignee ?? null, tasks: [], counts: {}, done: 0 };
      g.tasks.push(t);
      g.counts[t.status] = (g.counts[t.status] ?? 0) + 1;
      if (DONE_STATUSES.includes(t.status)) g.done += 1;
      byPerson.set(key, g);
    }
    // Most active work first within each person: in progress, blocked, review, then to-do, then finished.
    for (const g of byPerson.values()) g.tasks.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    return [...byPerson.values()].sort((a, b) => {
      if (!a.person) return 1;
      if (!b.person) return -1;
      return a.person.name.localeCompare(b.person.name);
    });
  }, [all]);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  return (
    <SectionCard
      title="Task assignments"
      description={all.length ? `${all.length} task${all.length === 1 ? "" : "s"} across ${groups.filter((g) => g.person).length} ${groups.filter((g) => g.person).length === 1 ? "person" : "people"}` : undefined}
      action={
        all.length ? (
          <div className="flex items-center gap-2">
            <Switch id="assignments-finished" checked={showFinished} onCheckedChange={setShowFinished} />
            <Label htmlFor="assignments-finished" className="text-xs font-normal text-muted-foreground">
              Show finished
            </Label>
          </div>
        ) : null
      }
    >
      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load assignments." onRetry={() => void query.refetch()} compact />
      ) : all.length === 0 ? (
        <EmptyState
          icon={ListTree}
          title="No tasks assigned yet."
          description="Break the project into tasks and assign a developer to each."
          action={<TaskBreakdownButton projectId={projectId} />}
          compact
        />
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            const visible = showFinished ? g.tasks : g.tasks.filter((t) => !DONE_STATUSES.includes(t.status));
            const showAll = expanded.has(g.key);
            const shown = showAll ? visible : visible.slice(0, PREVIEW);
            const pct = g.tasks.length ? Math.round((g.done / g.tasks.length) * 100) : 0;
            return (
              <li key={g.key} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setCollapsed((s) => toggle(s, g.key))}
                  aria-expanded={!isCollapsed}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : <ChevronDown className="size-4 text-muted-foreground" aria-hidden />}
                  {g.person ? (
                    <UserAvatar user={g.person} size="md" />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{g.person?.name ?? "Unassigned"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {g.done}/{g.tasks.length} done
                    </span>
                  </span>
                  <Progress value={pct} aria-label={`${g.person?.name ?? "Unassigned"}: ${pct}% done`} className="hidden h-1.5 w-24 sm:block" />
                  <span className="ml-auto flex flex-wrap justify-end gap-1.5">
                    {STATUS_ORDER.filter((s) => g.counts[s]).map((s) => (
                      <span key={s} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", TASK_STATUS_META[s].badge)}>
                        <span className={cn("size-1.5 rounded-full", TASK_STATUS_META[s].dot)} aria-hidden />
                        {g.counts[s]} {TASK_STATUS_META[s].label}
                      </span>
                    ))}
                  </span>
                </button>

                {!isCollapsed ? (
                  visible.length === 0 ? (
                    <p className="border-t px-3 py-2.5 text-xs text-muted-foreground">All of {g.person ? `${g.person.name.split(" ")[0]}'s` : "these"} tasks are finished.</p>
                  ) : (
                    <ul className="divide-y border-t">
                      {shown.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                          <TaskStatusPicker task={t} withLabel />
                          <button
                            type="button"
                            onClick={() => setOpenTaskId(t.id)}
                            className={cn(
                              "min-w-0 flex-1 truncate text-left text-sm font-medium outline-none hover:underline focus-visible:underline",
                              DONE_STATUSES.includes(t.status) && "text-muted-foreground line-through",
                            )}
                          >
                            {t.parentId ? (
                              <span className="mr-1 inline-flex items-center gap-0.5 text-xs font-normal text-muted-foreground">
                                <CornerDownRight className="size-3" aria-hidden />
                                {titleOf.get(t.parentId) ?? "Subtask"} ·
                              </span>
                            ) : null}
                            {t.title}
                          </button>
                          <TaskDueDate dueDate={t.dueDate} status={t.status} />
                          <TaskPriorityBadge priority={t.priority} iconOnly />
                        </li>
                      ))}
                      {visible.length > PREVIEW ? (
                        <li className="px-3 py-1.5">
                          <Button variant="ghost" size="xs" onClick={() => setExpanded((s) => toggle(s, g.key))}>
                            {showAll ? "Show less" : `Show all ${visible.length}`}
                          </Button>
                        </li>
                      ) : null}
                    </ul>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <TaskDrawer taskId={openTaskId} onOpenChange={(open) => !open && setOpenTaskId(null)} />
    </SectionCard>
  );
}
