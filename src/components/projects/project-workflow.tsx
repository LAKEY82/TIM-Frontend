"use client";

/**
 * The project's staged workflow: Design → Frontend + Backend → QA → Bug fixing.
 * Each stage is a task; the project manager approves it before the next one
 * opens. Managers and admins see every step here and act on it in place.
 */
import { Bug, Check, Code2, FlaskConical, Loader2, Palette, Server, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormError, FormField } from "@/components/forms/form-field";
import { SelectField, type SelectOption } from "@/components/forms/select-field";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AssigneeSelect } from "@/components/tasks/inline-pickers";
import { TaskQuickActions } from "@/components/tasks/task-quick-actions";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserOptions } from "@/hooks/queries/use-people";
import { useProjectWorkflow, useSetupWorkflow, useUpdateProject } from "@/hooks/queries/use-projects";
import { useQuickUpdateTask } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/lib/api";
import type { WorkflowPeople } from "@/lib/services/projects";
import { cn } from "@/lib/utils";
import type { Project, TaskSummary, WorkflowStage } from "@/types/domain";

export const STAGE_UI: Record<WorkflowStage, { label: string; role: string; icon: LucideIcon; step: number }> = {
  DESIGN: { label: "Design", role: "Designer", icon: Palette, step: 0 },
  FRONTEND: { label: "Frontend", role: "Frontend developer", icon: Code2, step: 1 },
  BACKEND: { label: "Backend", role: "Backend developer", icon: Server, step: 1 },
  QA: { label: "QA testing", role: "QA", icon: FlaskConical, step: 2 },
  BUG_FIXING: { label: "Bug fixing", role: "Bug fixing", icon: Bug, step: 3 },
};

/** One line on where a stage stands, so a manager can read the whole flow at a glance. */
export function stageHint(t: TaskSummary, stages: TaskSummary[]): string {
  const who = t.assignee?.name;
  const bugs = t.stage === "BUG_FIXING" && t.subtaskCount ? ` · ${t.completedSubtaskCount ?? 0}/${t.subtaskCount} bugs fixed` : "";
  switch (t.status) {
    case "WAITING": {
      if (t.stage === "BUG_FIXING") return "Opens if QA reports bugs.";
      if (t.stage === "QA") {
        const fixing = stages.some((s) => s.stage === "BUG_FIXING" && s.status !== "WAITING" && s.status !== "APPROVED");
        return fixing ? "Waiting for the bug fixes to be approved, then retest." : "Opens when development is approved.";
      }
      if (t.stage === "FRONTEND" || t.stage === "BACKEND") return stages.some((s) => s.stage === "DESIGN") ? "Opens when Design is approved." : "Waiting for the previous stage.";
      return "Waiting for the previous stage.";
    }
    case "TODO":
      return (who ? `Ready for ${who} to start.` : "Ready to start — assign someone.") + bugs;
    case "IN_PROGRESS":
      return `${who ?? "Someone"} is working on it.` + bugs;
    case "BLOCKED":
      return `Blocked${who ? ` (${who})` : ""}.` + bugs;
    case "COMPLETED":
      if (t.stage !== "QA" && (t.subtaskCount ?? 0) > 0) return "Every subtask is completed. The project manager sets it to Testing.";
      return `Done — waiting for ${who ?? "the assignee"} to send it for review.` + bugs;
    case "IN_REVIEW":
      return `Waiting for ${t.reviewer?.name ?? "the project manager"} to approve.` + bugs;
    case "IN_QA":
      if (t.stage !== "QA" && (t.subtaskCount ?? 0) > 0) return "QA is testing its subtasks.";
      return t.qa ? `${t.qa.name} is testing.` : "Waiting for a QA to be assigned to the project.";
    case "TESTED":
      return "QA finished testing every subtask. The project manager approves it to open the next stage." + bugs;
    case "CHANGES_REQUESTED":
      return `Changes requested — back with ${who ?? "the assignee"}.` + bugs;
    case "APPROVED":
      return t.stage === "QA" ? "Passed QA." : "Approved." + bugs;
    default:
      return "";
  }
}

export function ProjectWorkflow({ project }: { project: Project }) {
  const canManage = usePermission("projects:update");
  const query = useProjectWorkflow(project.id);
  const [setupOpen, setSetupOpen] = useState(false);
  const stages = query.data ?? [];

  if (query.isLoading) {
    return (
      <SectionCard title="Workflow">
        <ListSkeleton rows={3} />
      </SectionCard>
    );
  }
  if (query.isError) return <ErrorState error={query.error} title="Unable to load the workflow." onRetry={() => void query.refetch()} />;

  if (stages.length === 0) {
    if (!canManage) return null;
    return (
      <SectionCard title="Workflow">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Break this project into Design → Frontend + Backend → QA → Bug fixing. Each stage goes to you for approval before the next one opens.
          </p>
          <Button size="sm" onClick={() => setSetupOpen(true)}>
            <Workflow /> Set up workflow
          </Button>
        </div>
        <WorkflowSetupDialog project={project} open={setupOpen} onOpenChange={setSetupOpen} />
      </SectionCard>
    );
  }

  const done = stages.filter((s) => s.status === "APPROVED").length;
  return (
    <SectionCard
      title="Workflow"
      description={`${done} of ${stages.length} stages approved · the project manager approves each stage before the next one opens`}
    >
      <ol className="space-y-2" aria-label="Workflow stages">
        {stages.map((t) => (
          <StageRow key={t.id} task={t} stages={stages} project={project} canManage={canManage} />
        ))}
      </ol>
    </SectionCard>
  );
}

