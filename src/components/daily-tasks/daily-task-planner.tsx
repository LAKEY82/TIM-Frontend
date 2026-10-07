"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { hoursString } from "@/components/tasks/task-form-schema";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { WorkloadList } from "@/components/teams/workload-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAssignDailyTask, useDailyTasks, useDailyWorkload, useRemoveDailyTask } from "@/hooks/queries/use-misc";
import { useUserOptions } from "@/hooks/queries/use-people";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { PRIORITY_META } from "@/lib/constants";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { formatDate, formatHours, toDate, toISODate } from "@/lib/format";
import { PRIORITIES } from "@/types/domain";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  assigneeId: z.string({ required_error: "Select an employee." }).min(1, "Select an employee."),
  projectId: z.string().min(1, "Select a project."),
  taskId: z.string().min(1, "Select a task."),
  priority: z.enum(PRIORITIES),
  estimatedHours: hoursString,
  dueTime: z.string().regex(/^(\d{2}:\d{2})?$/, "Use HH:MM."),
  note: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

/** Project-manager tool for planning each employee's day. */
export function DailyTaskPlanner() {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { date: toISODate(new Date()), assigneeId: "", projectId: "", taskId: "", priority: "MEDIUM", estimatedHours: "", dueTime: "", note: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const [date, projectId] = useWatch({ control: form.control, name: ["date", "projectId"] });
  const planDate = date || toISODate(new Date());

  const users = useUserOptions();
  const projects = useProjects({ status: "ACTIVE", pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const tasks = useTasks({ projectId, pageSize: 200, sortBy: "title", sortOrder: "asc" }, { enabled: Boolean(projectId) });
  const openTasks = useMemo(
    () => (tasks.data?.items ?? []).filter((t) => t.status !== "APPROVED" && t.status !== "TESTED"),
    [tasks.data],
  );
  const assign = useAssignDailyTask();
  const remove = useRemoveDailyTask();
  const plan = useDailyTasks({ date: planDate });
  const workload = useDailyWorkload(planDate);

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await assign.mutateAsync({
        date: v.date,
        assigneeId: v.assigneeId,
        taskId: v.taskId,
        priority: v.priority,
        estimatedHours: v.estimatedHours === "" ? null : Number(v.estimatedHours),
        dueTime: emptyToNull(v.dueTime),
        note: emptyToNull(v.note.trim()),
      });
      form.reset({ ...v, taskId: "", estimatedHours: "", dueTime: "", note: "" });
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["date", "assigneeId", "taskId", "priority", "estimatedHours", "dueTime", "note"]));
    }
  });

  const e = (k: keyof Values) => errors[k]?.message;

  return (
    <div className="space-y-6">
      <PageHeader title="Daily task planner" description={`Plan and assign work for ${formatDate(toDate(planDate), "EEEE, MMMM d")}.`} />

      <div className="grid gap-4 xl:grid-cols-[26rem_1fr]">
        <SectionCard title="Assign a task">
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <FormError message={formError} />
            <div className="grid grid-cols-2 gap-4">
              <FormField id="dt-date" label="Date" error={e("date")} required>
                <Input id="dt-date" type="date" aria-invalid={Boolean(e("date"))} {...form.register("date")} />
              </FormField>
              <FormField id="dt-time" label="Due time" error={e("dueTime")}>
                <Input id="dt-time" type="time" {...form.register("dueTime")} />
              </FormField>
            </div>
            <FormField id="dt-employee" label="Employee" error={e("assigneeId")} required>
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <SelectField
                    id="dt-employee"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
                    placeholder={users.isLoading ? "Loading…" : "Select employee"}
                    invalid={Boolean(e("assigneeId"))}
                    describedBy={fieldDescribedBy("dt-employee", e("assigneeId"))}
                  />
                )}
              />
            </FormField>
            <FormField id="dt-project" label="Project" error={e("projectId")} required>
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <SelectField
                    id="dt-project"
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v ?? "");
                      form.setValue("taskId", "");
                    }}
                    options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
                    placeholder={projects.isLoading ? "Loading…" : "Select project"}
                    invalid={Boolean(e("projectId"))}
                  />
                )}
              />
            </FormField>
            <FormField id="dt-task" label="Task" error={e("taskId")} required hint={projectId && !tasks.isLoading && openTasks.length === 0 ? "This project has no open tasks." : undefined}>
              <Controller
                control={form.control}
                name="taskId"
                render={({ field }) => (
                  <SelectField
                    id="dt-task"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={openTasks.map((t) => ({ value: t.id, label: t.title }))}
                    disabled={!projectId}
                    placeholder={!projectId ? "Select a project first" : tasks.isLoading ? "Loading tasks…" : "Select task"}
                    invalid={Boolean(e("taskId"))}
                  />
                )}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="dt-priority" label="Priority">
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <SelectField id="dt-priority" value={field.value} onChange={(v) => field.onChange(v ?? "MEDIUM")} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
                  )}
                />
              </FormField>
              <FormField id="dt-hours" label="Estimated hours" error={e("estimatedHours")}>
                <Input id="dt-hours" inputMode="decimal" aria-invalid={Boolean(e("estimatedHours"))} {...form.register("estimatedHours")} />
              </FormField>
            </div>
            <FormField id="dt-note" label="Note">
              <Textarea id="dt-note" rows={2} placeholder="Context for the employee (optional)" {...form.register("note")} />
            </FormField>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Assign
            </Button>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Team daily workload" description={formatDate(toDate(planDate), "EEEE, MMMM d")}>
            <WorkloadList items={workload.data} isLoading={workload.isLoading} error={workload.error} onRetry={() => void workload.refetch()} emptyLabel="Nobody has work planned for this day." />
          </SectionCard>
          <SectionCard title="Planned tasks">
            {plan.isLoading ? (
              <ListSkeleton rows={4} />
            ) : plan.isError ? (
              <ErrorState error={plan.error} onRetry={() => void plan.refetch()} compact />
            ) : (plan.data?.length ?? 0) === 0 ? (
              <EmptyState icon={ClipboardList} title="Nothing planned yet." description="Assigned tasks for this day will appear here." compact />
            ) : (
              <ul className="divide-y">
                {plan.data?.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <UserAvatar user={d.assignee} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks/${d.task.id}`} className="block truncate text-sm font-medium hover:underline">
                        {d.task.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[d.assignee.name, d.task.project?.name, d.dueTime ? `by ${d.dueTime}` : null, d.estimatedHours ? formatHours(d.estimatedHours) : null].filter(Boolean).join(" · ")}
                      </p>
                      {d.note ? <p className="mt-0.5 text-xs text-muted-foreground italic">{d.note}</p> : null}
                    </div>
                    <TaskPriorityBadge priority={d.priority} />
                    <TaskStatusBadge status={d.task.status} />
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.task.title} from plan`} onClick={() => remove.mutate(d.id)} disabled={remove.isPending}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
