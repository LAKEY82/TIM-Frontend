/**
 * Normalizers: the only place that knows about raw backend payload shapes.
 *
 * If the Express API returns a slightly different shape (snake_case, nested
 * `_count`, `fullName` vs `name`...), adapt it here, never in components.
 */
import type {
  ActivityItem,
  ActivityPoint,
  AppNotification,
  Attachment,
  Client,
  ClientSummary,
  Comment,
  CountByKey,
  DeadlineItem,
  Department,
  DepartmentSummary,
  DepartmentWorkload,
  EntityType,
  Milestone,
  MilestoneStatus,
  NotificationType,
  Paginated,
  Priority,
  Project,
  ProjectStatus,
  ProjectType,
  ReviewDecision,
  ReviewEntry,
  Role,
  Subtask,
  Task,
  TaskStatus,
  TaskSummary,
  TaskType,
  User,
  UserSummary,
  QaIssue,
  QaIssueKind,
  WorkflowStage,
  WorkloadEntry,
} from "@/types/domain";
import {
  MILESTONE_STATUSES,
  NOTIFICATION_TYPES,
  PRIORITIES,
  PROJECT_STATUSES,
  ROLES,
  TASK_STATUSES,
  QA_ISSUE_KINDS,
  WORKFLOW_STAGES,
  TASK_TYPES,
} from "@/types/domain";

export type Raw = Record<string, unknown>;

export function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rec(value: unknown): Raw {
  return isRecord(value) ? value : {};
}

/** First defined value among the given keys (supports camelCase + snake_case). */
export function pick(obj: Raw, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

export function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

export function optStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : typeof value === "number" ? String(value) : null;
}

export function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

export function optNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = num(value, Number.NaN);
  return Number.isNaN(n) ? null : n;
}

