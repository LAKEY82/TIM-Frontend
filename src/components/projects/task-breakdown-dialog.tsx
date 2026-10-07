"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, ListPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { AssigneeSelect, DueDateSelect, PrioritySelect } from "@/components/tasks/inline-pickers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMilestones } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage, isApiError } from "@/lib/api";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { tasksService } from "@/lib/services/tasks";
import { TASK_TYPES, type ID, type Priority, type TaskSummary, type TaskType, type UserSummary } from "@/types/domain";

interface Row {
  key: number;
  title: string;
  assignee: UserSummary | null;
  priority: Priority;
  estimatedHours: string;
  dueDate: string | null;
  error?: string;
}

let nextKey = 1;
const newRow = (title = ""): Row => ({ key: nextKey++, title, assignee: null, priority: "MEDIUM", estimatedHours: "", dueDate: null });

/** "- [ ] Build login", "1. Build login", "• Build login" → "Build login" */
export function parseTaskLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•+]|\d+[.)]|\[[ xX]\])\s*(?:\[[ xX]\]\s*)?/, "").trim())
    .filter((line) => line.length > 0);
}

interface TaskBreakdownDialogProps {
  projectId: ID;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the new tasks are created as subtasks of this task. */
  parentTask?: Pick<TaskSummary, "id" | "title" | "milestone"> | null;
  /** Pre-select a milestone (e.g. when opened from a milestone group). */
  defaultMilestoneId?: ID | null;
}

/**
 * Break a project (or a task) into many tasks at once, each with its own
 * developer, priority, estimate and due date.
 */
