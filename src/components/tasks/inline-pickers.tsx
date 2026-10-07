"use client";

/**
 * ClickUp-style inline controls for task rows. Each one edits a single field
 * through the API (optimistically) and falls back to a read-only display when
 * the user can't change it. The API remains the authority on every change.
 */
import { CalendarDays, Check, ChevronDown, Flag, FlaskConical, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectMembers } from "@/hooks/queries/use-projects";
import { useUserOptions } from "@/hooks/queries/use-people";
import { useApproveTask, useQaComplete, useQuickUpdateTask, useSubmitForReview, useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { PRIORITY_META, TASK_STATUS_META } from "@/lib/constants";
import { toDate, toISODate } from "@/lib/format";
import { statusOptions } from "@/lib/task-workflow";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { PRIORITIES, type ID, type Priority, type TaskStatus, type TaskSummary, type UserSummary } from "@/types/domain";
import { QaBugsDialog } from "./qa-bugs-dialog";
import { RequestChangesDialog } from "./request-changes-dialog";
import { TaskDueDate } from "./task-due-date";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TASK_STATUS_ICONS } from "./task-status-badge";

// ---------------------------------------------------------------------------
// Assignee
// ---------------------------------------------------------------------------

interface AssigneeSelectProps {
  value: UserSummary | null | undefined;
  onChange: (user: UserSummary | null) => void;
  /** Project members are listed first. */
  projectId?: ID;
  disabled?: boolean;
  /** Show the name next to the avatar. */
  showName?: boolean;
  className?: string;
  /** Offer "Unassign" (default true). */
  clearable?: boolean;
  /** What the person is, for screen readers ("assignee", "QA"). */
  noun?: string;
  emptyLabel?: string;
}

