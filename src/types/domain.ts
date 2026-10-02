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
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

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
  assignee?: UserSummary | null;
  reviewer?: UserSummary | null;
  startDate?: ISODateString | null;
  dueDate?: ISODateString | null;
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
  assignee?: UserSummary | null;
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
  department?: DepartmentSummary | null;
  subtasks: Subtask[];
  attachments: Attachment[];
  createdBy?: UserSummary | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export type ReviewDecision = "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";

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
