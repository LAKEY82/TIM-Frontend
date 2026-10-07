/**
 * Domain types shared by the whole frontend.
 *
 * These describe the shape the UI works with. The service layer in
 * `src/lib/services` is responsible for turning raw backend responses into
 * these shapes, so components never deal with transport details.
 */

export type ID = string;
export type ISODateString = string;

// ---------------------------------------------------------------------------
// Users, roles, departments
// ---------------------------------------------------------------------------

export const ROLES = [
  "ADMIN",
  "CEO",
  "MANAGING_DIRECTOR",
  "PROJECT_MANAGER",
  "DEPARTMENT_HEAD",
  "EMPLOYEE",
] as const;
export type Role = (typeof ROLES)[number];

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserSummary {
  id: ID;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  role?: Role;
  jobTitle?: string | null;
}

export interface User extends UserSummary {
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: ID | null;
  department?: DepartmentSummary | null;
  /** Optional explicit permission list from the backend. */
  permissions?: string[];
  createdAt?: ISODateString;
}

export interface DepartmentSummary {
  id: ID;
  name: string;
}

export interface Department extends DepartmentSummary {
  description?: string | null;
  head?: UserSummary | null;
  memberCount: number;
  activeTaskCount: number;
  projectCount: number;
}

export interface DepartmentDetail extends Department {
  members: User[];
}

// ---------------------------------------------------------------------------
// Projects, milestones, clients
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "QA_TESTING",
  "ON_HOLD",
  "AT_RISK",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type ProjectType = "INTERNAL" | "EXTERNAL";

export interface ClientSummary {
  id: ID;
  name: string;
}

export interface Project {
  id: ID;
  name: string;
  description?: string | null;
  client?: ClientSummary | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  manager?: UserSummary | null;
  /** QA person who tests tasks after code review. */
  qa?: UserSummary | null;
  /** True once the project is broken into workflow stages. */
  workflow?: boolean;
  members: UserSummary[];
  startDate?: ISODateString | null;
  deadline?: ISODateString | null;
  /** 0 - 100 */
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  estimatedHours?: number | null;
  createdAt?: ISODateString;
}

export const MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "MISSED"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface Milestone {
  id: ID;
  projectId: ID;
  projectName?: string;
  name: string;
  description?: string | null;
  status: MilestoneStatus;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  progress: number;
  taskCount: number;
}

export interface Retainer {
  id: ID;
  name: string;
  status: string;
  startDate?: ISODateString | null;
  endDate?: ISODateString | null;
  hoursPerMonth?: number | null;
}

export interface Client {
  id: ID;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
  projectCount: number;
  activeProjectCount: number;
}

