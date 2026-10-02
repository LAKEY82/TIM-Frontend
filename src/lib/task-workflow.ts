/**
 * Which workflow actions to *offer* for a task. The backend validates every
 * transition; this only avoids showing buttons that obviously don't apply.
 */
import { can } from "@/lib/permissions";
import type { TaskStatus, TaskSummary, User } from "@/types/domain";

export type TaskAction = "start" | "complete" | "block" | "resume" | "submit" | "approve" | "request_changes";

export const ACTION_TARGET: Record<Exclude<TaskAction, "submit" | "approve" | "request_changes">, TaskStatus> = {
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

export function availableActions(
  task: Pick<TaskSummary, "status" | "assignee" | "reviewer">,
  user: Pick<User, "id" | "role" | "permissions"> | null,
): TaskAction[] {
  const actions: TaskAction[] = [];
  const worker = isAssignee(task, user) || can(user, "tasks:assign");
  if (worker) {
    switch (task.status) {
      case "TODO":
      case "CHANGES_REQUESTED":
        actions.push("start");
        break;
      case "IN_PROGRESS":
        actions.push("complete", "submit", "block");
        break;
      case "BLOCKED":
        actions.push("resume");
        break;
      case "COMPLETED":
        actions.push("submit");
        break;
      default:
        break;
    }
  }
  if (task.status === "IN_REVIEW" && isReviewer(task, user)) {
    actions.push("approve", "request_changes");
  }
  return actions;
}