function StageRow({ task, stages, project, canManage }: { task: TaskSummary; stages: TaskSummary[]; project: Project; canManage: boolean }) {
  const stage = task.stage!;
  const ui = STAGE_UI[stage];
  const updateTask = useQuickUpdateTask();
  const updateProject = useUpdateProject(project.id);
  const approved = task.status === "APPROVED";
  const active = !approved && task.status !== "WAITING";
  const Icon = approved ? Check : ui.icon;
  // Steps are numbered by level: Frontend and Backend share a step and run in parallel.
  const steps = [...new Set(stages.map((s) => STAGE_UI[s.stage!].step))].sort();
  const stepNo = steps.indexOf(ui.step) + 1;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center",
        active ? "border-primary/40 bg-primary/5" : approved ? "bg-muted/30" : "border-dashed",
      )}
      aria-current={active ? "step" : undefined}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
            approved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : active ? "border-primary/40 bg-background text-primary" : "text-muted-foreground",
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Step {stepNo}</span>
            <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline">
              {ui.label}
            </Link>
            <TaskStatusBadge status={task.status} />
          </div>
          <p className="text-xs text-muted-foreground">{stageHint(task, stages)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <div className="flex items-center gap-1.5" title={ui.role}>
          <span className="sr-only">{ui.role}:</span>
          {canManage && !approved ? (
            <AssigneeSelect
              value={task.assignee}
              projectId={project.id}
              showName
              clearable={stage !== "QA"}
              noun={ui.role}
              emptyLabel={`Assign ${ui.role.toLowerCase()}`}
              onChange={(user) =>
                // The QA stage follows the project's QA.
                stage === "QA"
                  ? user && updateProject.mutate({ qaId: user.id })
                  : updateTask.mutate({ id: task.id, input: { assigneeId: user?.id ?? null }, optimistic: { assignee: user } })
              }
            />
          ) : task.assignee ? (
            <span className="flex items-center gap-1.5 text-sm">
              <UserAvatar user={task.assignee} size="sm" />
              {task.assignee.name}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )}
        </div>
        <TaskQuickActions task={task} size="xs" />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// People per stage (used by the create form and the setup dialog)
// ---------------------------------------------------------------------------

type PeopleKey = keyof Required<WorkflowPeople>;
const PEOPLE_FIELDS: { key: PeopleKey; label: string; none: string; hint?: string }[] = [
  { key: "designerId", label: "Designer", none: "No design stage" },
  { key: "frontendId", label: "Frontend developer", none: "No frontend stage" },
  { key: "backendId", label: "Backend developer", none: "No backend stage" },
  { key: "bugFixerId", label: "Bug fixing", none: "Same as the frontend developer", hint: "Gets the bugs QA reports." },
];

export function WorkflowPeopleFields({
  idPrefix,
  userOptions,
  value,
  onChange,
  error,
}: {
  idPrefix: string;
  userOptions: SelectOption[];
  value: Required<{ [K in PeopleKey]: string | null | undefined }>;
  onChange: (key: PeopleKey, value: string | null) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {PEOPLE_FIELDS.map((f) => (
          <FormField key={f.key} id={`${idPrefix}-${f.key}`} label={f.label} hint={f.hint}>
            <SelectField
              id={`${idPrefix}-${f.key}`}
              value={value[f.key] ?? null}
              onChange={(v) => onChange(f.key, v)}
              options={userOptions}
              noneLabel={f.none}
              placeholder={f.none}
            />
          </FormField>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">QA testing goes to the project&apos;s QA. Leave a stage empty to skip it.</p>
    </div>
  );
}

function WorkflowSetupDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const users = useUserOptions({}, open);
  const setup = useSetupWorkflow(project.id);
  const [people, setPeople] = useState<Required<{ [K in PeopleKey]: string | null }>>({ designerId: null, frontendId: null, backendId: null, bugFixerId: null });
  const [qaId, setQaId] = useState<string | null>(project.qa?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const userOptions = (users.data ?? []).map((u) => ({ value: u.id, label: u.name }));

  const submit = async () => {
    setError(null);
    if (!people.designerId && !people.frontendId && !people.backendId) return setError("Assign at least a designer or a developer.");
    if (!qaId) return setError("Choose the QA who tests the work.");
    try {
      await setup.mutateAsync({ ...people, qaId });
      onOpenChange(false);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !setup.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Set up workflow</DialogTitle>
          <DialogDescription>
            Design → Frontend + Backend → QA → Bug fixing. Each person gets their stage as a task; it opens when you approve the stage before it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormError message={error} />
          <WorkflowPeopleFields idPrefix="wf-setup" userOptions={userOptions} value={people} onChange={(k, v) => setPeople((p) => ({ ...p, [k]: v }))} />
          <FormField id="wf-setup-qa" label="QA" required>
            <SelectField id="wf-setup-qa" value={qaId} onChange={setQaId} options={userOptions} placeholder="Select the QA person" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={setup.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={setup.isPending}>
            {setup.isPending ? <Loader2 className="animate-spin" /> : <Workflow />} Create stages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
