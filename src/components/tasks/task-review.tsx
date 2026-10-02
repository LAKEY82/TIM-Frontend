"use client";

import { CheckCheck, Clock, History, Loader2, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useApproveTask, useTaskReviews } from "@/hooks/queries/use-tasks";
import { formatDateTime, formatRelative } from "@/lib/format";
import { isAssignee, isReviewer } from "@/lib/task-workflow";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { ReviewDecision, Task } from "@/types/domain";
import { RequestChangesDialog } from "./request-changes-dialog";

/**
 * Review banner shown at the top of a task:
 *  - assignee sees "Waiting for review" once submitted
 *  - reviewer sees Approve / Request changes
 *  - "Changes requested" shows the latest feedback to the assignee
 */
export function TaskReviewBanner({ task }: { task: Task }) {
  const { user } = useAuth();
  const approve = useApproveTask();
  const reviews = useTaskReviews(task.id);
  const [changesOpen, setChangesOpen] = useState(false);

  if (task.status === "IN_REVIEW") {
    const reviewer = isReviewer(task, user);
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 text-violet-600 dark:text-violet-400" aria-hidden />
          <div>
            <p className="text-sm font-medium">{reviewer ? "This task is waiting for your review" : "Waiting for review"}</p>
            <p className="text-sm text-muted-foreground">
              {task.reviewer ? `Reviewer: ${task.reviewer.name}` : "A reviewer will pick this up."}
            </p>
          </div>
        </div>
        {reviewer ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setChangesOpen(true)} disabled={approve.isPending}>
              <RotateCcw /> Request changes
            </Button>
            <Button onClick={() => approve.mutate({ id: task.id })} disabled={approve.isPending}>
              {approve.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Approve
            </Button>
            <RequestChangesDialog taskId={task.id} taskTitle={task.title} open={changesOpen} onOpenChange={setChangesOpen} />
          </div>
        ) : null}
      </div>
    );
  }

  if (task.status === "CHANGES_REQUESTED") {
    const latest = reviews.data?.filter((r) => r.decision === "CHANGES_REQUESTED").at(-1);
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4" role="status">
        <RotateCcw className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Changes requested{latest ? ` by ${latest.actor.name}` : ""}
            {isAssignee(task, user) ? " — update the task and resubmit." : "."}
          </p>
          {latest?.feedback ? <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">“{latest.feedback}”</p> : null}
        </div>
      </div>
    );
  }

  if (task.status === "APPROVED") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-600/25 bg-green-600/5 p-4" role="status">
        <CheckCheck className="size-5 text-green-600 dark:text-green-400" aria-hidden />
        <p className="text-sm font-medium">Approved{task.reviewer ? ` by ${task.reviewer.name}` : ""}.</p>
      </div>
    );
  }

  return null;
}

const DECISION_UI: Record<ReviewDecision, { label: string; icon: typeof Send; className: string }> = {
  SUBMITTED: { label: "submitted for review", icon: Send, className: "text-violet-600 dark:text-violet-400" },
  APPROVED: { label: "approved", icon: CheckCheck, className: "text-green-600 dark:text-green-400" },
  CHANGES_REQUESTED: { label: "requested changes", icon: RotateCcw, className: "text-amber-600 dark:text-amber-400" },
};

export function TaskReviewHistory({ taskId }: { taskId: string }) {
  const reviews = useTaskReviews(taskId);
  if (reviews.isLoading) return <ListSkeleton rows={2} />;
  if (reviews.isError) return <ErrorState error={reviews.error} title="Unable to load review history." onRetry={() => void reviews.refetch()} compact />;
  const list = reviews.data ?? [];
  if (list.length === 0) return <EmptyState icon={History} title="No reviews yet." description="Submissions and reviewer decisions will appear here." compact />;

  return (
    <ol className="space-y-4">
      {list.map((entry) => {
        const ui = DECISION_UI[entry.decision];
        return (
          <li key={entry.id} className="flex gap-3">
            <UserAvatar user={entry.actor} size="sm" className="mt-0.5 size-7" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap items-center gap-1">
                <span className="font-medium">{entry.actor.name}</span>
                <ui.icon className={cn("size-3.5", ui.className)} aria-hidden />
                <span className="text-muted-foreground">{ui.label}</span>
              </p>
              {entry.feedback ? (
                <blockquote className="mt-1 border-l-2 pl-3 whitespace-pre-wrap text-muted-foreground">{entry.feedback}</blockquote>
              ) : null}
              <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)} className="text-xs text-muted-foreground">
                {formatRelative(entry.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
