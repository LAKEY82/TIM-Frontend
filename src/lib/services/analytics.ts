import { api } from "@/lib/api";
import {
  arr,
  num,
  pick,
  rec,
  str,
  toActivity,
  toActivityPoint,
  toCounts,
  toDeadline,
  toDepartmentWorkload,
  toPriority,
  toProject,
  toProjectStatus,
  toTaskStatus,
  toTaskType,
  toWorkload,
} from "@/lib/services/normalize";
import type {
  CompanyAnalytics,
  DepartmentAnalytics,
  DepartmentMetric,
  ID,
  ProjectAnalytics,
  TaskAnalytics,
  WorkloadEntry,
} from "@/types/domain";

export interface AnalyticsRange {
  from?: string;
  to?: string;
}

const identity = (v: unknown) => str(v);

function toReviewCycle(value: unknown) {
  return arr(value).map((p) => {
    const o = rec(p);
    return {
      date: str(pick(o, "date", "week")),
      averageHours: num(pick(o, "averageHours", "avgHours", "average_hours")),
      reviews: num(pick(o, "reviews", "count")),
    };
  });
}

function toTrend(value: unknown) {
  return arr(value).map((p) => {
    const o = rec(p);
    return { date: str(pick(o, "date", "week")), count: num(pick(o, "count", "value")) };
  });
}

function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function normalizeCompanyAnalytics(raw: unknown): CompanyAnalytics {
  const o = rec(raw);
  const s = rec(pick(o, "summary", "cards", "totals"));
  return {
    summary: {
      activeProjects: num(pick(s, "activeProjects", "active_projects")),
      completedProjects: num(pick(s, "completedProjects", "completed_projects")),
      atRiskProjects: num(pick(s, "atRiskProjects", "at_risk_projects", "atRisk")),
      overdueTasks: num(pick(s, "overdueTasks", "overdue_tasks", "overdue")),
      completedTasks: num(pick(s, "completedTasks", "completed_tasks", "tasksCompleted")),
      inReviewTasks: num(pick(s, "inReviewTasks", "in_review_tasks", "tasksInReview", "inReview")),
      blockedTasks: num(pick(s, "blockedTasks", "blocked_tasks", "blocked")),
      openTasks: num(pick(s, "openTasks", "open_tasks", "activeTasks")),
    },
    projectStatus: toCounts(pick(o, "projectStatus", "project_status", "projectsByStatus"), toProjectStatus),
    taskStatus: toCounts(pick(o, "taskStatus", "task_status", "tasksByStatus"), toTaskStatus),
    departmentWorkload: arr(pick(o, "departmentWorkload", "department_workload")).map(toDepartmentWorkload),
    weeklyActivity: arr(pick(o, "weeklyActivity", "weekly_activity", "activity")).map(toActivityPoint),
    projectProgress: arr(pick(o, "projectProgress", "project_progress")).map((p) => {
      const po = rec(p);
      return {
        projectId: str(pick(po, "projectId", "id")),
        name: str(pick(po, "name", "projectName")),
        progress: num(po.progress),
        status: po.status ? toProjectStatus(po.status) : undefined,
      };
    }),
    upcomingDeadlines: arr(pick(o, "upcomingDeadlines", "upcoming_deadlines", "deadlines")).map(toDeadline),
    projectsRequiringAttention: arr(pick(o, "projectsRequiringAttention", "attention", "atRisk")).map((p) => {
      const po = rec(p);
      const reasons = arr(pick(po, "reasons", "flags")).filter((r): r is string => typeof r === "string");
      const reason = typeof po.reason === "string" ? [po.reason] : [];
      return { project: toProject(po.project ?? po), reasons: reasons.length ? reasons : reason };
    }),
    recentActivity: arr(pick(o, "recentActivity", "recent_activity")).map(toActivity),
    reviewCycle: toReviewCycle(pick(o, "reviewCycle", "review_cycle")),
  };
}

