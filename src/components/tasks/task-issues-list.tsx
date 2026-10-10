"use client";

import { CheckCheck, Loader2, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ListSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useApproveTask, useSubmitForReview, useTasks } from "@/hooks/queries/use-tasks";
import { isAssignee, isBugQa } from "@/lib/task-workflow";
import { useAuth } from "@/providers/auth-provider";
import type { ID, TaskStatus, TaskSummary } from "@/types/domain";
import { TaskStatusPicker } from "./inline-pickers";
import { QaIssueBadge } from "./qa-issue";
import { RequestChangesDialog } from "./request-changes-dialog";
import { TaskAssignee } from "./task-assignee";
import { TaskDueDate } from "./task-due-date";
import { TaskPriorityBadge } from "./task-priority-badge";

/** Where the developer sends a fixed bug to QA from. */
const SUBMITTABLE: readonly TaskStatus[] = ["TODO", "IN_PROGRESS", "CHANGES_REQUESTED", "COMPLETED"];

/**
 * The bugs QA reported on a task, shown under its row when expanded. The
 * developer sends each fix for review; the bug's QA marks it fixed or reopens it.
 */
export function TaskIssuesList({ taskId }: { taskId: ID }) {
  const query = useTasks({ issuesOf: taskId, sortBy: "createdAt", sortOrder: "asc", pageSize: 100 });
  const [reopening, setReopening] = useState<TaskSummary | null>(null);

  if (query.isLoading) return <ListSkeleton rows={2} />;
  if (query.isError) return <p className="text-sm text-destructive">Couldn&apos;t load the bugs.</p>;
  const bugs = query.data?.items ?? [];
  if (!bugs.length) return <p className="text-sm text-muted-foreground">No bugs reported.</p>;

  return (
    <>
      <ul className="divide-y rounded-md border bg-background" aria-label="Reported bugs">
        {bugs.map((bug) => (
          <BugItem key={bug.id} bug={bug} onReopen={() => setReopening(bug)} />
        ))}
      </ul>
      {reopening ? <RequestChangesDialog taskId={reopening.id} taskTitle={reopening.title} open onOpenChange={(open) => !open && setReopening(null)} /> : null}
    </>
  );
}

function BugItem({ bug, onReopen }: { bug: TaskSummary; onReopen: () => void }) {
  const { user } = useAuth();
  const submit = useSubmitForReview();
  const approve = useApproveTask();
  const developer = isAssignee(bug, user) && SUBMITTABLE.includes(bug.status);
  const verify = isBugQa(bug, user) && bug.status === "IN_REVIEW";
  const busy = submit.isPending || approve.isPending;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      {bug.issueKind ? <QaIssueBadge kind={bug.issueKind} className="shrink-0" /> : null}
      <Link href={`/tasks/${bug.id}`} className="min-w-40 flex-1 truncate text-sm hover:underline">
        {bug.title}
      </Link>
      <TaskPriorityBadge priority={bug.priority} className="shrink-0" />
      <TaskAssignee user={bug.assignee} emptyLabel="Unassigned" className="max-w-40" />
      {bug.dueDate ? <TaskDueDate dueDate={bug.dueDate} status={bug.status} className="shrink-0" /> : null}
      <TaskStatusPicker task={bug} withLabel />
      {developer ? (
        <Button type="button" size="sm" variant="outline" onClick={() => submit.mutate({ id: bug.id })} disabled={busy}>
          {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />}
          Send for review
        </Button>
      ) : null}
      {verify ? (
        <>
          <Button type="button" size="sm" variant="outline" onClick={onReopen} disabled={busy}>
            <RotateCcw /> Reopen
          </Button>
          <Button type="button" size="sm" onClick={() => approve.mutate({ id: bug.id })} disabled={busy}>
            {approve.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            Mark fixed
          </Button>
        </>
      ) : null}
    </li>
  );
}
