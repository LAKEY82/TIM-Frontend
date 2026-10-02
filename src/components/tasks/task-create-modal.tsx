"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDepartments, useUserOptions } from "@/hooks/queries/use-people";
import { useMilestones, useProjects } from "@/hooks/queries/use-projects";
import { useCreateTask } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import { PRIORITY_META, TASK_TYPE_LABELS } from "@/lib/constants";
import { applyServerErrors } from "@/lib/forms";
import { PRIORITIES, TASK_TYPES } from "@/types/domain";
import {
  emptyTaskForm,
  TASK_FORM_FIELDS,
  taskFormSchema,
  toTaskInput,
  type TaskFormValues,
} from "./task-form-schema";

interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: Partial<TaskFormValues>;
  /** Navigate to the new task after creation. */
  openAfterCreate?: boolean;
}

export function TaskCreateModal({ open, onOpenChange, defaults, openAfterCreate = false }: TaskCreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a task and optionally assign it right away.</DialogDescription>
        </DialogHeader>
        {open ? <TaskForm defaults={defaults} onDone={() => onOpenChange(false)} openAfterCreate={openAfterCreate} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function TaskCreateButton(props: Omit<TaskCreateModalProps, "open" | "onOpenChange"> & { label?: string; size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  const allowed = usePermission("tasks:create");
  if (!allowed) return null;
  return (
    <>
      <Button size={props.size ?? "sm"} onClick={() => setOpen(true)}>
        <Plus /> {props.label ?? "New task"}
      </Button>
      <TaskCreateModal open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}

function TaskForm({
  defaults,
  onDone,
  openAfterCreate,
}: {
  defaults?: Partial<TaskFormValues>;
  onDone: () => void;
  openAfterCreate: boolean;
}) {
  const router = useRouter();
  const create = useCreateTask();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskFormSchema), defaultValues: emptyTaskForm(defaults) });
  const { errors, isSubmitting } = form.formState;
  const projectId = useWatch({ control: form.control, name: "projectId" });

  const projects = useProjects({ pageSize: 100, sortBy: "name", sortOrder: "asc" });
  const milestones = useMilestones({ projectId }, Boolean(projectId));
  const users = useUserOptions();
  const departments = useDepartments();

  const projectOptions = useMemo(
    () =>
      (projects.data?.items ?? [])
        .filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED")
        .map((p) => ({ value: p.id, label: p.name })),
    [projects.data],
  );
  const userOptions = useMemo(() => (users.data ?? []).map((u) => ({ value: u.id, label: u.name })), [users.data]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const task = await create.mutateAsync(toTaskInput(values));
      onDone();
      if (openAfterCreate) router.push(`/tasks/${task.id}`);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, TASK_FORM_FIELDS));
    }
  });

  const e = (key: keyof TaskFormValues) => errors[key]?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <FormField id="task-title" label="Title" error={e("title")} required>
        <Input
          id="task-title"
          autoFocus
          aria-invalid={Boolean(e("title"))}
          aria-describedby={fieldDescribedBy("task-title", e("title"))}
          {...form.register("title")}
        />
      </FormField>
      <FormField id="task-description" label="Description" error={e("description")}>
        <Textarea id="task-description" rows={3} {...form.register("description")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="task-project" label="Project" error={e("projectId")} required>
          <Controller
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <SelectField
                id="task-project"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v ?? "");
                  form.setValue("milestoneId", null);
                }}
                options={projectOptions}
                placeholder={projects.isLoading ? "Loading projects…" : "Select project"}
                invalid={Boolean(e("projectId"))}
                describedBy={fieldDescribedBy("task-project", e("projectId"))}
              />
            )}
          />
        </FormField>
        <FormField id="task-milestone" label="Milestone">
          <Controller
            control={form.control}
            name="milestoneId"
            render={({ field }) => (
              <SelectField
                id="task-milestone"
                value={field.value}
                onChange={field.onChange}
                options={(milestones.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
                noneLabel="No milestone"
                disabled={!projectId}
                placeholder={projectId ? "Select milestone" : "Select a project first"}
              />
            )}
          />
        </FormField>
        <FormField id="task-assignee" label="Assignee">
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <SelectField id="task-assignee" value={field.value} onChange={field.onChange} options={userOptions} noneLabel="Unassigned" />
            )}
          />
        </FormField>
        <FormField id="task-reviewer" label="Reviewer" error={e("reviewerId")}>
          <Controller
            control={form.control}
            name="reviewerId"
            render={({ field }) => (
              <SelectField
                id="task-reviewer"
                value={field.value}
                onChange={field.onChange}
                options={userOptions}
                noneLabel="No reviewer"
                invalid={Boolean(e("reviewerId"))}
                describedBy={fieldDescribedBy("task-reviewer", e("reviewerId"))}
              />
            )}
          />
        </FormField>
        <FormField id="task-department" label="Department">
          <Controller
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <SelectField
                id="task-department"
                value={field.value}
                onChange={field.onChange}
                options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
                noneLabel="No department"
              />
            )}
          />
        </FormField>
        <FormField id="task-priority" label="Priority">
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <SelectField
                id="task-priority"
                value={field.value}
                onChange={(v) => field.onChange(v ?? "MEDIUM")}
                options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
              />
            )}
          />
        </FormField>
        <FormField id="task-type" label="Type">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <SelectField
                id="task-type"
                value={field.value}
                onChange={(v) => field.onChange(v ?? "OTHER")}
                options={TASK_TYPES.map((t) => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
              />
            )}
          />
        </FormField>
        <FormField id="task-estimate" label="Estimated hours" error={e("estimatedHours")}>
          <Input
            id="task-estimate"
            inputMode="decimal"
            placeholder="e.g. 4"
            aria-invalid={Boolean(e("estimatedHours"))}
            aria-describedby={fieldDescribedBy("task-estimate", e("estimatedHours"))}
            {...form.register("estimatedHours")}
          />
        </FormField>
        <FormField id="task-start" label="Start date" error={e("startDate")}>
          <Input id="task-start" type="date" aria-invalid={Boolean(e("startDate"))} {...form.register("startDate")} />
        </FormField>
        <FormField id="task-due" label="Due date" error={e("dueDate")}>
          <Input
            id="task-due"
            type="date"
            aria-invalid={Boolean(e("dueDate"))}
            aria-describedby={fieldDescribedBy("task-due", e("dueDate"))}
            {...form.register("dueDate")}
          />
        </FormField>
      </div>

      <FormField id="task-tags" label="Tags" hint="Separate tags with commas, e.g. frontend, checkout">
        <Input id="task-tags" aria-describedby="task-tags-hint" {...form.register("tags")} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Creating…" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