export function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function id(value: unknown): string {
  return str(value);
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  const v = typeof value === "string" ? value.toUpperCase().replace(/[\s-]/g, "_") : "";
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export const toRole = (v: unknown): Role => oneOf(ROLES, v, "EMPLOYEE");
export const toTaskStatus = (v: unknown): TaskStatus => oneOf(TASK_STATUSES, v, "TODO");
export const toPriority = (v: unknown): Priority => oneOf(PRIORITIES, v, "MEDIUM");
export const toProjectStatus = (v: unknown): ProjectStatus => oneOf(PROJECT_STATUSES, v, "ACTIVE");
export const toTaskType = (v: unknown): TaskType => oneOf(TASK_TYPES, v, "OTHER");
export const toMilestoneStatus = (v: unknown): MilestoneStatus => oneOf(MILESTONE_STATUSES, v, "PENDING");
export const toNotificationType = (v: unknown): NotificationType => oneOf(NOTIFICATION_TYPES, v, "PROJECT_UPDATE");

const ENTITY_TYPES: readonly EntityType[] = ["PROJECT", "TASK", "MILESTONE", "USER", "CLIENT", "DEPARTMENT", "COMMENT", "MEETING"];
export const toEntityType = (v: unknown): EntityType => oneOf(ENTITY_TYPES, v, "TASK");

function countOf(obj: Raw, key: string): number | undefined {
  const counts = rec(pick(obj, "_count", "counts"));
  return counts[key] !== undefined ? num(counts[key]) : undefined;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export function toUserSummary(value: unknown): UserSummary | null {
  if (!isRecord(value)) return null;
  const first = str(pick(value, "firstName", "first_name"));
  const last = str(pick(value, "lastName", "last_name"));
  const name = str(pick(value, "name", "fullName", "full_name", "displayName")) || `${first} ${last}`.trim();
  const userId = id(pick(value, "id", "_id", "userId"));
  if (!userId && !name) return null;
  return {
    id: userId,
    name: name || str(value.email, "Unknown"),
    email: optStr(value.email) ?? undefined,
    avatarUrl: optStr(pick(value, "avatarUrl", "avatar_url", "avatar", "image")),
    role: value.role !== undefined ? toRole(isRecord(value.role) ? value.role.name : value.role) : undefined,
    jobTitle: optStr(pick(value, "jobTitle", "job_title", "title", "position")),
  };
}

export function toDepartmentSummary(value: unknown): DepartmentSummary | null {
  if (!isRecord(value)) return null;
  return { id: id(pick(value, "id", "_id")), name: str(value.name) };
}

export function toUser(value: unknown): User {
  const obj = rec(value);
  const summary = toUserSummary(obj) ?? { id: "", name: "Unknown" };
  const department = toDepartmentSummary(obj.department);
  const status = pick(obj, "status");
  const isActive = pick(obj, "isActive", "is_active", "active");
  const permissions = arr(obj.permissions).filter((p): p is string => typeof p === "string");
  return {
    ...summary,
    email: str(obj.email),
    role: toRole(isRecord(obj.role) ? obj.role.name : obj.role),
    status:
      typeof status === "string"
        ? ["INACTIVE", "DEACTIVATED", "SUSPENDED"].includes(status.toUpperCase())
          ? "INACTIVE"
          : "ACTIVE"
        : bool(isActive, true)
          ? "ACTIVE"
          : "INACTIVE",
    departmentId: optStr(pick(obj, "departmentId", "department_id")) ?? department?.id ?? null,
    department,
    permissions: permissions.length ? permissions : undefined,
    isQaTester: obj.isQaTester === true,
    createdAt: optStr(pick(obj, "createdAt", "created_at")) ?? undefined,
  };
}

export function toDepartment(value: unknown): Department {
  const obj = rec(value);
  return {
    id: id(pick(obj, "id", "_id")),
    name: str(obj.name),
    description: optStr(obj.description),
    head: toUserSummary(pick(obj, "head", "departmentHead", "department_head", "lead")),
    memberCount: num(pick(obj, "memberCount", "member_count", "membersCount") ?? countOf(obj, "members") ?? arr(obj.members).length),
    activeTaskCount: num(pick(obj, "activeTaskCount", "active_task_count", "activeTasks") ?? countOf(obj, "tasks")),
    projectCount: num(pick(obj, "projectCount", "project_count") ?? countOf(obj, "projects")),
  };
}

export function toClientSummary(value: unknown): ClientSummary | null {
  if (!isRecord(value)) return null;
  return { id: id(pick(value, "id", "_id")), name: str(value.name) };
}

export function toClient(value: unknown): Client {
  const obj = rec(value);
  return {
    id: id(pick(obj, "id", "_id")),
    name: str(obj.name),
    contactName: optStr(pick(obj, "contactName", "contact_name", "contactPerson")),
    email: optStr(obj.email),
    phone: optStr(obj.phone),
    website: optStr(obj.website),
    industry: optStr(obj.industry),
    notes: optStr(obj.notes),
    projectCount: num(pick(obj, "projectCount", "project_count") ?? countOf(obj, "projects") ?? arr(obj.projects).length),
    activeProjectCount: num(pick(obj, "activeProjectCount", "active_project_count")),
  };
}

export function toProject(value: unknown): Project {
  const obj = rec(value);
  const taskCount = num(pick(obj, "taskCount", "task_count", "tasksCount") ?? countOf(obj, "tasks"));
  const completed = num(pick(obj, "completedTaskCount", "completed_task_count", "completedTasks"));
  const rawProgress = pick(obj, "progress", "completion", "progressPercent");
  const progress =
    rawProgress !== undefined ? num(rawProgress) : taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;
  const clientRaw = obj.client;
  const typeRaw = str(pick(obj, "type", "projectType", "project_type")).toUpperCase();
  const isInternal = pick(obj, "isInternal", "is_internal");
  const type: ProjectType =
    typeRaw === "INTERNAL" || typeRaw === "EXTERNAL"
      ? typeRaw
      : isInternal !== undefined
        ? bool(isInternal)
          ? "INTERNAL"
          : "EXTERNAL"
        : clientRaw
          ? "EXTERNAL"
          : "INTERNAL";
  const members = arr(obj.members)
    .map((m) => toUserSummary(isRecord(m) && isRecord(m.user) ? m.user : m))
    .filter((m): m is UserSummary => m !== null);
  return {
    id: id(pick(obj, "id", "_id")),
    name: str(obj.name),
    description: optStr(obj.description),
    client: toClientSummary(clientRaw) ?? (optStr(pick(obj, "clientName", "client_name")) ? { id: str(pick(obj, "clientId", "client_id")), name: str(pick(obj, "clientName", "client_name")) } : null),
    type,
    status: toProjectStatus(obj.status),
    priority: toPriority(obj.priority),
    manager: toUserSummary(pick(obj, "manager", "projectManager", "project_manager", "pm")),
    qa: toUserSummary(obj.qa),
    workflow: bool(obj.workflow),
    members,
    startDate: optStr(pick(obj, "startDate", "start_date")),
    deadline: optStr(pick(obj, "deadline", "endDate", "end_date", "dueDate", "due_date")),
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    taskCount,
    completedTaskCount: completed,
    estimatedHours: optNum(pick(obj, "estimatedHours", "estimated_hours")),
    createdAt: optStr(pick(obj, "createdAt", "created_at")) ?? undefined,
  };
}

export function toMilestone(value: unknown): Milestone {
  const obj = rec(value);
  const project = rec(obj.project);
  return {
    id: id(pick(obj, "id", "_id")),
    projectId: str(pick(obj, "projectId", "project_id") ?? project.id),
    projectName: optStr(project.name) ?? optStr(pick(obj, "projectName")) ?? undefined,
    name: str(pick(obj, "name", "title")),
    description: optStr(obj.description),
    status: toMilestoneStatus(obj.status),
    startDate: optStr(pick(obj, "startDate", "start_date")),
    dueDate: optStr(pick(obj, "dueDate", "due_date", "deadline", "endDate")),
    progress: num(obj.progress),
    taskCount: num(pick(obj, "taskCount", "task_count") ?? countOf(obj, "tasks")),
  };
}

function toRef(value: unknown, nameKeys: string[] = ["name", "title"]): { id: string; name: string } | null {
  if (!isRecord(value)) return null;
  return { id: id(pick(value, "id", "_id")), name: str(pick(value, ...nameKeys)) };
}

function toTags(value: unknown): string[] {
  return arr(value)
    .map((t) => (typeof t === "string" ? t : isRecord(t) ? str(t.name) : ""))
    .filter(Boolean);
}

export function toTaskSummary(value: unknown): TaskSummary {
  const obj = rec(value);
  const projectRef = toRef(obj.project);
  const projectName = optStr(pick(obj, "projectName", "project_name"));
  const subtasks = arr(obj.subtasks);
  return {
    id: id(pick(obj, "id", "_id")),
    title: str(pick(obj, "title", "name")),
    status: toTaskStatus(obj.status),
    priority: toPriority(obj.priority),
    type: obj.type !== undefined ? toTaskType(obj.type) : undefined,
    project: projectRef ?? (projectName ? { id: str(pick(obj, "projectId", "project_id")), name: projectName } : null),
    milestone: toRef(obj.milestone),
    parentId: optStr(pick(obj, "parentId", "parent_id")) ?? (isRecord(obj.parent) ? optStr(pick(obj.parent, "id", "_id")) : optStr(obj.parent)),
    parent: isRecord(obj.parent) ? toRef(obj.parent) : null,
    issueKind: toQaIssueKind(obj.issueKind),
    assignee: toUserSummary(pick(obj, "assignee", "assignedTo", "assigned_to")),
    reviewer: toUserSummary(obj.reviewer),
    qa: toUserSummary(obj.qa),
    startDate: optStr(pick(obj, "startDate", "start_date")),
    dueDate: optStr(pick(obj, "dueDate", "due_date", "deadline")),
    qaDueDate: optStr(pick(obj, "qaDueDate", "qa_due_date")),
    qaResult: obj.qaResult === "PASSED" || obj.qaResult === "BUGS" ? obj.qaResult : null,
    stage: (WORKFLOW_STAGES as readonly unknown[]).includes(obj.stage) ? (obj.stage as WorkflowStage) : null,
    estimatedHours: optNum(pick(obj, "estimatedHours", "estimated_hours")),
    actualHours: optNum(pick(obj, "actualHours", "actual_hours", "loggedHours")),
    subtaskCount: num(pick(obj, "subtaskCount", "subtask_count") ?? countOf(obj, "subtasks") ?? subtasks.length),
    completedSubtaskCount: num(
      pick(obj, "completedSubtaskCount", "completed_subtask_count") ??
        subtasks.filter((s) => {
          const st = toTaskStatus(rec(s).status);
          return st === "COMPLETED" || st === "TESTED" || st === "APPROVED";
        }).length,
    ),
    commentCount: num(pick(obj, "commentCount", "comment_count") ?? countOf(obj, "comments")),
    issueCount: num(obj.issueCount),
    openIssueCount: num(obj.openIssueCount),
    tags: toTags(obj.tags),
  };
}

export function toSubtask(value: unknown): Subtask {
  const obj = rec(value);
  return {
    id: id(pick(obj, "id", "_id")),
    title: str(pick(obj, "title", "name")),
    status: toTaskStatus(obj.status),
    priority: obj.priority !== undefined && obj.priority !== null ? toPriority(obj.priority) : null,
    issueKind: toQaIssueKind(obj.issueKind),
    dueDate: optStr(pick(obj, "dueDate", "due_date")),
    assignee: toUserSummary(obj.assignee),
  };
}

const toQaIssueKind = (v: unknown): QaIssueKind | null => ((QA_ISSUE_KINDS as readonly unknown[]).includes(v) ? (v as QaIssueKind) : null);

function toQaIssue(value: unknown): QaIssue | null {
  if (!isRecord(value)) return null;
  const kind = toQaIssueKind(value.kind);
  if (!kind) return null;
  return {
    kind,
    steps: optStr(value.steps),
    expected: optStr(value.expected),
    actual: optStr(value.actual),
    environment: optStr(value.environment),
    reportedBy: toUserSummary(value.reportedBy),
  };
}

export function toAttachment(value: unknown): Attachment {
  const obj = rec(value);
  return {
    id: id(pick(obj, "id", "_id")),
    fileName: str(pick(obj, "fileName", "file_name", "name", "originalName"), "file"),
    url: str(pick(obj, "url", "fileUrl", "file_url", "path")),
    size: optNum(obj.size),
    mimeType: optStr(pick(obj, "mimeType", "mime_type", "contentType")),
    uploadedBy: toUserSummary(pick(obj, "uploadedBy", "uploaded_by", "user")),
    createdAt: str(pick(obj, "createdAt", "created_at")),
  };
}

export function toTask(value: unknown): Task {
  const obj = rec(value);
  return {
    ...toTaskSummary(obj),
    description: optStr(obj.description),
    qaIssue: toQaIssue(obj.qaIssue),
    department: toDepartmentSummary(obj.department),
    subtasks: arr(obj.subtasks).map(toSubtask),
    attachments: arr(obj.attachments).map(toAttachment),
    createdBy: toUserSummary(pick(obj, "createdBy", "created_by", "creator")),
    createdAt: optStr(pick(obj, "createdAt", "created_at")) ?? undefined,
    updatedAt: optStr(pick(obj, "updatedAt", "updated_at")) ?? undefined,
  };
}

export function toReviewEntry(value: unknown): ReviewEntry {
  const obj = rec(value);
  const raw = str(pick(obj, "decision", "status", "action", "type")).toUpperCase();
  const decision: ReviewDecision =
    raw === "QA_PASSED" || raw === "QA_FAILED"
      ? raw
      : raw.includes("APPROV")
        ? "APPROVED"
        : raw.includes("CHANGE") || raw.includes("REJECT")
          ? "CHANGES_REQUESTED"
          : "SUBMITTED";
  return {
    id: id(pick(obj, "id", "_id")),
    decision,
    feedback: optStr(pick(obj, "feedback", "comment", "reason", "note")),
    actor: toUserSummary(pick(obj, "actor", "reviewer", "user", "submittedBy")) ?? { id: "", name: "Unknown" },
    createdAt: str(pick(obj, "createdAt", "created_at")),
  };
}

export function toComment(value: unknown): Comment {
  const obj = rec(value);
  const createdAt = str(pick(obj, "createdAt", "created_at"));
  const updatedAt = optStr(pick(obj, "updatedAt", "updated_at"));
  return {
    id: id(pick(obj, "id", "_id")),
    taskId: str(pick(obj, "taskId", "task_id")),
    body: str(pick(obj, "body", "content", "text", "message")),
    author: toUserSummary(pick(obj, "author", "user", "createdBy")) ?? { id: "", name: "Unknown" },
    mentions: arr(obj.mentions)
      .map((m) => toUserSummary(isRecord(m) && isRecord(m.user) ? m.user : m))
      .filter((m): m is UserSummary => m !== null),
    createdAt,
    updatedAt,
    edited: bool(pick(obj, "edited", "isEdited"), Boolean(updatedAt && createdAt && updatedAt !== createdAt)),
  };
}

export function toActivity(value: unknown): ActivityItem {
  const obj = rec(value);
  const entity = rec(obj.entity);
  const targetRaw = rec(obj.target);
  return {
    id: id(pick(obj, "id", "_id")),
    actor: toUserSummary(pick(obj, "actor", "user", "performedBy")),
    action: str(pick(obj, "action", "verb", "type")).toLowerCase().replace(/_/g, " "),
    entityType: toEntityType(pick(obj, "entityType", "entity_type") ?? entity.type),
    entityId: str(pick(obj, "entityId", "entity_id") ?? entity.id),
    entityName: str(pick(obj, "entityName", "entity_name", "entityTitle") ?? entity.name ?? entity.title),
    target: Object.keys(targetRaw).length
      ? { type: toEntityType(targetRaw.type), id: str(targetRaw.id), name: str(pick(targetRaw, "name", "title")) }
      : null,
    message: optStr(pick(obj, "message", "description", "summary")),
    createdAt: str(pick(obj, "createdAt", "created_at", "timestamp")),
  };
}

export function toNotification(value: unknown): AppNotification {
  const obj = rec(value);
  return {
    id: id(pick(obj, "id", "_id")),
    type: toNotificationType(obj.type),
    title: str(pick(obj, "title", "message", "subject")),
    body: optStr(pick(obj, "body", "content", "description")),
    read: bool(pick(obj, "read", "isRead", "is_read"), Boolean(pick(obj, "readAt", "read_at"))),
    entityType: pick(obj, "entityType", "entity_type") !== undefined ? toEntityType(pick(obj, "entityType", "entity_type")) : null,
    entityId: optStr(pick(obj, "entityId", "entity_id")),
    actor: toUserSummary(pick(obj, "actor", "sender", "fromUser")),
    createdAt: str(pick(obj, "createdAt", "created_at")),
  };
}

// ---------------------------------------------------------------------------
// Analytics primitives
// ---------------------------------------------------------------------------

/**
 * Accepts `[{status: "TODO", count: 3}]`, `[{key, value}]` or `{TODO: 3}`.
 */
export function toCounts<K extends string>(value: unknown, mapKey: (v: unknown) => K): CountByKey<K>[] {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      const obj = rec(entry);
      return {
        key: mapKey(pick(obj, "key", "status", "name", "label", "type", "priority")),
        count: num(pick(obj, "count", "value", "total", "_count")),
      };
    });
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([key, count]) => ({ key: mapKey(key), count: num(count) }));
  }
  return [];
}

