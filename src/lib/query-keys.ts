/**
 * Query key factory. Every key starts with its resource so a whole resource
 * can be invalidated with e.g. `queryKeys.tasks.all`.
 */
import type { ActivityFilters } from "@/lib/services/misc";
import type { ProjectFilters } from "@/lib/services/projects";
import type { TaskFilters } from "@/lib/services/tasks";
import type { UserFilters } from "@/lib/services/users";
import type { AnalyticsRange } from "@/lib/services/analytics";
import type { ID } from "@/types/domain";

export const queryKeys = {
  auth: { me: ["auth", "me"] as const },

  users: {
    all: ["users"] as const,
    list: (filters: UserFilters) => ["users", "list", filters] as const,
    options: (params: { departmentId?: ID; search?: string }) => ["users", "options", params] as const,
    detail: (id: ID) => ["users", "detail", id] as const,
    workload: (id: ID) => ["users", "workload", id] as const,
  },

  departments: {
    all: ["departments"] as const,
    list: ["departments", "list"] as const,
    detail: (id: ID) => ["departments", "detail", id] as const,
  },

  projects: {
    all: ["projects"] as const,
    list: (filters: ProjectFilters) => ["projects", "list", filters] as const,
    detail: (id: ID) => ["projects", "detail", id] as const,
    members: (id: ID) => ["projects", "members", id] as const,
    files: (id: ID) => ["projects", "files", id] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    list: (filters: TaskFilters) => ["tasks", "list", filters] as const,
    detail: (id: ID) => ["tasks", "detail", id] as const,
    reviews: (id: ID) => ["tasks", "reviews", id] as const,
    myDay: (date: string) => ["tasks", "my-day", date] as const,
  },

  comments: {
    all: ["comments"] as const,
    forTask: (taskId: ID) => ["comments", taskId] as const,
  },

  milestones: {
    all: ["milestones"] as const,
    list: (params: { projectId?: ID; from?: string; to?: string }) => ["milestones", "list", params] as const,
  },

  dailyTasks: {
    all: ["daily-tasks"] as const,
    list: (params: { date: string; assigneeId?: ID }) => ["daily-tasks", "list", params] as const,
    workload: (date: string) => ["daily-tasks", "workload", date] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: (params: { page?: number; unreadOnly?: boolean }) => ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },

  activity: {
    all: ["activity"] as const,
    list: (filters: ActivityFilters) => ["activity", "list", filters] as const,
  },

  clients: {
    all: ["clients"] as const,
    list: (params: { search?: string; page?: number }) => ["clients", "list", params] as const,
    detail: (id: ID) => ["clients", "detail", id] as const,
  },

  search: (q: string) => ["search", q] as const,

  analytics: {
    all: ["analytics"] as const,
    company: (range: AnalyticsRange) => ["analytics", "company", range] as const,
    project: (id: ID) => ["analytics", "project", id] as const,
    department: (id: ID, range: AnalyticsRange) => ["analytics", "department", id, range] as const,
    tasks: (range: AnalyticsRange) => ["analytics", "tasks", range] as const,
    workload: (params: { departmentId?: ID; projectId?: ID; managerId?: ID }) =>
      ["analytics", "workload", params] as const,
  },

  settings: {
    company: ["settings", "company"] as const,
    notifications: ["settings", "notifications"] as const,
  },
};
