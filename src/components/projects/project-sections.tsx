"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { HoursChart, TaskStatusChart, WorkloadChart } from "@/components/analytics/lazy-charts";
import { StatCard } from "@/components/dashboard/stat-card";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AttachmentList } from "@/components/shared/attachment-list";
import { CalendarView, calendarRange, type CalendarMode } from "@/components/shared/calendar-view";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { GanttTimeline, type TimelineZoom } from "@/components/shared/gantt-timeline";
import { SectionCard } from "@/components/shared/section-card";
import { ChartSkeleton, ListSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActivity, useProjectAnalytics } from "@/hooks/queries/use-misc";
import { useUserOptions } from "@/hooks/queries/use-people";
import {
  useAddProjectMember,
  useCreateMilestone,
  useMilestones,
  useProject,
  useProjectFiles,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateMilestone,
  useUploadProjectFile,
} from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import { MILESTONE_STATUS_META } from "@/lib/constants";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { formatDate, formatHours } from "@/lib/format";
import { milestoneEvents, projectTimelineRows, taskEvents } from "@/lib/schedule";
import { MILESTONE_STATUSES, type ID, type MilestoneStatus } from "@/types/domain";
import { ProjectProgress } from "./project-progress";
import { MilestoneStatusBadge } from "./project-status-badge";
import { upload } from "@testing-library/user-event/dist/cjs/setup/directApi.js";

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

const milestoneSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(150),
    description: z.string().max(5000),
    startDate: z.string(),
    dueDate: z.string().min(1, "Set a due date."),
  })
  .refine((v) => !v.startDate || v.dueDate >= v.startDate, { path: ["dueDate"], message: "Due date can't be before the start date." });
type MilestoneValues = z.infer<typeof milestoneSchema>;

function MilestoneDialog({ projectId, open, onOpenChange }: { projectId: ID; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateMilestone();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<MilestoneValues>({ resolver: zodResolver(milestoneSchema), defaultValues: { name: "", description: "", startDate: "", dueDate: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await create.mutateAsync({ projectId, name: v.name.trim(), description: emptyToNull(v.description), startDate: emptyToNull(v.startDate), dueDate: v.dueDate });
      form.reset();
      onOpenChange(false);
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["name", "description", "startDate", "dueDate"]));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>Milestones group tasks into deliverables.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="ms-name" label="Name" error={errors.name?.message} required>
            <Input id="ms-name" autoFocus aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescribedBy("ms-name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <FormField id="ms-description" label="Description">
            <Textarea id="ms-description" rows={3} {...form.register("description")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="ms-start" label="Start date">
              <Input id="ms-start" type="date" {...form.register("startDate")} />
            </FormField>
            <FormField id="ms-due" label="Due date" error={errors.dueDate?.message} required>
              <Input id="ms-due" type="date" aria-invalid={Boolean(errors.dueDate)} aria-describedby={fieldDescribedBy("ms-due", errors.dueDate?.message)} {...form.register("dueDate")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Create milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectMilestones({ projectId }: { projectId: ID }) {
  const query = useMilestones({ projectId });
  const update = useUpdateMilestone();
  const canEdit = usePermission("projects:update");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Milestone
          </Button>
        ) : null}
      </div>
      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load milestones." onRetry={() => void query.refetch()} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Flag} title="No milestones yet." description="Break the project into milestones to track delivery." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {query.data?.map((m) => (
            <li key={m.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(m.startDate)} → {formatDate(m.dueDate)} · {m.taskCount} tasks
                  </p>
                </div>
                {canEdit ? (
                  <SelectField
                    id={`ms-status-${m.id}`}
                    aria-label={`Status of ${m.name}`}
                    className="h-7 w-36"
                    value={m.status}
                    onChange={(v) => v && update.mutate({ id: m.id, input: { status: v as MilestoneStatus } })}
                    options={MILESTONE_STATUSES.map((s) => ({ value: s, label: MILESTONE_STATUS_META[s].label }))}
                  />
                ) : (
                  <MilestoneStatusBadge status={m.status} />
                )}
              </div>
              {m.description ? <p className="text-sm text-muted-foreground">{m.description}</p> : null}
              <ProjectProgress value={m.progress} />
            </li>
          ))}
        </ul>
      )}
      <MilestoneDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar & timeline
// ---------------------------------------------------------------------------

export function ProjectCalendar({ projectId }: { projectId: ID }) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const range = calendarRange(mode, cursor);
  const tasks = useTasks({ projectId, dueFrom: range.from, dueTo: range.to, pageSize: 500 });
  const milestones = useMilestones({ projectId });
  const events = useMemo(() => [...milestoneEvents(milestones.data ?? []), ...taskEvents(tasks.data?.items ?? [])], [milestones.data, tasks.data]);

  if (tasks.isError) return <ErrorState error={tasks.error} title="Unable to load calendar." onRetry={() => void tasks.refetch()} />;
  return <CalendarView mode={mode} cursor={cursor} onModeChange={setMode} onCursorChange={setCursor} events={events} isFetching={tasks.isFetching || milestones.isFetching} />;
}