export function toWorkload(value: unknown): WorkloadEntry {
  const obj = rec(value);
  const user = rec(obj.user);
  return {
    userId: str(pick(obj, "userId", "user_id") ?? user.id),
    name: str(pick(obj, "name", "userName") ?? user.name),
    avatarUrl: optStr(pick(obj, "avatarUrl") ?? user.avatarUrl),
    departmentName: optStr(pick(obj, "departmentName", "department")),
    assigned: num(pick(obj, "assigned", "assignedTasks", "total", "totalTasks")),
    estimatedHours: num(pick(obj, "estimatedHours", "estimated_hours", "estimated")),
    completed: num(pick(obj, "completed", "completedTasks")),
    inReview: num(pick(obj, "inReview", "in_review")),
    blocked: num(pick(obj, "blocked", "blockedTasks")),
    overdue: num(pick(obj, "overdue", "overdueTasks")),
    role: obj.role === "QA" || obj.role === "DEVELOPER" ? obj.role : undefined,
  };
}

export function toDepartmentWorkload(value: unknown): DepartmentWorkload {
  const obj = rec(value);
  const dept = rec(obj.department);
  return {
    departmentId: str(pick(obj, "departmentId", "department_id") ?? dept.id),
    departmentName: str(pick(obj, "departmentName", "department_name", "name") ?? dept.name),
    assigned: num(pick(obj, "assigned", "total", "tasks", "activeTasks")),
    completed: num(pick(obj, "completed")),
    overdue: num(pick(obj, "overdue")),
    estimatedHours: num(pick(obj, "estimatedHours", "estimated_hours")),
  };
}

