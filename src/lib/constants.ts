import type {
  MilestoneStatus,
  NotificationType,
  Priority,
  ProjectStatus,
  TaskStatus,
  TaskType,
} from "@/types/domain";

/**
 * Visual metadata for statuses. Color is reserved for state: each badge also
 * carries a text label (and an icon where used), never color alone.
 */
export interface StatusMeta {
  label: string;
  /** Badge classes (soft background + readable ink, both themes). */
  badge: string;
  /** Solid dot/bar color. */
  dot: string;
  /** Text/icon color for the status on its own (no badge background). */
  ink?: string;
}

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  WAITING: {
    label: "Waiting",
    badge: "border-dashed border-border bg-transparent text-muted-foreground",
    dot: "bg-zinc-300 dark:bg-zinc-600",
    ink: "text-muted-foreground",
  },
  TODO: {
    label: "To do",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-zinc-400",
    ink: "text-muted-foreground",
  },
  IN_PROGRESS: {
    label: "In progress",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    dot: "bg-blue-500",
    ink: "text-blue-600 dark:text-blue-400",
  },
  BLOCKED: {
    label: "Blocked",
    badge: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
    ink: "text-red-600 dark:text-red-400",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-300",
    dot: "bg-teal-500",
    ink: "text-teal-600 dark:text-teal-400",
  },
  IN_REVIEW: {
    label: "In review",
    badge: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
    dot: "bg-violet-500",
    ink: "text-violet-600 dark:text-violet-400",
  },
  IN_QA: {
    label: "In QA",
    badge: "bg-cyan-500/10 text-cyan-800 border-cyan-500/25 dark:text-cyan-300",
    dot: "bg-cyan-500",
    ink: "text-cyan-600 dark:text-cyan-400",
  },
  TESTED: {
    label: "Tested",
    badge: "bg-teal-500/10 text-teal-800 border-teal-500/25 dark:text-teal-300",
    dot: "bg-teal-500",
    ink: "text-teal-600 dark:text-teal-400",
  },
  CHANGES_REQUESTED: {
    label: "Changes requested",
    badge: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300",
    dot: "bg-amber-500",
    ink: "text-amber-600 dark:text-amber-400",
  },
  APPROVED: {
    label: "Approved",
    badge: "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-300",
    dot: "bg-green-600",
    ink: "text-green-600 dark:text-green-400",
  },
};

/** Kanban column order (COMPLETED is folded into the review flow). */
export const KANBAN_COLUMNS: readonly TaskStatus[] = [
  "WAITING",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "IN_QA",
  "TESTED",
  "CHANGES_REQUESTED",
  "APPROVED",
];

export const PRIORITY_META: Record<Priority, StatusMeta & { rank: number; ink: string }> = {
  LOW: { label: "Low", badge: "text-muted-foreground border-border", dot: "bg-zinc-400", rank: 0, ink: "text-muted-foreground" },
  MEDIUM: { label: "Medium", badge: "text-foreground border-border", dot: "bg-blue-500", rank: 1, ink: "text-blue-600 dark:text-blue-400" },
  HIGH: {
    label: "High",
    badge: "text-orange-700 border-orange-500/30 dark:text-orange-300",
    dot: "bg-orange-500",
    rank: 2,
    ink: "text-orange-600 dark:text-orange-400",
  },
  URGENT: {
    label: "Urgent",
    badge: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
    dot: "bg-red-600",
    rank: 3,
    ink: "text-red-600 dark:text-red-400",
  },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  PLANNING: { label: "Planning", badge: "bg-muted text-muted-foreground border-border", dot: "bg-zinc-400" },
  ACTIVE: {
    label: "Active",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  QA_TESTING: {
    label: "QA testing",
    badge: "bg-cyan-500/10 text-cyan-800 border-cyan-500/25 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  ON_HOLD: {
    label: "On hold",
    badge: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:text-zinc-300",
    dot: "bg-zinc-500",
  },
  AT_RISK: {
    label: "At risk",
    badge: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-300",
    dot: "bg-green-600",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-muted text-muted-foreground border-border line-through",
    dot: "bg-zinc-300",
  },
};

export const MILESTONE_STATUS_META: Record<MilestoneStatus, StatusMeta> = {
  PENDING: { label: "Pending", badge: "bg-muted text-muted-foreground border-border", dot: "bg-zinc-400" },
  IN_PROGRESS: {
    label: "In progress",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-green-600/10 text-green-700 border-green-600/20 dark:text-green-300",
    dot: "bg-green-600",
  },
  MISSED: {
    label: "Missed",
    badge: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: "Feature",
  BUG: "Bug",
  DESIGN: "Design",
  CONTENT: "Content",
  CAMPAIGN: "Campaign",
  TEST: "Test",
  RESEARCH: "Research",
  MEETING: "Meeting",
  OPERATIONS: "Operations",
  OTHER: "Other",
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Task assigned",
  REVIEW_REQUESTED: "Review requested",
  TASK_APPROVED: "Task approved",
  CHANGES_REQUESTED: "Changes requested",
  DEADLINE_APPROACHING: "Deadline approaching",
  MENTION: "Mention",
  PROJECT_UPDATE: "Project update",
  MEETING_INVITE: "Meeting invite",
};

/** Statuses considered "done" for progress/overdue purposes. */
export const DONE_STATUSES: readonly TaskStatus[] = ["COMPLETED", "APPROVED"];

export const DEFAULT_PAGE_SIZE = 20;
