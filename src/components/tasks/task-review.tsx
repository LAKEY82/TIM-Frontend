"use client";

import { Bug as BugIcon, CheckCheck, Clock, FlaskConical, History, Loader2, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { useApproveTask, useQaComplete, useTaskReviews } from "@/hooks/queries/use-tasks";
import { formatDateTime, formatRelative } from "@/lib/format";
import { isAssignee, isBugQa, isQa, isReviewer } from "@/lib/task-workflow";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { ReviewDecision, Task } from "@/types/domain";
import { QaBugsDialog } from "./qa-bugs-dialog";
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
    // A bug's QA checks the fix themselves.
    const bugQa = isBugQa(task, user);
    const reviewer = isReviewer(task, user) || bugQa;
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 text-violet-600 dark:text-violet-400" aria-hidden />
          <div>
            <p className="text-sm font-medium">
              {bugQa ? `${task.assignee?.name ?? "The developer"} fixed this bug. Verify the fix` : reviewer ? "This task is waiting for your review" : "Waiting for review"}
            </p>
            <p className="text-sm text-muted-foreground">
              {bugQa
                ? "Verify it to close the bug, or reopen it with what's still wrong."
                : task.reviewer
                  ? `Reviewer: ${task.reviewer.name}`
                  : "A reviewer will pick this up."}
            </p>
          </div>
        </div>
        {reviewer ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setChangesOpen(true)} disabled={approve.isPending}>
              <RotateCcw /> {bugQa ? "Reopen" : "Request changes"}
            </Button>
            <Button onClick={() => approve.mutate({ id: task.id })} disabled={approve.isPending}>
              {approve.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              {bugQa ? "Verify fix" : "Approve"}
            </Button>
            <RequestChangesDialog taskId={task.id} taskTitle={task.title} open={changesOpen} onOpenChange={setChangesOpen} />
          </div>
        ) : null}
      </div>
    );
  }

  if (task.status === "IN_QA") {
    return <QaBanner task={task} />;
  }

  if (task.status === "CHANGES_REQUESTED") {
    const latest = reviews.data?.filter((r) => r.decision === "CHANGES_REQUESTED" || r.decision === "QA_FAILED").at(-1);
    if (latest?.decision === "QA_FAILED") {
      const openBugs = task.subtasks.filter((s) => s.status !== "COMPLETED" && s.status !== "APPROVED").length;
      return (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4" role="status">
          <BugIcon className="mt-0.5 size-5 text-red-600 dark:text-red-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              QA found bugs{latest ? ` (${latest.actor.name})` : ""}
              {isAssignee(task, user) ? ` — fix them${openBugs ? ` (${openBugs} open)` : ""}, then submit for review again.` : "."}
            </p>
            {latest.feedback ? <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{latest.feedback}</p> : null}
          </div>
        </div>
      );
    }
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
  QA_PASSED: { label: "passed QA", icon: ShieldCheck, className: "text-green-600 dark:text-green-400" },
  QA_FAILED: { label: "reported bugs in QA", icon: BugIcon, className: "text-red-600 dark:text-red-400" },
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

/**
 * Task is with QA: the QA (or a manager) logs issues as they test, then
 * completes QA, which sends the issues back together or passes the task.
 */
function QaBanner({ task }: { task: Task }) {
  const { user } = useAuth();
  const qaComplete = useQaComplete();
  // Issues logged on this task that are still open (the workflow's QA stage logs them under Bug fixing instead).
  const openIssues = task.subtasks.filter((s) => s.issueKind && s.status !== "COMPLETED" && s.status !== "APPROVED").length;
  const [bugsOpen, setBugsOpen] = useState(false);
  const canQa = isQa(task, user) && (!isAssignee(task, user) || task.stage === "QA");
  // The developer was also set as the tester: someone else has to test it.
  const ownWork = Boolean(task.qa && task.assignee && task.qa.id === task.assignee.id && task.stage !== "QA");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 text-cyan-600 dark:text-cyan-400" aria-hidden />
        <div>
          <p className="text-sm font-medium">{canQa && task.qa?.id === user?.id ? "This task is waiting for your QA testing" : "In QA testing"}</p>
          <p className="text-sm text-muted-foreground">{task.qa ? `QA: ${task.qa.name}.` : "The project's QA will test it."} Code review passed.</p>
          {canQa ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {openIssues
                ? `${openIssues} open issue${openIssues === 1 ? "" : "s"} logged. Keep testing and log more, then choose QA complete to send ${openIssues === 1 ? "it" : "them"} to the developer.`
                : "Log issues as you find them. QA complete with no issues passes the task."}
            </p>
          ) : null}
          {ownWork ? (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {task.qa?.id === user?.id ? "You built this task, so you can't QA it." : `${task.qa?.name} built this task, so they can't QA it.`} The project manager needs to choose a
              different QA tester.
            </p>
          ) : null}
        </div>
      </div>
      {canQa ? (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBugsOpen(true)} disabled={qaComplete.isPending}>
            <BugIcon /> Report issues
          </Button>
          <Button onClick={() => qaComplete.mutate({ id: task.id })} disabled={qaComplete.isPending}>
            {qaComplete.isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            QA complete
          </Button>
          <QaBugsDialog taskId={task.id} taskTitle={task.title} stage={task.stage} open={bugsOpen} onOpenChange={setBugsOpen} />
        </div>
      ) : null}
    </div>
  );
}