export function toActivityPoint(value: unknown): ActivityPoint {
  const obj = rec(value);
  return {
    date: str(pick(obj, "date", "week", "day", "period")),
    created: num(pick(obj, "created", "createdCount")),
    completed: num(pick(obj, "completed", "completedCount")),
  };
}

export function toDeadline(value: unknown): DeadlineItem {
  const obj = rec(value);
  const project = rec(obj.project);
  const kindRaw = str(pick(obj, "kind", "type", "entityType")).toUpperCase();
  return {
    id: id(pick(obj, "id", "_id")),
    kind: kindRaw === "PROJECT" || kindRaw === "MILESTONE" ? kindRaw : "TASK",
    title: str(pick(obj, "title", "name")),
    dueDate: str(pick(obj, "dueDate", "due_date", "deadline")),
    projectId: optStr(pick(obj, "projectId", "project_id") ?? project.id),
    projectName: optStr(pick(obj, "projectName", "project_name") ?? project.name),
    assignee: toUserSummary(obj.assignee),
    status: optStr(obj.status) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Normalizes list responses. Supports:
 *  - `{ data: T[], meta: { page, pageSize|limit, total, totalPages } }`
 *  - `{ items|results|rows: T[], total, page, ... }`
 *  - a bare `T[]`
 */
export function toPaginated<T>(data: unknown, meta: unknown, mapItem: (v: unknown) => T): Paginated<T> {
  let items: unknown[] = [];
  let info: Raw = rec(meta);
  if (Array.isArray(data)) {
    items = data;
  } else if (isRecord(data)) {
    items = arr(pick(data, "items", "results", "rows", "data", "records"));
    info = { ...rec(pick(data, "meta", "pagination")), ...pickPaginationFields(data), ...info };
  }
  const pageSize = num(pick(info, "pageSize", "page_size", "limit", "perPage", "per_page"), items.length || 20);
  const total = num(pick(info, "total", "totalCount", "total_count", "count"), items.length);
  const page = num(pick(info, "page", "currentPage", "current_page"), 1);
  const totalPages = num(pick(info, "totalPages", "total_pages", "pages"), Math.max(1, Math.ceil(total / Math.max(1, pageSize))));
  return { items: items.map(mapItem), page, pageSize, total, totalPages };
}

function pickPaginationFields(obj: Raw): Raw {
  const out: Raw = {};
  for (const key of ["page", "pageSize", "limit", "total", "totalPages", "total_pages", "count"]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

/** For endpoints that may return either a list or a paginated wrapper. */
export function toList<T>(data: unknown, mapItem: (v: unknown) => T): T[] {
  if (Array.isArray(data)) return data.map(mapItem);
  if (isRecord(data)) return arr(pick(data, "items", "results", "rows", "data", "records")).map(mapItem);
  return [];
}