export function normalizeProjectAnalytics(projectId: ID, raw: unknown): ProjectAnalytics {
  const o = rec(raw);
  const milestones = rec(o.milestones);
  return {
    projectId,
    progress: num(o.progress),
    totalTasks: num(pick(o, "totalTasks", "total_tasks", "tasks")),
    completedTasks: num(pick(o, "completedTasks", "completed_tasks", "completed")),
    overdueTasks: num(pick(o, "overdueTasks", "overdue_tasks", "overdue")),
    blockedTasks: num(pick(o, "blockedTasks", "blocked_tasks", "blocked")),
    inReviewTasks: num(pick(o, "inReviewTasks", "in_review_tasks", "inReview", "review")),
    milestones: { total: num(milestones.total), completed: num(milestones.completed) },
    taskStatus: toCounts(pick(o, "taskStatus", "task_status"), toTaskStatus),
    hoursByMember: arr(pick(o, "hoursByMember", "hours_by_member", "hours")).map((h) => {
      const ho = rec(h);
      return {
        userId: str(pick(ho, "userId", "id")),
        name: str(pick(ho, "name", "userName")),
        estimatedHours: num(pick(ho, "estimatedHours", "estimated")),
        actualHours: num(pick(ho, "actualHours", "actual")),
      };
    }),
    estimatedHours: num(pick(o, "estimatedHours", "estimated_hours")),
    actualHours: num(pick(o, "actualHours", "actual_hours")),
    workload: arr(pick(o, "workload", "teamWorkload")).map(toWorkload),
    activity: arr(pick(o, "activity", "weeklyActivity")).map(toActivityPoint),
  };
}

export function normalizeDepartmentAnalytics(departmentId: ID, raw: unknown): DepartmentAnalytics {
  const o = rec(raw);
  const metricsRaw = pick(o, "metrics", "summary", "cards");
  let metrics: DepartmentMetric[];
  if (Array.isArray(metricsRaw)) {
    metrics = metricsRaw.map((m) => {
      const mo = rec(m);
      const key = str(pick(mo, "key", "name"));
      return { key, label: str(mo.label) || humanize(key), value: num(pick(mo, "value", "count")) };
    });
  } else {
    metrics = Object.entries(rec(metricsRaw)).map(([key, value]) => ({ key, label: humanize(key), value: num(value) }));
  }
  const breakdownsRaw = rec(pick(o, "breakdowns"));
  return {
    departmentId,
    departmentName: str(pick(o, "departmentName", "name") ?? rec(o.department).name),
    metrics,
    taskStatus: toCounts(pick(o, "taskStatus", "task_status"), toTaskStatus),
    workload: arr(pick(o, "workload", "members")).map(toWorkload),
    activity: arr(pick(o, "activity", "weeklyActivity")).map(toActivityPoint),
    breakdowns: Array.isArray(o.breakdowns)
      ? o.breakdowns.map((b) => {
          const bo = rec(b);
          const key = str(bo.key);
          return { key, label: str(bo.label) || humanize(key), items: toCounts(bo.items, identity) };
        })
      : Object.entries(breakdownsRaw).map(([key, value]) => ({ key, label: humanize(key), items: toCounts(value, identity) })),
  };
}

export function normalizeTaskAnalytics(raw: unknown): TaskAnalytics {
  const o = rec(raw);
  return {
    taskStatus: toCounts(pick(o, "taskStatus", "byStatus"), toTaskStatus),
    byPriority: toCounts(pick(o, "byPriority", "priority"), toPriority),
    byType: toCounts(pick(o, "byType", "type"), toTaskType),
    completion: arr(pick(o, "completion", "weeklyActivity", "activity")).map(toActivityPoint),
    overdueTrend: toTrend(pick(o, "overdueTrend", "overdue")),
    blockedTrend: toTrend(pick(o, "blockedTrend", "blocked")),
    reviewCycle: toReviewCycle(pick(o, "reviewCycle", "review_cycle")),
  };
}

export const analyticsService = {
  company: async (range: AnalyticsRange = {}) =>
    normalizeCompanyAnalytics(await api.get("/api/analytics/company", { params: { ...range } })),
  project: async (projectId: ID) =>
    normalizeProjectAnalytics(projectId, await api.get(`/api/analytics/projects/${projectId}`)),
  department: async (departmentId: ID, range: AnalyticsRange = {}) =>
    normalizeDepartmentAnalytics(departmentId, await api.get(`/api/analytics/departments/${departmentId}`, { params: { ...range } })),
  tasks: async (range: AnalyticsRange = {}) => normalizeTaskAnalytics(await api.get("/api/analytics/tasks", { params: { ...range } })),
  async workload(params: { departmentId?: ID; projectId?: ID; managerId?: ID } = {}): Promise<WorkloadEntry[]> {
    const data = await api.get("/api/analytics/workload", { params });
    return (Array.isArray(data) ? data : arr(rec(data).items ?? rec(data).workload)).map(toWorkload);
  },
};