/** Searchable people picker: project members first, then everyone else. */
export function AssigneeSelect({
  value,
  onChange,
  projectId,
  disabled,
  showName = false,
  className,
  clearable = true,
  noun = "assignee",
  emptyLabel = "Unassigned",
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const members = useProjectMembers(projectId);
  const everyone = useUserOptions({}, open);
  const memberIds = useMemo(() => new Set((members.data ?? []).map((m) => m.id)), [members.data]);
  const others = (everyone.data ?? []).filter((u) => !memberIds.has(u.id));

  const pick = (user: UserSummary | null) => {
    setOpen(false);
    if ((user?.id ?? null) !== (value?.id ?? null)) onChange(user);
  };

  const trigger = value ? (
    <span className="flex min-w-0 items-center gap-1.5">
      <UserAvatar user={value} size="sm" />
      {showName ? <span className="truncate text-sm">{value.name}</span> : null}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="flex size-6 items-center justify-center rounded-full border border-dashed">
        <UserPlus className="size-3" aria-hidden />
      </span>
      {showName ? <span className="text-sm">{emptyLabel}</span> : null}
    </span>
  );

  if (disabled) {
    return (
      <span className={cn("inline-flex", className)} title={value?.name ?? emptyLabel}>
        {trigger}
      </span>
    );
  }

  const item = (u: UserSummary) => (
    <CommandItem key={u.id} value={`${u.name} ${u.id}`} onSelect={() => pick(u)}>
      <UserAvatar user={u} size="xs" />
      <span className="truncate">{u.name}</span>
      {u.id === value?.id ? <Check className="ml-auto size-4" aria-hidden /> : null}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex min-w-0 items-center rounded-md p-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", className)}
          aria-label={value ? `${noun === "assignee" ? "Assignee" : noun}: ${value.name}. Change ${noun}` : noun === "assignee" ? "Assign someone" : `Assign ${noun}`}
          onClick={(e) => e.stopPropagation()}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            {value && clearable ? (
              <CommandGroup>
                <CommandItem value="unassign" onSelect={() => pick(null)}>
                  <X className="size-4" aria-hidden /> Unassign
                </CommandItem>
              </CommandGroup>
            ) : null}
            {(members.data ?? []).length > 0 ? <CommandGroup heading="Project members">{members.data!.map(item)}</CommandGroup> : null}
            {others.length > 0 ? <CommandGroup heading={projectId ? "Everyone else" : "People"}>{others.map(item)}</CommandGroup> : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Assignee picker bound to a task: saves on change. */
export function TaskAssigneePicker({ task, projectId, disabled, showName }: { task: TaskSummary; projectId?: ID; disabled?: boolean; showName?: boolean }) {
  const update = useQuickUpdateTask();
  return (
    <AssigneeSelect
      value={task.assignee}
      projectId={projectId ?? task.project?.id}
      disabled={disabled}
      showName={showName}
      onChange={(user) => update.mutate({ id: task.id, input: { assigneeId: user?.id ?? null }, optimistic: { assignee: user } })}
    />
  );
}

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export function PrioritySelect({ value, onChange, disabled }: { value: Priority; onChange: (p: Priority) => void; disabled?: boolean }) {
  if (disabled) return <TaskPriorityBadge priority={value} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Priority: ${PRIORITY_META[value].label}. Change priority`}
          onClick={(e) => e.stopPropagation()}
        >
          <TaskPriorityBadge priority={value} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Priority</DropdownMenuLabel>
        {[...PRIORITIES].reverse().map((p) => (
          <DropdownMenuItem key={p} onSelect={() => p !== value && onChange(p)}>
            <Flag className={cn("size-4", PRIORITY_META[p].ink)} aria-hidden />
            {PRIORITY_META[p].label}
            {p === value ? <Check className="ml-auto size-4" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskPriorityPicker({ task, disabled }: { task: TaskSummary; disabled?: boolean }) {
  const update = useQuickUpdateTask();
  return (
    <PrioritySelect
      value={task.priority}
      disabled={disabled}
      onChange={(priority) => update.mutate({ id: task.id, input: { priority }, optimistic: { priority } })}
    />
  );
}

// ---------------------------------------------------------------------------
// Due date
// ---------------------------------------------------------------------------

export function DueDateSelect({
  value,
  onChange,
  disabled,
  status,
  label = "due date",
}: {
  value: string | null | undefined;
  onChange: (day: string | null) => void;
  disabled?: boolean;
  status?: TaskStatus;
  /** What the date is, for screen readers ("due date", "QA deadline"). */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const day = toDate(value);
  const display = value ? (
    <TaskDueDate dueDate={value} status={status} />
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CalendarDays className="size-3.5" aria-hidden /> {disabled ? "—" : "Set date"}
    </span>
  );
  if (disabled) return display;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md px-1 py-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={value ? `Change ${label}` : `Set ${label}`}
          onClick={(e) => e.stopPropagation()}
        >
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 space-y-2 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <Input
          type="date"
          aria-label={label.charAt(0).toUpperCase() + label.slice(1)}
          defaultValue={day ? toISODate(day) : ""}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              setOpen(false);
            }
          }}
        />
        <div className="flex justify-between gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              onChange(toISODate(new Date()));
              setOpen(false);
            }}
          >
            Today
          </Button>
          {value ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X /> Clear
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskDueDatePicker({ task, disabled }: { task: TaskSummary; disabled?: boolean }) {
  const update = useQuickUpdateTask();
  return (
    <DueDateSelect
      value={task.dueDate}
      status={task.status}
      disabled={disabled}
      onChange={(dueDate) => update.mutate({ id: task.id, input: { dueDate }, optimistic: { dueDate } })}
    />
  );
}

/** Who tests the task in QA. The project manager picks them; the developer can't test their own work. */
export function TaskQaPicker({ task, projectId, disabled, showName }: { task: TaskSummary; projectId?: ID; disabled?: boolean; showName?: boolean }) {
  const update = useQuickUpdateTask();
  return (
    <span className="relative inline-flex w-fit min-w-0 justify-self-start" title={`QA tester${task.assignee ? ` · developer: ${task.assignee.name}` : ""}`}>
      <AssigneeSelect
        value={task.qa}
        projectId={projectId ?? task.project?.id}
        disabled={disabled}
        showName={showName}
        clearable={false}
        noun="QA tester"
        emptyLabel="Choose QA tester"
        onChange={(user) => user && update.mutate({ id: task.id, input: { qaId: user.id }, optimistic: { qa: user } })}
      />
      {showName ? null : <FlaskConical className="pointer-events-none absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-background text-cyan-600" aria-hidden />}
    </span>
  );
}

/**
 * QA deadline: when the QA should finish testing. Only shown as overdue while the
 * task is still waiting in QA.
 */
export function TaskQaDueDatePicker({ task, disabled }: { task: TaskSummary; disabled?: boolean }) {
  const update = useQuickUpdateTask();
  return (
    <DueDateSelect
      value={task.qaDueDate}
      status={task.status === "IN_QA" ? "IN_QA" : "APPROVED"}
      disabled={disabled}
      label="QA deadline"
      onChange={(qaDueDate) => update.mutate({ id: task.id, input: { qaDueDate }, optimistic: { qaDueDate } })}
    />
  );
}

// ---------------------------------------------------------------------------
// Status (icon button, like ClickUp's status circle)
// ---------------------------------------------------------------------------

export function TaskStatusPicker({ task, withLabel = false }: { task: TaskSummary; withLabel?: boolean }) {
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();
  const submit = useSubmitForReview();
  const approve = useApproveTask();
  const [changesOpen, setChangesOpen] = useState(false);
  const [bugsOpen, setBugsOpen] = useState(false);
  const qaComplete = useQaComplete();
  const options = statusOptions(task, user);
  const meta = TASK_STATUS_META[task.status];
  const Icon = TASK_STATUS_ICONS[task.status];

  const face = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md text-xs font-medium", withLabel && cn("border px-1.5 py-0.5", meta.badge))}>
      <Icon className={cn("size-4", !withLabel && meta.ink)} aria-hidden />
      {withLabel ? meta.label : <span className="sr-only">{meta.label}</span>}
    </span>
  );

  const move = (status: TaskStatus) => {
    // QA decisions on a task in QA.
    if (task.status === "IN_QA" && status === "APPROVED") return qaComplete.mutate({ id: task.id });
    if (task.status === "IN_QA" && status === "CHANGES_REQUESTED") return setBugsOpen(true);
    // Review outcomes go through the review endpoints so history is recorded.
    if (status === "CHANGES_REQUESTED") return setChangesOpen(true);
    if (status === "IN_REVIEW") return submit.mutate({ id: task.id });
    // Approved approves the review. In QA (via the status endpoint) approves a reviewed task and sends it to QA,
    // or sends a completed task, or a stage's subtasks, to QA.
    if (status === "APPROVED") return approve.mutate({ id: task.id });
    updateStatus.mutate({ id: task.id, status });
  };
  // In QA, the two choices read as QA outcomes rather than generic statuses.
  const optionLabel = (s: TaskStatus) =>
    task.status === "IN_QA" && s === "APPROVED" ? "QA complete" : task.status === "IN_QA" && s === "CHANGES_REQUESTED" ? "Report issues…" : TASK_STATUS_META[s].label;

  if (options.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex p-0.5">{face}</span>
        </TooltipTrigger>
        <TooltipContent>{meta.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-md p-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Status: ${meta.label}. Change status`}
            onClick={(e) => e.stopPropagation()}
          >
            {face}
            {withLabel ? <ChevronDown className="ml-0.5 size-3.5 self-center text-muted-foreground" aria-hidden /> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {options.map((s) => {
            const SIcon = TASK_STATUS_ICONS[s];
            return (
              <DropdownMenuItem key={s} onSelect={() => move(s)}>
                <SIcon className={cn("size-4", TASK_STATUS_META[s].ink)} aria-hidden />
                {optionLabel(s)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <RequestChangesDialog taskId={task.id} taskTitle={task.title} open={changesOpen} onOpenChange={setChangesOpen} />
      <QaBugsDialog taskId={task.id} taskTitle={task.title} stage={task.stage} open={bugsOpen} onOpenChange={setBugsOpen} />
    </>
  );
}
