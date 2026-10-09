/**
 * Which workflow actions to *offer* for a task. The backend validates every
 * transition; this only avoids showing buttons that obviously don't apply.
 */
import { can } from "@/lib/permissions";
import type { TaskStatus, TaskSummary, User } from "@/types/domain";

export type TaskAction = "start" | "complete" | "block" | "resume" | "submit" | "approve" | "request_changes" | "qa_pass" | "qa_fail";

export const ACTION_TARGET: Record<Exclude<TaskAction, "submit" | "approve" | "request_changes" | "qa_pass" | "qa_fail">, TaskStatus> = {
  start: "IN_PROGRESS",
  resume: "IN_PROGRESS",
  complete: "COMPLETED",
  block: "BLOCKED",
};

export function isAssignee(task: Pick<TaskSummary, "assignee">, user: Pick<User, "id"> | null): boolean {
  return Boolean(user && task.assignee && task.assignee.id === user.id);
}

export function isReviewer(task: Pick<TaskSummary, "reviewer">, user: Pick<User, "id" | "role" | "permissions"> | null): boolean {
  if (!user) return false;
  if (task.reviewer) return task.reviewer.id === user.id;
  return can(user, "tasks:review");
}

type WorkflowTask = Pick<TaskSummary, "status" | "assignee" | "reviewer" | "qa"> & Pick<Partial<TaskSummary>, "stage" | "type" | "subtaskCount" | "issueKind">;

/** The QA tester of a bug they reported: they check the developer's fix themselves. */
export function isBugQa(task: Pick<WorkflowTask, "qa" | "assignee"> & Pick<Partial<TaskSummary>, "issueKind">, user: Pick<User, "id"> | null): boolean {
  return Boolean(user && task.issueKind && task.qa?.id === user.id && !isAssignee(task, user));
}

/** A Design / Frontend / Backend stage broken into subtasks: its status follows them. */
export function isRollupStage(task: Pick<Partial<TaskSummary>, "stage" | "subtaskCount">): boolean {
  return Boolean(task.stage && ["DESIGN", "FRONTEND", "BACKEND"].includes(task.stage) && (task.subtaskCount ?? 0) > 0);
}

export function availableActions(task: WorkflowTask, user: Pick<User, "id" | "role" | "permissions"> | null): TaskAction[] {
  const actions: TaskAction[] = [];
  const assignee = isAssignee(task, user);
  const worker = assignee || can(user, "tasks:assign");
  // A stage with subtasks moves on its own; people act on its subtasks.
  if (worker && !isRollupStage(task)) {
    switch (task.status) {
      case "TODO":
      case "CHANGES_REQUESTED":
        actions.push("start");
        if (assignee) actions.push("submit");
        break;
      case "IN_PROGRESS":
        // Completing is the project manager's call; developers only tick off QA bug items.
        if (can(user, "tasks:assign") || task.type === "BUG") actions.push("complete");
        if (assignee) actions.push("submit");
        actions.push("block");
        break;
      case "BLOCKED":
        actions.push("resume");
        break;
      case "COMPLETED":
        if (assignee) actions.push("submit");
        break;
      default:
        break;
    }
  }
  if (task.status === "IN_REVIEW" && (isReviewer(task, user) || isBugQa(task, user)) && !isRollupStage(task)) {
    actions.push("approve", "request_changes");
  }
  // A stage QA has finished testing is approved by the project manager, which opens the next stage.
  if (task.status === "TESTED" && task.stage && can(user, "tasks:assign")) {
    actions.push("approve");
  }
  // The workflow's QA stage is assigned to the QA themselves. A stage with subtasks is tested subtask by subtask.
  if (task.status === "IN_QA" && isQa(task, user) && (!assignee || task.stage === "QA") && !isRollupStage(task)) {
    actions.push("qa_pass", "qa_fail");
  }
  return actions;
}

/** The task's QA tester, or a manager who can review (override). Never the developer themselves. */
export function isQa(task: Pick<TaskSummary, "qa">, user: Pick<User, "id" | "role" | "permissions"> | null): boolean {
  if (!user) return false;
  if (task.qa && task.qa.id === user.id) return true;
  return can(user, "tasks:review") && can(user, "tasks:assign");
}

/** Status moves an assignee may make themselves (mirrors the API's rules; the API still decides). */
const ASSIGNEE_MOVES: Partial<Record<TaskStatus, readonly TaskStatus[]>> = {
  TODO: ["IN_PROGRESS", "IN_REVIEW"],
  IN_PROGRESS: ["TODO", "BLOCKED", "IN_REVIEW"],
  BLOCKED: ["IN_PROGRESS"],
  COMPLETED: ["IN_PROGRESS", "IN_REVIEW"],
  CHANGES_REQUESTED: ["IN_PROGRESS", "IN_REVIEW"],
};

// "Waiting" and "Tested" are set by the workflow and QA, never picked by hand.
const ALL_STATUSES: readonly TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "IN_REVIEW", "IN_QA", "CHANGES_REQUESTED", "APPROVED"];

/** Which statuses to offer in a status picker for this user and task. */
export function statusOptions(task: WorkflowTask, user: Pick<User, "id" | "role" | "permissions"> | null): TaskStatus[] {
  // QA decisions on a task in QA: pass or report bugs (Changes requested). Stages with subtasks are tested subtask by subtask.
  if (task.status === "IN_QA" && isQa(task, user) && (!isAssignee(task, user) || task.stage === "QA") && !isRollupStage(task)) {
    return ["APPROVED", "CHANGES_REQUESTED"];
  }
  if (can(user, "tasks:assign")) {
    // Managers may set any status, except that only the developer sends for review.
    // "In QA" sends the task to the project's QA (on a task in review it approves the review).
    return ALL_STATUSES.filter((s) => s !== task.status && (s !== "IN_REVIEW" || isAssignee(task, user)));
  }
  const options = new Set<TaskStatus>();
  if (isAssignee(task, user) && !isRollupStage(task)) for (const s of ASSIGNEE_MOVES[task.status] ?? []) options.add(s);
  // Developers tick off each bug QA reported on their work.
  if (isAssignee(task, user) && task.type === "BUG" && (task.status === "TODO" || task.status === "IN_PROGRESS")) options.add("COMPLETED");
  if (task.status === "IN_REVIEW" && (isReviewer(task, user) || isBugQa(task, user))) {
    options.add("APPROVED");
    options.add("CHANGES_REQUESTED");
  }
  return [...options];
}
