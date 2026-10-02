"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUserOptions } from "@/hooks/queries/use-people";
import { useUpdateTask } from "@/hooks/queries/use-tasks";
import { PRIORITY_META } from "@/lib/constants";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { toDate, toISODate } from "@/lib/format";
import { PRIORITIES, type Task } from "@/types/domain";
import { hoursString } from "./task-form-schema";

const schema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().max(10000),
  assigneeId: z.string().nullable(),
  reviewerId: z.string().nullable(),
  priority: z.enum(PRIORITIES),
  dueDate: z.string(),
  estimatedHours: hoursString,
  actualHours: hoursString,
});
type Values = z.infer<typeof schema>;

const dateInput = (value: string | null | undefined) => {
  const d = toDate(value);
  return d ? toISODate(d) : "";
};

/**
 * `limited` mode (assignee without manage permission) only exposes the
 * actual-hours log; the API decides what each role may change.
 */
export function TaskEditDialog({ task, open, onOpenChange, limited }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void; limited?: boolean }) {
  const update = useUpdateTask(task.id);
  const users = useUserOptions({}, open && !limited);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      title: task.title,
      description: task.description ?? "",
      assigneeId: task.assignee?.id ?? null,
      reviewerId: task.reviewer?.id ?? null,
      priority: task.priority,
      dueDate: dateInput(task.dueDate),
      estimatedHours: task.estimatedHours?.toString() ?? "",
      actualHours: task.actualHours?.toString() ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const userOptions = (users.data ?? []).map((u) => ({ value: u.id, label: u.name }));
  const toNum = (v: string) => (v === "" ? null : Number(v));

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await update.mutateAsync(
        limited
          ? { actualHours: toNum(v.actualHours) }
          : {
              title: v.title.trim(),
              description: emptyToNull(v.description.trim()),
              assigneeId: v.assigneeId,
              reviewerId: v.reviewerId,
              priority: v.priority,
              dueDate: emptyToNull(v.dueDate),
              estimatedHours: toNum(v.estimatedHours),
              actualHours: toNum(v.actualHours),
            },
      );
      onOpenChange(false);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["title", "description", "assigneeId", "reviewerId", "priority", "dueDate", "estimatedHours", "actualHours"]));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{limited ? "Log hours" : "Edit task"}</DialogTitle>
          <DialogDescription>{limited ? "Record the time you've spent on this task." : "Update task details."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          {!limited ? (
            <>
              <FormField id="edit-title" label="Title" error={errors.title?.message} required>
                <Input id="edit-title" aria-invalid={Boolean(errors.title)} aria-describedby={fieldDescribedBy("edit-title", errors.title?.message)} {...form.register("title")} />
              </FormField>
              <FormField id="edit-description" label="Description">
                <Textarea id="edit-description" rows={4} {...form.register("description")} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="edit-assignee" label="Assignee">
                  <Controller control={form.control} name="assigneeId" render={({ field }) => <SelectField id="edit-assignee" value={field.value} onChange={field.onChange} options={userOptions} noneLabel="Unassigned" />} />
                </FormField>
                <FormField id="edit-reviewer" label="Reviewer">
                  <Controller control={form.control} name="reviewerId" render={({ field }) => <SelectField id="edit-reviewer" value={field.value} onChange={field.onChange} options={userOptions} noneLabel="No reviewer" />} />
                </FormField>
                <FormField id="edit-priority" label="Priority">
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <SelectField id="edit-priority" value={field.value} onChange={(v) => field.onChange(v ?? "MEDIUM")} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
                    )}
                  />
                </FormField>
                <FormField id="edit-due" label="Due date">
                  <Input id="edit-due" type="date" {...form.register("dueDate")} />
                </FormField>
                <FormField id="edit-estimate" label="Estimated hours" error={errors.estimatedHours?.message}>
                  <Input id="edit-estimate" inputMode="decimal" aria-invalid={Boolean(errors.estimatedHours)} {...form.register("estimatedHours")} />
                </FormField>
              </div>
            </>
          ) : null}
          <FormField id="edit-actual" label="Actual hours" error={errors.actualHours?.message}>
            <Input
              id="edit-actual"
              inputMode="decimal"
              autoFocus={limited}
              aria-invalid={Boolean(errors.actualHours)}
              aria-describedby={fieldDescribedBy("edit-actual", errors.actualHours?.message)}
              {...form.register("actualHours")}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