export function ProjectTimeline({ projectId }: { projectId: ID }) {
  const [zoom, setZoom] = useState<TimelineZoom>("week");
  const project = useProject(projectId);
  const milestones = useMilestones({ projectId });
  const tasks = useTasks({ projectId, pageSize: 500, sortBy: "dueDate", sortOrder: "asc" });
  const rows = useMemo(
    () => projectTimelineRows(project.data ?? null, milestones.data ?? [], tasks.data?.items ?? []),
    [project.data, milestones.data, tasks.data],
  );

  if (project.isLoading || milestones.isLoading || tasks.isLoading) return <ChartSkeleton />;
  const error = project.error ?? milestones.error ?? tasks.error;
  if (error) return <ErrorState error={error} title="Unable to load timeline." onRetry={() => void tasks.refetch()} />;
  return <GanttTimeline rows={rows} zoom={zoom} onZoomChange={setZoom} />;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function ProjectMembers({ projectId }: { projectId: ID }) {
  const members = useProjectMembers(projectId);
  const project = useProject(projectId);
  const canEdit = usePermission("projects:update");
  const users = useUserOptions({}, canEdit);
  const add = useAddProjectMember(projectId);
  const remove = useRemoveProjectMember(projectId);
  const [toAdd, setToAdd] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: ID; name: string } | null>(null);
  const memberIds = new Set((members.data ?? []).map((m) => m.id));

  return (
    <div className="space-y-4">
      {canEdit ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (toAdd) add.mutate(toAdd, { onSuccess: () => setToAdd(null) });
          }}
        >
          <SelectField
            id="add-member"
            aria-label="Person to add"
            className="w-64"
            value={toAdd}
            onChange={setToAdd}
            placeholder="Add a member…"
            options={(users.data ?? []).filter((u) => !memberIds.has(u.id)).map((u) => ({ value: u.id, label: u.name }))}
          />
          <Button type="submit" size="default" disabled={!toAdd || add.isPending}>
            {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Add
          </Button>
        </form>
      ) : null}
      {members.isLoading ? (
        <ListSkeleton rows={4} />
      ) : members.isError ? (
        <ErrorState error={members.error} title="Unable to load members." onRetry={() => void members.refetch()} />
      ) : (members.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="No members yet." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {members.data?.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <UserAvatar user={m} />
              <div className="min-w-0 flex-1">
                <Link href={`/team/${m.id}`} className="block truncate text-sm font-medium hover:underline">
                  {m.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {m.id === project.data?.manager?.id ? "Project manager" : (m.jobTitle ?? m.email ?? "")}
                </p>
              </div>
              {canEdit && m.id !== project.data?.manager?.id ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => setRemoving({ id: m.id, name: m.name })}>
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "member"}?`}
        description="They will lose access to this project's tasks unless assigned elsewhere."
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSettled: () => setRemoving(null) })}
      />
    </div>
  );
}
// ---------------------------------------------------------------------------
// Files & activity
// ---------------------------------------------------------------------------

export function ProjectFiles({ projectId }: { projectId: ID }) {
  const files = useProjectFiles(projectId);
  const upload = useUploadProjectFile(projectId);
  if (files.isLoading) return <ListSkeleton rows={3} />;
  if (files.isError) return <ErrorState error={files.error} title="Unable to load files." onRetry={() => void files.refetch()} />;
  return (
    <AttachmentList attachments={files.data ?? []} onUpload={(f) => upload.mutate(f)} uploading={upload.isPending} onReject={(m) => toast.error(m)} />
  );
}

export function ProjectActivity({ projectId }: { projectId: ID }) {
  const activity = useActivity({ projectId, limit: 50 });
  return (
    <SectionCard title="Activity">
      <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function ProjectAnalytics({ projectId }: { projectId: ID }) {
  const query = useProjectAnalytics(projectId);
  const a = query.data;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load project analytics." onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      {query.isLoading || !a ? (
        <StatCardsSkeleton />
      ) : (
        <section aria-label="Project figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Progress" value={`${a.progress}%`} />
          <StatCard label="Tasks" value={a.totalTasks} href={`/projects/${projectId}/tasks`} />
          <StatCard label="Completed" value={a.completedTasks} tone="good" />
          <StatCard label="Overdue" value={a.overdueTasks} tone={a.overdueTasks > 0 ? "warning" : "default"} />
          <StatCard label="Blocked" value={a.blockedTasks} tone={a.blockedTasks > 0 ? "critical" : "default"} />
          <StatCard label="In review" value={a.inReviewTasks} />
          <StatCard label="Milestones" value={`${a.milestones.completed}/${a.milestones.total}`} hint="completed" href={`/projects/${projectId}/milestones`} />
          <StatCard label="Estimated hours" value={formatHours(a.estimatedHours)} />
          <StatCard label="Actual hours" value={formatHours(a.actualHours)} />
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskStatusChart data={a?.taskStatus ?? []} isLoading={query.isLoading} />
        <HoursChart data={a?.hoursByMember ?? []} isLoading={query.isLoading} />
      </div>
      <WorkloadChart data={a?.workload ?? []} isLoading={query.isLoading} />
    </div>
  );
}
