"use client";

import { Bug, Clock, FolderKanban, Pencil, Timer } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { TaskComments } from "@/components/comments/task-comments";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AttachmentList } from "@/components/shared/attachment-list";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivity } from "@/hooks/queries/use-misc";
import { useDeleteTaskAttachment, useTask, useUploadTaskAttachment } from "@/hooks/queries/use-tasks";
import { useCan } from "@/hooks/use-permission";
import { TASK_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatHours } from "@/lib/format";
import { isAssignee, isQa } from "@/lib/task-workflow";
import { useAuth } from "@/providers/auth-provider";
import type { ID, TaskStatus } from "@/types/domain";
import { BugEditDialog } from "./bug-edit-dialog";
import { TaskAssignee } from "./task-assignee";
import { TaskDueDate } from "./task-due-date";
import { TaskEditDialog } from "./task-edit-dialog";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskQuickActions } from "./task-quick-actions";
import { TaskReviewBanner, TaskReviewHistory } from "./task-review";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskDueDatePicker, TaskQaDueDatePicker, TaskQaPicker, TaskStatusPicker } from "./inline-pickers";
import { QaBugsDialog } from "./qa-bugs-dialog";
import { QaIssueCard } from "./qa-issue";
import { TaskSubtasks } from "./task-subtasks";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function TaskActivity({ taskId }: { taskId: ID }) {
  const activity = useActivity({ entityType: "TASK", entityId: taskId, limit: 30 });
  return <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />;
}

/** Finished work QA can still report bugs on. */
const FINISHED = ["COMPLETED", "TESTED", "APPROVED"] as const;

export function TaskDetails({ taskId }: { taskId: ID }) {
  const { user } = useAuth();
  const can = useCan();
  const query = useTask(taskId);
  const upload = useUploadTaskAttachment(taskId);
  const removeFile = useDeleteTaskAttachment(taskId);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  useBreadcrumbLabel(taskId, query.data?.title);

  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState error={query.error} title="Unable to load task." onRetry={() => void query.refetch()} />;

  const task = query.data;
  const canManage = can("tasks:assign");
  const mine = isAssignee(task, user);
  // The PM, and the QA who tests a bug, set when it must be fixed by.
  const bugQa = Boolean(task.qaIssue && user && task.qa?.id === user.id && !mine);
  const canSetDue = canManage || bugQa;
  // QA can still report bugs on finished work, even once the project is completed (the API checks they test this project).
  const finished = (FINISHED as readonly TaskStatus[]).includes(task.status);
  const canReportBugs = finished && !task.qaIssue && (!mine || task.stage === "QA") && (isQa(task, user) || Boolean(user?.isQaTester));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {task.project ? (
          <Link href={`/projects/${task.project.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
            <FolderKanban className="size-4" aria-hidden />
            {task.project.name}
            {task.milestone ? <span>· {task.milestone.name}</span> : null}
          </Link>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canManage || mine ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                {canManage ? <Pencil /> : <Timer />}
                {canManage ? "Edit" : "Log hours"}
              </Button>
            ) : bugQa ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit bug
              </Button>
            ) : null}
            {canReportBugs ? (
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
                <Bug /> Report bug
              </Button>
            ) : null}
            <TaskQuickActions task={task} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
          <TaskDueDate dueDate={task.dueDate} status={task.status} />
        </div>
      </div>

      <TaskReviewBanner task={task} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {task.qaIssue ? <QaIssueCard issue={task.qaIssue} attachments={task.attachments} /> : null}
          <SectionCard title="Description">
            {task.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
          </SectionCard>

          <SectionCard title="Subtasks">
            <TaskSubtasks task={task} />
          </SectionCard>

          <Tabs defaultValue="comments" className="gap-4">
            <TabsList>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="reviews">Review history</TabsTrigger>
            </TabsList>
            <TabsContent value="comments">
              <TaskComments taskId={task.id} />
            </TabsContent>
            <TabsContent value="activity">
              <TaskActivity taskId={task.id} />
            </TabsContent>
            <TabsContent value="reviews">
              <TaskReviewHistory taskId={task.id} />
            </TabsContent>
          </Tabs>

          {/* A bug's files are part of its QA report above. */}
          {task.qaIssue ? null : (
            <SectionCard title="Attachments">
              <AttachmentList
                attachments={task.attachments}
                onUpload={(file) => upload.mutate(file)}
                uploading={upload.isPending}
                onDelete={canManage || mine ? (id) => removeFile.mutate(id) : undefined}
                deletingId={removeFile.isPending ? (removeFile.variables ?? null) : null}
                onReject={(message) => toast.error(message)}
              />
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          <SectionCard title="Details">
            <dl className="divide-y">
              <DetailRow label="Status">
                <TaskStatusPicker task={task} withLabel />
              </DetailRow>
              <DetailRow label="Priority">
                <TaskPriorityBadge priority={task.priority} />
              </DetailRow>
              <DetailRow label="Assignee">
                <TaskAssignee user={task.assignee} />
              </DetailRow>
              <DetailRow label="Reviewer">
                <TaskAssignee user={task.reviewer} emptyLabel="No reviewer" />
              </DetailRow>
              <DetailRow label="QA">
                {canManage ? <TaskQaPicker task={task} showName /> : <TaskAssignee user={task.qa} emptyLabel={task.status === "IN_QA" ? "Waiting for a project QA" : "After review"} />}
              </DetailRow>
              <DetailRow label="QA deadline">
                <TaskQaDueDatePicker task={task} disabled={!canManage} />
              </DetailRow>
              <DetailRow label="Project">
                {task.project ? (
                  <Link href={`/projects/${task.project.id}`} className="truncate hover:underline">
                    {task.project.name}
                  </Link>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Milestone">{task.milestone?.name ?? "—"}</DetailRow>
              <DetailRow label="Department">{task.department?.name ?? "—"}</DetailRow>
              <DetailRow label="Type">{task.type ? TASK_TYPE_LABELS[task.type] : "—"}</DetailRow>
              <DetailRow label="Start date">{formatDate(task.startDate)}</DetailRow>
              <DetailRow label={task.qaIssue ? "Fix by" : "Deadline"}>{canSetDue ? <TaskDueDatePicker task={task} /> : formatDate(task.dueDate)}</DetailRow>
              <DetailRow label="Estimated">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                  {formatHours(task.estimatedHours)}
                </span>
              </DetailRow>
              <DetailRow label="Actual">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Timer className="size-3.5 text-muted-foreground" aria-hidden />
                  {formatHours(task.actualHours)}
                </span>
              </DetailRow>
              {task.tags.length > 0 ? (
                <DetailRow label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </DetailRow>
              ) : null}
              <DetailRow label="Created">
                <span className="text-muted-foreground">
                  {formatDate(task.createdAt)}
                  {task.createdBy ? ` by ${task.createdBy.name}` : ""}
                </span>
              </DetailRow>
            </dl>
          </SectionCard>
        </aside>
      </div>

      {canManage || mine ? <TaskEditDialog task={task} open={editOpen} onOpenChange={setEditOpen} limited={!canManage} /> : null}
      {canReportBugs ? (
        <QaBugsDialog taskId={task.id} taskTitle={task.title} stage={task.stage} finished open={reportOpen} onOpenChange={setReportOpen} />
      ) : null}
      {bugQa && !canManage && !mine ? <BugEditDialog bugId={editOpen ? task.id : null} onOpenChange={setEditOpen} /> : null}
    </div>
  );
}
