"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { tasksService, type QaIssueInput, type TaskFilters, type TaskInput, type TaskUpdate } from "@/lib/services/tasks";
import type { ID, MyDay, Paginated, Task, TaskStatus, TaskSummary } from "@/types/domain";

export function useTasks(filters: TaskFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => tasksService.list(filters),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useTask(id: ID) {
  return useQuery({ queryKey: queryKeys.tasks.detail(id), queryFn: () => tasksService.get(id), enabled: Boolean(id) });
}

export function useTaskReviews(id: ID) {
  return useQuery({ queryKey: queryKeys.tasks.reviews(id), queryFn: () => tasksService.reviews(id), enabled: Boolean(id) });
}

export function useMyDay(date: string) {
  return useQuery({ queryKey: queryKeys.tasks.myDay(date), queryFn: () => tasksService.myDay(date) });
}

// ---------------------------------------------------------------------------
// Cache helpers for optimistic updates
// ---------------------------------------------------------------------------

type Snapshot = [QueryKey, unknown][];

function patchSummary<T extends TaskSummary>(task: T, id: ID, patch: Partial<TaskSummary>): T {
  return task.id === id ? { ...task, ...patch } : task;
}

/**
 * Applies `patch` to task `id` wherever it is cached (lists, detail, My Day)
 * and returns a snapshot for rollback.
 */
export function patchTaskInCaches(queryClient: QueryClient, id: ID, patch: Partial<TaskSummary>): Snapshot {
  const snapshot: Snapshot = [];

  for (const [key, data] of queryClient.getQueriesData<Paginated<TaskSummary>>({ queryKey: ["tasks", "list"] })) {
    if (!data) continue;
    snapshot.push([key, data]);
    queryClient.setQueryData<Paginated<TaskSummary>>(key, {
      ...data,
      items: data.items.map((t) => patchSummary(t, id, patch)),
    });
  }

  const detailKey = queryKeys.tasks.detail(id);
  const detail = queryClient.getQueryData<Task>(detailKey);
  if (detail) {
    snapshot.push([detailKey, detail]);
    queryClient.setQueryData<Task>(detailKey, { ...detail, ...patch });
  }

  for (const [key, data] of queryClient.getQueriesData<MyDay>({ queryKey: ["tasks", "my-day"] })) {
    if (!data) continue;
    snapshot.push([key, data]);
    const map = (list: TaskSummary[]) => list.map((t) => patchSummary(t, id, patch));
    queryClient.setQueryData<MyDay>(key, {
      ...data,
      today: map(data.today),
      overdue: map(data.overdue),
      upcoming: map(data.upcoming),
      inReview: map(data.inReview),
      blocked: map(data.blocked),
      qaQueue: map(data.qaQueue ?? []),
      qaSetup: map(data.qaSetup ?? []),
    });
  }

  return snapshot;
}

function restore(queryClient: QueryClient, snapshot: Snapshot | undefined) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

function invalidateTaskViews(queryClient: QueryClient, id?: ID) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dailyTasks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  if (id) void queryClient.invalidateQueries({ queryKey: ["activity"] });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const STATUS_TOASTS: Partial<Record<TaskStatus, string>> = {
  IN_PROGRESS: "Task started.",
  BLOCKED: "Task marked as blocked.",
  COMPLETED: "Task completed.",
  IN_REVIEW: "Task submitted for review.",
  TODO: "Task moved to To do.",
  APPROVED: "Task approved.",
  CHANGES_REQUESTED: "Changes requested.",
  IN_QA: "Sent to QA.",
};

/**
 * Status change with optimistic UI. The backend validates the transition;
 * if it rejects it, the cached state is rolled back and an error toast shown.
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: ID; status: TaskStatus }) => tasksService.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      return { snapshot: patchTaskInCaches(queryClient, id, { status }) };
    },
    onError: (_error, _vars, context) => restore(queryClient, context?.snapshot),
    onSuccess: (task, { status }) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), (prev: Task | undefined) => (prev ? { ...prev, ...task } : task));
      toast.success(STATUS_TOASTS[status] ?? "Task updated.");
    },
    onSettled: (_data, _error, { id }) => invalidateTaskViews(queryClient, id),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksService.create(input),
    meta: { silentError: true },
    onSuccess: (task) => {
      toast.success(task.assignee ? `Task created and assigned to ${task.assignee.name}.` : "Task created.");
      invalidateTaskViews(queryClient, task.id);
    },
  });
}

export function useUpdateTask(id: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskUpdate) => tasksService.update(id, input),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(id), task);
      toast.success("Task updated.");
      invalidateTaskViews(queryClient, id);
    },
  });
}

export function useSubmitForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: ID; note?: string }) => tasksService.submitForReview(id, note),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      return { snapshot: patchTaskInCaches(queryClient, id, { status: "IN_REVIEW" }) };
    },
    onError: (_e, _v, context) => restore(queryClient, context?.snapshot),
    onSuccess: () => toast.success("Task submitted for review."),
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}

export function useApproveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: ID; feedback?: string }) => tasksService.approve(id, feedback),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      toast.success(task.status === "IN_QA" ? "Approved and sent to QA. Choose the QA tester and QA due date." : task.issueKind ? "Fix verified. The bug is closed." : "Task approved.");
    },
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}

export function useRequestChanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback }: { id: ID; feedback: string }) => tasksService.requestChanges(id, feedback),
    meta: { silentError: true },
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      toast.success("Changes requested.");
    },
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}

export function useUploadTaskAttachment(taskId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => tasksService.uploadAttachment(taskId, file),
    onSuccess: () => {
      toast.success("File uploaded.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    },
  });
}

export function useDeleteTaskAttachment(taskId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: ID) => tasksService.deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      toast.success("File removed.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    },
  });
}

/**
 * Inline edits from list rows (assignee, priority, due date, estimate).
 * Applies `optimistic` to every cached view immediately and rolls back if the
 * API rejects the change. Silent on success: inline edits shouldn't toast.
 */
export function useQuickUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: ID; input: TaskUpdate; optimistic?: Partial<TaskSummary> }) => tasksService.update(id, input),
    onMutate: async ({ id, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      return { snapshot: patchTaskInCaches(queryClient, id, optimistic ?? {}) };
    },
    onError: (_error, _vars, context) => restore(queryClient, context?.snapshot),
    onSuccess: (task) => queryClient.setQueryData(queryKeys.tasks.detail(task.id), task),
    onSettled: (_data, _error, { id }) => invalidateTaskViews(queryClient, id),
  });
}

