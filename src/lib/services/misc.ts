/**
 * Smaller resources: milestones, daily tasks, notifications, activity,
 * clients, search and settings.
 */
import { api, type QueryParams } from "@/lib/api";
import {
  arr,
  num,
  optNum,
  optStr,
  pick,
  rec,
  str,
  toActivity,
  toClient,
  toList,
  toMilestone,
  toNotification,
  toPaginated,
  toPriority,
  toProject,
  toProjectStatus,
  toRole,
  toTaskStatus,
  toTaskSummary,
  toUserSummary,
  toWorkload,
} from "@/lib/services/normalize";
import type {
  ActivityItem,
  AppNotification,
  Client,
  ClientDetail,
  CompanySettings,
  DailyTask,
  EntityType,
  ID,
  Milestone,
  MilestoneStatus,
  NotificationPreferences,
  Paginated,
  Priority,
  SearchResults,
  WorkloadEntry,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export interface MilestoneInput {
  projectId: ID;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status?: MilestoneStatus;
}

export const milestonesService = {
  list: async (params: { projectId?: ID; from?: string; to?: string } = {}): Promise<Milestone[]> =>
    toList(await api.get("/api/milestones", { params }), toMilestone),
  create: async (input: MilestoneInput) => toMilestone(await api.post("/api/milestones", input)),
  update: async (id: ID, input: Partial<MilestoneInput>) => toMilestone(await api.patch(`/api/milestones/${id}`, input)),
  remove: (id: ID) => api.delete(`/api/milestones/${id}`),
};

// ---------------------------------------------------------------------------
// Daily tasks
// ---------------------------------------------------------------------------

export interface DailyTaskInput {
  date: string;
  assigneeId: ID;
  taskId: ID;
  priority: Priority;
  estimatedHours?: number | null;
  dueTime?: string | null;
  note?: string | null;
}

function toDailyTask(value: unknown): DailyTask {
  const obj = rec(value);
  return {
    id: str(pick(obj, "id", "_id")),
    date: str(obj.date),
    task: toTaskSummary(obj.task ?? obj),
    assignee: toUserSummary(pick(obj, "assignee", "user")) ?? { id: "", name: "Unassigned" },
    priority: toPriority(obj.priority),
    estimatedHours: optNum(pick(obj, "estimatedHours", "estimated_hours")),
    dueTime: optStr(pick(obj, "dueTime", "due_time")),
    note: optStr(obj.note),
  };
}

export const dailyTasksService = {
  list: async (params: { date: string; assigneeId?: ID }): Promise<DailyTask[]> =>
    toList(await api.get("/api/daily-tasks", { params }), toDailyTask),
  create: async (input: DailyTaskInput) => toDailyTask(await api.post("/api/daily-tasks", input)),
  remove: (id: ID) => api.delete(`/api/daily-tasks/${id}`),
  workload: async (date: string): Promise<WorkloadEntry[]> =>
    toList(await api.get("/api/daily-tasks/workload", { params: { date } }), toWorkload),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsService = {
  async list(params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}): Promise<Paginated<AppNotification>> {
    const { data, meta } = await api.getWithMeta("/api/notifications", { params });
    return toPaginated(data, meta, toNotification);
  },
  async unreadCount(): Promise<number> {
    const data = await api.get("/api/notifications/unread-count");
    return typeof data === "number" ? data : num(pick(rec(data), "count", "unread", "unreadCount"));
  },
  markRead: (id: ID) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch("/api/notifications/read-all"),
};

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export interface ActivityFilters extends QueryParams {
  entityType?: EntityType;
  entityId?: ID;
  projectId?: ID;
  userId?: ID;
  departmentId?: ID;
  clientId?: ID;
  limit?: number;
  page?: number;
}

export const activityService = {
  list: async (filters: ActivityFilters = {}): Promise<ActivityItem[]> =>
    toList(await api.get("/api/activity", { params: { limit: 20, ...filters } }), toActivity),
};

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface ClientInput {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  notes?: string | null;
}

export const clientsService = {
  async list(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<Client>> {
    const { data, meta } = await api.getWithMeta("/api/clients", { params });
    return toPaginated(data, meta, toClient);
  },
  async get(id: ID): Promise<ClientDetail> {
    const data = rec(await api.get(`/api/clients/${id}`));
    return {
      ...toClient(data),
      projects: arr(data.projects).map(toProject),
      retainers: arr(data.retainers).map((r) => {
        const obj = rec(r);
        return {
          id: str(pick(obj, "id", "_id")),
          name: str(pick(obj, "name", "title"), "Retainer"),
          status: str(obj.status, "ACTIVE"),
          startDate: optStr(pick(obj, "startDate", "start_date")),
          endDate: optStr(pick(obj, "endDate", "end_date")),
          hoursPerMonth: optNum(pick(obj, "hoursPerMonth", "hours_per_month", "hours")),
        };
      }),
    };
  },
  create: async (input: ClientInput) => toClient(await api.post("/api/clients", input)),
  update: async (id: ID, input: Partial<ClientInput>) => toClient(await api.patch(`/api/clients/${id}`, input)),
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchService = {
  async search(q: string, signal?: AbortSignal): Promise<SearchResults> {
    const data = rec(await api.get("/api/search", { params: { q }, signal }));
    return {
      projects: arr(data.projects).map((p) => {
        const o = rec(p);
        return {
          id: str(o.id),
          name: str(o.name),
          status: o.status ? toProjectStatus(o.status) : undefined,
          clientName: optStr(pick(o, "clientName") ?? rec(o.client).name),
        };
      }),
      tasks: arr(data.tasks).map((t) => {
        const o = rec(t);
        return {
          id: str(o.id),
          title: str(pick(o, "title", "name")),
          status: o.status ? toTaskStatus(o.status) : undefined,
          projectName: optStr(pick(o, "projectName") ?? rec(o.project).name),
        };
      }),
      people: arr(data.people ?? data.users).map((u) => {
        const o = rec(u);
        const summary = toUserSummary(o);
        return {
          id: summary?.id ?? str(o.id),
          name: summary?.name ?? str(o.name),
          role: o.role ? toRole(o.role) : undefined,
          departmentName: optStr(pick(o, "departmentName") ?? rec(o.department).name),
          avatarUrl: summary?.avatarUrl ?? null,
        };
      }),
      clients: arr(data.clients).map((c) => ({ id: str(rec(c).id), name: str(rec(c).name) })),
    };
  },
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingsService = {
  async company(): Promise<CompanySettings> {
    const o = rec(await api.get("/api/settings/company"));
    return {
      name: str(o.name),
      timezone: str(o.timezone, "Asia/Colombo"),
      workingHoursPerDay: num(pick(o, "workingHoursPerDay", "working_hours_per_day"), 8),
      weekStartsOn: num(pick(o, "weekStartsOn", "week_starts_on"), 1) === 0 ? 0 : 1,
    };
  },
  updateCompany: (input: CompanySettings) => api.patch("/api/settings/company", input),

  async notificationPreferences(): Promise<NotificationPreferences> {
    const o = rec(await api.get("/api/settings/notifications"));
    const toMap = (v: unknown) => {
      const out: Record<string, boolean> = {};
      for (const [k, val] of Object.entries(rec(v))) out[k] = Boolean(val);
      return out;
    };
    return { email: toMap(o.email), inApp: toMap(o.inApp ?? o.in_app) };
  },
  updateNotificationPreferences: (input: NotificationPreferences) => api.put("/api/settings/notifications", input),
};
