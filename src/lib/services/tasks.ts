import { api, type QueryParams } from "@/lib/api";
import {
  arr,
  rec,
  toAttachment,
  toComment,
  toList,
  toPaginated,
  toReviewEntry,
  toTask,
  toTaskSummary,
} from "@/lib/services/normalize";
import type {
  Attachment,
  Comment,
  ID,
  MyDay,
  Paginated,
  Priority,
  ReviewEntry,
  SortDirection,
  Task,
  TaskStatus,
  TaskSummary,
  TaskType,
} from "@/types/domain";

export interface TaskFilters extends QueryParams {
  search?: string;
  projectId?: ID;
  milestoneId?: ID;
  assigneeId?: ID | "me";
  reviewerId?: ID | "me";
  departmentId?: ID;
  status?: TaskStatus | readonly TaskStatus[];
  priority?: Priority;
  overdue?: boolean;
  dueFrom?: string;
  dueTo?: string;
  sortBy?: "title" | "dueDate" | "priority" | "status" | "estimatedHours" | "actualHours" | "createdAt";
  sortOrder?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  projectId: ID;
  milestoneId?: ID | null;
  assigneeId?: ID | null;
  reviewerId?: ID | null;
  departmentId?: ID | null;
  priority: Priority;
  type: TaskType;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  tags: string[];
  parentId?: ID | null;
}

export type TaskUpdate = Partial<TaskInput> & { actualHours?: number | null };

export const tasksService = {
  async list(filters: TaskFilters = {}): Promise<Paginated<TaskSummary>> {
    const { data, meta } = await api.getWithMeta("/api/tasks", { params: filters });
    return toPaginated(data, meta, toTaskSummary);
  },
  get: async (id: ID): Promise<Task> => toTask(await api.get(`/api/tasks/${id}`)),
  create: async (input: TaskInput): Promise<Task> => toTask(await api.post("/api/tasks", input)),
  update: async (id: ID, input: TaskUpdate): Promise<Task> => toTask(await api.patch(`/api/tasks/${id}`, input)),
  remove: (id: ID) => api.delete(`/api/tasks/${id}`),

  /** All status transitions go through the backend, which validates them. */
  updateStatus: async (id: ID, status: TaskStatus): Promise<Task> =>
    toTask(await api.patch(`/api/tasks/${id}/status`, { status })),

  submitForReview: async (id: ID, note?: string): Promise<Task> =>
    toTask(await api.post(`/api/tasks/${id}/submit`, note ? { note } : {})),
  approve: async (id: ID, feedback?: string): Promise<Task> =>
    toTask(await api.post(`/api/tasks/${id}/approve`, feedback ? { feedback } : {})),
  requestChanges: async (id: ID, feedback: string): Promise<Task> =>
    toTask(await api.post(`/api/tasks/${id}/request-changes`, { feedback })),

  reviews: async (id: ID): Promise<ReviewEntry[]> => toList(await api.get(`/api/tasks/${id}/reviews`), toReviewEntry),

  async myDay(date: string): Promise<MyDay> {
    const data = rec(await api.get("/api/tasks/my-day", { params: { date } }));
    return {
      date: typeof data.date === "string" ? data.date : date,
      today: arr(data.today ?? data.todayTasks).map(toTaskSummary),
      overdue: arr(data.overdue).map(toTaskSummary),
      upcoming: arr(data.upcoming).map(toTaskSummary),
      inReview: arr(data.inReview ?? data.in_review).map(toTaskSummary),
      blocked: arr(data.blocked).map(toTaskSummary),
    };
  },

  comments: async (taskId: ID): Promise<Comment[]> =>
    toList(await api.get(`/api/tasks/${taskId}/comments`), toComment),
  addComment: async (taskId: ID, body: string, mentionIds: ID[]): Promise<Comment> =>
    toComment(await api.post(`/api/tasks/${taskId}/comments`, { body, mentionIds })),
  editComment: async (taskId: ID, commentId: ID, body: string, mentionIds: ID[]): Promise<Comment> =>
    toComment(await api.patch(`/api/tasks/${taskId}/comments/${commentId}`, { body, mentionIds })),
  deleteComment: (taskId: ID, commentId: ID) => api.delete(`/api/tasks/${taskId}/comments/${commentId}`),

  uploadAttachment: async (taskId: ID, file: File): Promise<Attachment> => {
    const form = new FormData();
    form.append("file", file);
    return toAttachment(await api.post(`/api/tasks/${taskId}/attachments`, form));
  },
  deleteAttachment: (taskId: ID, attachmentId: ID) => api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`),
};