/** QA passed the task (it becomes Approved). */
/** QA is done testing: issues logged this round go to the developer together, or the task passes. */
export function useQaComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: ID; note?: string }) => tasksService.qaComplete(id, note),
    onSuccess: ({ task, openIssues }) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      toast.success(
        openIssues
          ? `QA complete: ${openIssues} issue${openIssues === 1 ? "" : "s"} sent to ${task.stage === "QA" ? "Bug fixing" : (task.assignee?.name ?? "the developer")}.`
          : "QA complete: passed.",
      );
    },
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}

export function useQaPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: ID; note?: string }) => tasksService.qaPass(id, note),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      return { snapshot: patchTaskInCaches(queryClient, id, { status: "APPROVED" }) };
    },
    onError: (_e, _v, context) => restore(queryClient, context?.snapshot),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      toast.success("Task passed QA.");
    },
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}

/** QA reported bugs: bug subtasks are created and the task goes back to the developer. */
/** QA logs issues while testing (the task stays in QA), then attaches each issue's files. */
export function useQaReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bugs }: { id: ID; bugs: (QaIssueInput & { files?: File[] })[] }) => {
      const { task, bugIds } = await tasksService.qaReport(
        id,
        bugs.map((b) => ({ kind: b.kind, title: b.title, priority: b.priority, steps: b.steps, expected: b.expected, actual: b.actual, environment: b.environment, dueDate: b.dueDate })),
      );
      // Screenshots go onto each new issue. The issues exist already, so a failed upload is reported, not fatal.
      const uploads = bugs.flatMap((b, i) => (bugIds[i] ? (b.files ?? []).map((f) => tasksService.uploadAttachment(bugIds[i]!, f)) : []));
      const results = await Promise.allSettled(uploads);
      return { task, failedUploads: results.filter((r) => r.status === "rejected").length };
    },
    meta: { silentError: true },
    onSuccess: ({ task, failedUploads }, { bugs }) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      const n = `${bugs.length} issue${bugs.length === 1 ? "" : "s"}`;
      // On finished work there's no testing round to complete: the issues went to the developer already.
      toast.success(task.status === "IN_QA" ? `${n} logged. Keep testing, then choose QA complete.` : `${n} sent to the developer.`);
      if (failedUploads) toast.error(`${failedUploads} attachment${failedUploads === 1 ? "" : "s"} couldn't be uploaded. Open the issue to try again.`);
    },
    onSettled: (_d, _e, { id }) => {
      invalidateTaskViews(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.reviews(id) });
    },
  });
}