export function TaskBreakdownDialog({ projectId, open, onOpenChange, parentTask, defaultMilestoneId }: TaskBreakdownDialogProps) {
  const queryClient = useQueryClient();
  const milestones = useMilestones({ projectId }, open && !parentTask);
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow(), newRow()]);
  const [milestoneId, setMilestoneId] = useState<ID | null>(defaultMilestoneId ?? null);
  const [type, setType] = useState<TaskType>("FEATURE");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const titleRefs = useRef(new Map<number, HTMLInputElement>());

  const filled = useMemo(() => rows.filter((r) => r.title.trim()), [rows]);

  const update = (key: number, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch, error: undefined } : r)));
  const addRow = (focus = true) => {
    const row = newRow();
    setRows((list) => [...list, row]);
    if (focus) requestAnimationFrame(() => titleRefs.current.get(row.key)?.focus());
  };

  const addPasted = () => {
    const titles = parseTaskLines(paste);
    if (!titles.length) return;
    setRows((list) => [...list.filter((r) => r.title.trim()), ...titles.map((t) => newRow(t))]);
    setPaste("");
    setShowPaste(false);
  };

  const reset = () => {
    setRows([newRow(), newRow(), newRow()]);
    setPaste("");
    setShowPaste(false);
    setFormError(null);
    setSaving(null);
  };

  const rowError = (r: Row): string | undefined => {
    if (!r.title.trim()) return undefined;
    if (r.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (r.estimatedHours && !(/^\d+(\.\d{1,2})?$/.test(r.estimatedHours) && Number(r.estimatedHours) <= 1000)) {
      return "Hours must be a number up to 1000.";
    }
    return undefined;
  };

  const validate = (): boolean => {
    const checked = rows.map((r) => ({ ...r, error: rowError(r) }));
    setRows(checked);
    return checked.every((r) => !r.error);
  };

  const create = async () => {
    setFormError(null);
    if (!filled.length) return setFormError("Add at least one task.");
    if (!validate()) return;

    const queue = filled;
    const failed = new Map<number, string>();
    setSaving({ done: 0, total: queue.length });
    // Sequential, so the server applies the same checks and notifications per task.
    for (const [i, row] of queue.entries()) {
      try {
        await tasksService.create({
          title: row.title.trim(),
          projectId,
          parentId: parentTask?.id ?? null,
          milestoneId: parentTask ? (parentTask.milestone?.id ?? null) : milestoneId,
          assigneeId: row.assignee?.id ?? null,
          priority: row.priority,
          type,
          dueDate: row.dueDate,
          estimatedHours: row.estimatedHours ? Number(row.estimatedHours) : null,
          tags: [],
        });
      } catch (error) {
        const fieldError = isApiError(error) ? Object.values(error.fieldErrors)[0] : undefined;
        failed.set(row.key, fieldError ?? getErrorMessage(error));
      }
      setSaving({ done: i + 1, total: queue.length });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all }),
    ]);
    setSaving(null);

    const created = queue.length - failed.size;
    if (created) toast.success(`${created} task${created === 1 ? "" : "s"} created.`);
    if (failed.size) {
      // Keep only the rows that failed, with their errors, so they can be fixed and retried.
      setRows((list) => list.filter((r) => failed.has(r.key)).map((r) => ({ ...r, error: failed.get(r.key) })));
      setFormError(`${failed.size} task${failed.size === 1 ? "" : "s"} couldn't be created. Fix them below and try again.`);
    } else {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{parentTask ? `Break “${parentTask.title}” into subtasks` : "Break the project into tasks"}</DialogTitle>
          <DialogDescription>Add one task per row and choose who works on each. Empty rows are ignored.</DialogDescription>
        </DialogHeader>

        <FormError message={formError} />

        <div className="flex flex-wrap items-end gap-3">
          {!parentTask ? (
            <div className="grid gap-1.5">
              <Label htmlFor="breakdown-milestone">Milestone</Label>
              <SelectField
                id="breakdown-milestone"
                className="w-52"
                value={milestoneId}
                onChange={setMilestoneId}
                noneLabel="No milestone"
                options={(milestones.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
              />
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="breakdown-type">Type</Label>
            <SelectField
              id="breakdown-type"
              className="w-40"
              value={type}
              onChange={(v) => setType((v ?? "FEATURE") as TaskType)}
              options={TASK_TYPES.map((t) => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setShowPaste((v) => !v)}>
            <ClipboardList /> Paste a list
          </Button>
        </div>

        {showPaste ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <Label htmlFor="breakdown-paste">One task per line (bullets and numbering are removed)</Label>
            <Textarea
              id="breakdown-paste"
              rows={5}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"- Login page UI\n- Login API\n- Password reset email\n- Write tests"}
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={addPasted} disabled={!parseTaskLines(paste).length}>
                <ListPlus /> Add {parseTaskLines(paste).length || ""} tasks
              </Button>
            </div>
          </div>
        ) : null}

        <div className="relative overflow-x-auto rounded-lg border">
          <div className="grid min-w-[720px] grid-cols-[minmax(0,1fr)_9rem_6.5rem_5rem_7rem_2rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Task</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Est. h</span>
            <span>Due</span>
            <span className="sr-only">Remove</span>
          </div>
          <ul className="min-w-[720px] divide-y">
            {rows.map((row, i) => (
              <li key={row.key} className="px-3 py-2">
                <div className="grid grid-cols-[minmax(0,1fr)_9rem_6.5rem_5rem_7rem_2rem] items-center gap-2">
                  <Input
                    ref={(el) => {
                      if (el) titleRefs.current.set(row.key, el);
                      else titleRefs.current.delete(row.key);
                    }}
                    value={row.title}
                    onChange={(e) => update(row.key, { title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (i === rows.length - 1) addRow();
                        else titleRefs.current.get(rows[i + 1]!.key)?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      // Pasting several lines into a title splits them into rows.
                      const lines = parseTaskLines(e.clipboardData.getData("text"));
                      if (lines.length > 1) {
                        e.preventDefault();
                        setRows((list) => {
                          const idx = list.findIndex((r) => r.key === row.key);
                          const copy = [...list];
                          copy.splice(idx, 1, { ...row, title: lines[0]! }, ...lines.slice(1).map((t) => newRow(t)));
                          return copy;
                        });
                      }
                    }}
                    placeholder={i === 0 ? "e.g. Build the login page" : "Task name"}
                    aria-label={`Task ${i + 1} name`}
                    aria-invalid={Boolean(row.error)}
                  />
                  <AssigneeSelect value={row.assignee} onChange={(assignee) => update(row.key, { assignee })} projectId={projectId} showName className="max-w-full" />
                  <PrioritySelect value={row.priority} onChange={(priority) => update(row.key, { priority })} />
                  <Input
                    value={row.estimatedHours}
                    onChange={(e) => update(row.key, { estimatedHours: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`Task ${i + 1} estimated hours`}
                  />
                  <DueDateSelect value={row.dueDate} onChange={(dueDate) => update(row.key, { dueDate })} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove task ${i + 1}`}
                    onClick={() => setRows((list) => (list.length > 1 ? list.filter((r) => r.key !== row.key) : [newRow()]))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {row.error ? <p className="mt-1 text-xs text-destructive" role="alert">{row.error}</p> : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => addRow()}>
            <Plus /> Add row
          </Button>
        </div>

        <DialogFooter className="items-center">
          {saving ? (
            <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">
              Creating {saving.done} of {saving.total}…
            </span>
          ) : (
            <span className="mr-auto text-sm text-muted-foreground">
              {filled.length} task{filled.length === 1 ? "" : "s"} · {filled.filter((r) => r.assignee).length} assigned
            </span>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(saving)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void create()} disabled={Boolean(saving) || !filled.length}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Create {filled.length || ""} task{filled.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Button + dialog, shown only to people who can create tasks. */
export function TaskBreakdownButton({ projectId, size = "sm", variant = "outline", label = "Break into tasks" }: { projectId: ID; size?: "sm" | "default"; variant?: "outline" | "default"; label?: string }) {
  const [open, setOpen] = useState(false);
  const allowed = usePermission("tasks:create");
  if (!allowed) return null;
  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        <ListPlus /> {label}
      </Button>
      <TaskBreakdownDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  );
}