export interface ClientDetail extends Client {
  projects: Project[];
  retainers: Retainer[];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const TASK_STATUSES = [
  /** A workflow stage that opens once the stage before it is approved. */
  "WAITING",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "IN_REVIEW",
  /** Passed code review; the project's QA tests it and passes it or reports bugs. */
  "IN_QA",
  /** QA finished testing: a stage subtask that passed, or a stage whose subtasks QA has all tested. */
  "TESTED",
  "CHANGES_REQUESTED",
  "APPROVED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Staged project workflow: Design → Frontend + Backend → QA → Bug fixing, with PM approval between stages. */
export const WORKFLOW_STAGES = ["DESIGN", "FRONTEND", "BACKEND", "QA", "BUG_FIXING"] as const;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const TASK_TYPES = [
  "FEATURE",
  "BUG",
  "DESIGN",
  "CONTENT",
  "CAMPAIGN",
  "TEST",
  "RESEARCH",
  "MEETING",
  "OPERATIONS",
  "OTHER",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface TaskSummary {
  id: ID;
  title: string;
  status: TaskStatus;
  priority: Priority;
  type?: TaskType;
  project?: { id: ID; name: string } | null;
  milestone?: { id: ID; name: string } | null;
  /** Set when this task is a subtask. */
  parentId?: ID | null;
  assignee?: UserSummary | null;
  reviewer?: UserSummary | null;
  /** QA tester: the project's QA, set when the task enters QA. */
  qa?: UserSummary | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
  /** When QA testing should be finished (set by the project manager). */
  qaDueDate?: ISODateString | null;
  /** QA's verdict on a stage subtask in the current testing round. */
  qaResult?: "PASSED" | "BUGS" | null;
  /** Set on a project's workflow stage tasks. */
  stage?: WorkflowStage | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  subtaskCount?: number;
  completedSubtaskCount?: number;
  commentCount?: number;
  tags: string[];
}

export interface Subtask {
  id: ID;
  title: string;
  status: TaskStatus;
  priority?: Priority | null;
  /** Set when QA reported this subtask as an issue. */
  issueKind?: QaIssueKind | null;
  assignee?: UserSummary | null;
}

/** What QA found: each reported item becomes a subtask for the developer. */
export const QA_ISSUE_KINDS = ["BUG", "DEFECT", "ISSUE", "UI", "PERFORMANCE", "SECURITY", "IMPROVEMENT"] as const;
export type QaIssueKind = (typeof QA_ISSUE_KINDS)[number];

/** The QA report behind an issue subtask. */
export interface QaIssue {
  kind: QaIssueKind;
  steps?: string | null;
  expected?: string | null;
  actual?: string | null;
  environment?: string | null;
  reportedBy?: UserSummary | null;
}

export interface Attachment {
  id: ID;
  fileName: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  uploadedBy?: UserSummary | null;
  createdAt: ISODateString;
}

export interface Task extends TaskSummary {
  description?: string | null;
  /** Present on issues QA reported. */
  qaIssue?: QaIssue | null;
  department?: DepartmentSummary | null;
  subtasks: Subtask[];
  attachments: Attachment[];
  createdBy?: UserSummary | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export type ReviewDecision = "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED" | "QA_PASSED" | "QA_FAILED";

export interface ReviewEntry {
  id: ID;
  decision: ReviewDecision;
  feedback?: string | null;
  actor: UserSummary;
  createdAt: ISODateString;
}

export interface Comment {
  id: ID;
  taskId: ID;
  body: string;
  author: UserSummary;
  mentions: UserSummary[];
  createdAt: ISODateString;
  updatedAt?: ISODateString | null;
  edited: boolean;
}

export interface MyDay {
  date: ISODateString;
  today: TaskSummary[];
  overdue: TaskSummary[];
  upcoming: TaskSummary[];
  inReview: TaskSummary[];
  blocked: TaskSummary[];
  /** Tasks waiting for this user to QA them. */
  qaQueue: TaskSummary[];
  /** Project managers: tasks in QA that still need a tester or a QA due date. */
  qaSetup: TaskSummary[];
}

export interface DailyTask {
  id: ID;
  date: ISODateString;
  task: TaskSummary;
  assignee: UserSummary;
  priority: Priority;
  estimatedHours?: number | null;
  dueTime?: string | null;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Activity, notifications, search
// ---------------------------------------------------------------------------

export type EntityType =
  | "PROJECT"
  | "TASK"
  | "MILESTONE"
  | "USER"
  | "CLIENT"
  | "DEPARTMENT"
  | "COMMENT";

export interface ActivityItem {
  id: ID;
  actor: UserSummary | null;
  /** Verb phrase, e.g. "assigned", "submitted for review". */
  action: string;
  entityType: EntityType;
  entityId: ID;
  entityName: string;
  /** Optional secondary subject, e.g. the assignee in "assigned X to Y". */
  target?: { type: EntityType; id: ID; name: string } | null;
  /** Human sentence if the backend already provides one. */
  message?: string | null;
  createdAt: ISODateString;
}

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "REVIEW_REQUESTED",
  "TASK_APPROVED",
  "CHANGES_REQUESTED",
  "DEADLINE_APPROACHING",
  "MENTION",
  "PROJECT_UPDATE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body?: string | null;
  read: boolean;
  entityType?: EntityType | null;
  entityId?: ID | null;
  actor?: UserSummary | null;
  createdAt: ISODateString;
}

export interface SearchResults {
  projects: { id: ID; name: string; status?: ProjectStatus; clientName?: string | null }[];
  tasks: { id: ID; title: string; status?: TaskStatus; projectName?: string | null }[];
  people: { id: ID; name: string; role?: Role; departmentName?: string | null; avatarUrl?: string | null }[];
  clients: { id: ID; name: string }[];
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface CountByKey<K extends string = string> {
  key: K;
  count: number;
}

export interface WorkloadEntry {
  userId: ID;
  name: string;
  avatarUrl?: string | null;
  departmentName?: string | null;
  assigned: number;
  estimatedHours: number;
  completed: number;
  inReview: number;
  blocked: number;
  overdue: number;
}

export interface DepartmentWorkload {
  departmentId: ID;
  departmentName: string;
  assigned: number;
  completed: number;
  overdue: number;
  estimatedHours: number;
}

export interface ActivityPoint {
  /** ISO date for the bucket (day or week start). */
  date: ISODateString;
  created: number;
  completed: number;
}

export interface ProjectProgressPoint {
  projectId: ID;
  name: string;
  progress: number;
  status?: ProjectStatus;
}

export type DeadlineKind = "TASK" | "PROJECT" | "MILESTONE";

export interface DeadlineItem {
  id: ID;
  kind: DeadlineKind;
  title: string;
  dueDate: ISODateString;
  projectId?: ID | null;
  projectName?: string | null;
  assignee?: UserSummary | null;
  status?: string;
}

export interface AttentionProject {
  project: Project;
  reasons: string[];
}

export interface CompanySummary {
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  overdueTasks: number;
  completedTasks: number;
  inReviewTasks: number;
  blockedTasks: number;
  openTasks: number;
}

export interface CompanyAnalytics {
  summary: CompanySummary;
  projectStatus: CountByKey<ProjectStatus>[];
  taskStatus: CountByKey<TaskStatus>[];
  departmentWorkload: DepartmentWorkload[];
  weeklyActivity: ActivityPoint[];
  projectProgress: ProjectProgressPoint[];
  upcomingDeadlines: DeadlineItem[];
  projectsRequiringAttention: AttentionProject[];
  recentActivity: ActivityItem[];
  reviewCycle: { date: ISODateString; averageHours: number; reviews: number }[];
}

export interface ProjectAnalytics {
  projectId: ID;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  inReviewTasks: number;
  milestones: { total: number; completed: number };
  taskStatus: CountByKey<TaskStatus>[];
  hoursByMember: { userId: ID; name: string; estimatedHours: number; actualHours: number }[];
  estimatedHours: number;
  actualHours: number;
  workload: WorkloadEntry[];
  activity: ActivityPoint[];
}

/** Metric keys vary per department (bugs for QA, campaigns for Marketing, ...). */
export interface DepartmentMetric {
  key: string;
  label: string;
  value: number;
}

export interface DepartmentAnalytics {
  departmentId: ID;
  departmentName: string;
  metrics: DepartmentMetric[];
  taskStatus: CountByKey<TaskStatus>[];
  workload: WorkloadEntry[];
  activity: ActivityPoint[];
  /** Optional breakdowns, e.g. QA bug severity. */
  breakdowns: { key: string; label: string; items: CountByKey[] }[];
}

export interface TaskAnalytics {
  taskStatus: CountByKey<TaskStatus>[];
  byPriority: CountByKey<Priority>[];
  byType: CountByKey<TaskType>[];
  completion: ActivityPoint[];
  overdueTrend: { date: ISODateString; count: number }[];
  blockedTrend: { date: ISODateString; count: number }[];
  reviewCycle: { date: ISODateString; averageHours: number; reviews: number }[];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface CompanySettings {
  name: string;
  timezone: string;
  workingHoursPerDay: number;
  weekStartsOn: 0 | 1;
}

export interface NotificationPreferences {
  email: Partial<Record<NotificationType, boolean>>;
  inApp: Partial<Record<NotificationType, boolean>>;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type SortDirection = "asc" | "desc";
