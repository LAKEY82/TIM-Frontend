"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { MultiUserSelect } from "@/components/forms/multi-user-select";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/queries/use-misc";
import { useUserOptions } from "@/hooks/queries/use-people";
import { useCreateProject, useUpdateProject } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { PRIORITY_META, PROJECT_STATUS_META } from "@/lib/constants";
import { applyServerErrors } from "@/lib/forms";
import { toDate, toISODate } from "@/lib/format";
import { PRIORITIES, PROJECT_STATUSES, type Project } from "@/types/domain";
import {
  emptyProjectForm,
  PROJECT_FORM_FIELDS,
  projectFormSchema,
  toProjectInput,
  type ProjectFormValues,
} from "./project-form-schema";
import { WorkflowPeopleFields } from "./project-workflow";

const dateInput = (v: string | null | undefined) => {
  const d = toDate(v);
  return d ? toISODate(d) : "";
};

export function projectToForm(p: Project): ProjectFormValues {
  return emptyProjectForm({
    name: p.name,
    description: p.description ?? "",
    clientId: p.client?.id ?? null,
    type: p.type,
    status: p.status,
    priority: p.priority,
    startDate: dateInput(p.startDate),
    deadline: dateInput(p.deadline),
    githubLink: p.githubLink ?? "",
    designLink: p.designLink ?? "",
    managerId: p.manager?.id ?? null,
    qaId: p.qa?.id ?? null,
    memberIds: p.members.map((m) => m.id),
    estimatedHours: p.estimatedHours?.toString() ?? "",
  });
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode. */
  project?: Project;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>{project ? "Update project details." : "Set up a project, its manager and team."}</DialogDescription>
        </DialogHeader>
        {open ? <ProjectForm project={project} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export function ProjectCreateButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  const allowed = usePermission("projects:create");
  if (!allowed) return null;
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Plus /> Project
      </Button>
      <ProjectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const router = useRouter();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? "");
  const users = useUserOptions();
  const clients = useClients({ page: 1 });
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    // New projects are broken into workflow stages by default.
    defaultValues: project ? projectToForm(project) : emptyProjectForm({ useWorkflow: true }),
  });
  const { errors, isSubmitting } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });
  const useWorkflow = useWatch({ control: form.control, name: "useWorkflow" });
  const people = useWatch({ control: form.control, name: ["designerId", "frontendId", "backendId", "bugFixerId"] });
  const e = (k: keyof ProjectFormValues) => errors[k]?.message;
  const userOptions = (users.data ?? []).map((u) => ({ value: u.id, label: u.name }));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const input = toProjectInput(values);
      if (project) {
        await update.mutateAsync(input);
        onDone();
      } else {
        const created = await create.mutateAsync(input);
        onDone();
        router.push(`/projects/${created.id}`);
      }
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, PROJECT_FORM_FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <FormField id="project-name" label="Name" error={e("name")} required>
        <Input id="project-name" autoFocus aria-invalid={Boolean(e("name"))} aria-describedby={fieldDescribedBy("project-name", e("name"))} {...form.register("name")} />
      </FormField>
      <FormField id="project-description" label="Description">
        <Textarea id="project-description" rows={3} {...form.register("description")} />
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Internal / External</legend>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="EXTERNAL" id="type-external" />
                <Label htmlFor="type-external" className="font-normal">External (client)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="INTERNAL" id="type-internal" />
                <Label htmlFor="type-internal" className="font-normal">Internal</Label>
              </div>
            </RadioGroup>
          )}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {type === "EXTERNAL" ? (
          <FormField id="project-client" label="Client" error={e("clientId")} required>
            <Controller
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <SelectField
                  id="project-client"
                  value={field.value}
                  onChange={field.onChange}
                  options={(clients.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={clients.isLoading ? "Loading clients…" : "Select client"}
                  invalid={Boolean(e("clientId"))}
                  describedBy={fieldDescribedBy("project-client", e("clientId"))}
                />
              )}
            />
          </FormField>
        ) : null}
        <FormField id="project-manager" label="Project manager">
          <Controller
            control={form.control}
            name="managerId"
            render={({ field }) => <SelectField id="project-manager" value={field.value} onChange={field.onChange} options={userOptions} noneLabel="Not assigned" />}
          />
        </FormField>
        <FormField id="project-qa" label="QA" error={e("qaId")} required hint={e("qaId") ? undefined : "Tests every task after code review and can pass it or report bugs."}>
          <Controller
            control={form.control}
            name="qaId"
            render={({ field }) => (
              <SelectField
                id="project-qa"
                value={field.value}
                onChange={field.onChange}
                options={userOptions}
                placeholder="Select the QA person"
                invalid={Boolean(e("qaId"))}
                describedBy={fieldDescribedBy("project-qa", e("qaId"), true)}
              />
            )}
          />
        </FormField>
        <FormField id="project-status" label="Status">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <SelectField
                id="project-status"
                value={field.value}
                onChange={(v) => field.onChange(v ?? "PLANNING")}
                options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_META[s].label }))}
              />
            )}
          />
        </FormField>
        <FormField id="project-priority" label="Priority">
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <SelectField
                id="project-priority"
                value={field.value}
                onChange={(v) => field.onChange(v ?? "MEDIUM")}
                options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
              />
            )}
          />
        </FormField>
        <FormField id="project-start" label="Start date" error={e("startDate")}>
          <Input id="project-start" type="date" {...form.register("startDate")} />
        </FormField>
        <FormField id="project-deadline" label="Deadline" error={e("deadline")}>
          <Input id="project-deadline" type="date" aria-invalid={Boolean(e("deadline"))} aria-describedby={fieldDescribedBy("project-deadline", e("deadline"))} {...form.register("deadline")} />
        </FormField>
        <FormField id="project-hours" label="Estimated hours" error={e("estimatedHours")}>
          <Input id="project-hours" inputMode="decimal" aria-invalid={Boolean(e("estimatedHours"))} {...form.register("estimatedHours")} />
        </FormField>
        <FormField id="project-design-link" label="Design Link" error={e("designLink")}>
          <Input id="project-design-link" type="url" aria-invalid={Boolean(e("designLink"))} {...form.register("designLink")} />
        </FormField>
        <FormField id="project-github-link" label="GitHub Link" error={e("githubLink")}>
          <Input id="project-github-link" type="url" aria-invalid={Boolean(e("githubLink"))} {...form.register("githubLink")} />
        </FormField>
      </div>

      <FormField id="project-members" label="Members">
        <Controller
          control={form.control}
          name="memberIds"
          render={({ field }) => <MultiUserSelect id="project-members" users={users.data ?? []} value={field.value} onChange={field.onChange} placeholder="Add team members…" />}
        />
      </FormField>

      {project ? null : (
        <fieldset className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <legend className="text-sm font-medium">Break into workflow stages</legend>
              <p className="text-xs text-muted-foreground">
                Design → Frontend + Backend → QA → Bug fixing. Each stage goes to the project manager for approval before the next one opens.
              </p>
            </div>
            <Controller
              control={form.control}
              name="useWorkflow"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Break into workflow stages" />}
            />
          </div>
          {useWorkflow ? (
            <WorkflowPeopleFields
              idPrefix="project-wf"
              userOptions={userOptions}
              value={{ designerId: people[0], frontendId: people[1], backendId: people[2], bugFixerId: people[3] }}
              onChange={(key, v) => form.setValue(key, v, { shouldValidate: form.formState.isSubmitted })}
              error={e("frontendId")}
            />
          ) : null}
        </fieldset>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {project ? "Save changes" : isSubmitting ? "Creating…" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
