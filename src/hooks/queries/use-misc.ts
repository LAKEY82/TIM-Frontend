"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { analyticsService, type AnalyticsRange } from "@/lib/services/analytics";
import {
  activityService,
  clientsService,
  dailyTasksService,
  notificationsService,
  searchService,
  settingsService,
  type ActivityFilters,
  type ClientInput,
  type DailyTaskInput,
} from "@/lib/services/misc";
import type { AppNotification, CompanySettings, ID, NotificationPreferences, Paginated } from "@/types/domain";

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function useCompanyAnalytics(range: AnalyticsRange = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.company(range),
    queryFn: () => analyticsService.company(range),
    staleTime: 60_000,
    enabled,
  });
}

export function useProjectAnalytics(projectId: ID) {
  return useQuery({ queryKey: queryKeys.analytics.project(projectId), queryFn: () => analyticsService.project(projectId) });
}

export function useDepartmentAnalytics(departmentId: ID | undefined, range: AnalyticsRange = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.department(departmentId ?? "", range),
    queryFn: () => analyticsService.department(departmentId ?? "", range),
    enabled: Boolean(departmentId),
  });
}

export function useTaskAnalytics(range: AnalyticsRange = {}) {
  return useQuery({ queryKey: queryKeys.analytics.tasks(range), queryFn: () => analyticsService.tasks(range) });
}

export function useWorkload(params: { departmentId?: ID; projectId?: ID; managerId?: ID } = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.workload(params),
    queryFn: () => analyticsService.workload(params),
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function useActivity(filters: ActivityFilters, enabled = true) {
  return useQuery({ queryKey: queryKeys.activity.list(filters), queryFn: () => activityService.list(filters), enabled });
}

// ---------------------------------------------------------------------------
// Daily tasks
// ---------------------------------------------------------------------------

export function useDailyTasks(params: { date: string; assigneeId?: ID }) {
  return useQuery({ queryKey: queryKeys.dailyTasks.list(params), queryFn: () => dailyTasksService.list(params) });
}

export function useDailyWorkload(date: string) {
  return useQuery({ queryKey: queryKeys.dailyTasks.workload(date), queryFn: () => dailyTasksService.workload(date) });
}

export function useAssignDailyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DailyTaskInput) => dailyTasksService.create(input),
    meta: { silentError: true },
    onSuccess: (daily) => {
      toast.success(`Task assigned to ${daily.assignee.name}.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dailyTasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useRemoveDailyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => dailyTasksService.remove(id),
    onSuccess: () => {
      toast.success("Removed from the daily plan.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.dailyTasks.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications(params: { page?: number; unreadOnly?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsService.list({ ...params, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: notificationsService.unreadCount,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => notificationsService.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const lists = queryClient.getQueriesData<Paginated<AppNotification>>({ queryKey: ["notifications", "list"] });
      const count = queryClient.getQueryData<number>(queryKeys.notifications.unreadCount);
      let changed = false;
      for (const [key, data] of lists) {
        if (!data) continue;
        queryClient.setQueryData<Paginated<AppNotification>>(key, {
          ...data,
          items: data.items.map((n) => {
            if (n.id === id && !n.read) changed = true;
            return n.id === id ? { ...n, read: true } : n;
          }),
        });
      }
      if (changed && typeof count === "number") {
        queryClient.setQueryData(queryKeys.notifications.unreadCount, Math.max(0, count - 1));
      }
      return { lists, count };
    },
    onError: (_e, _v, context) => {
      context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(queryKeys.notifications.unreadCount, context?.count);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
      const lists = queryClient.getQueriesData<Paginated<AppNotification>>({ queryKey: ["notifications", "list"] });
      const count = queryClient.getQueryData<number>(queryKeys.notifications.unreadCount);
      for (const [key, data] of lists) {
        if (data) queryClient.setQueryData(key, { ...data, items: data.items.map((n) => ({ ...n, read: true })) });
      }
      queryClient.setQueryData(queryKeys.notifications.unreadCount, 0);
      return { lists, count };
    },
    onError: (_e, _v, context) => {
      context?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(queryKeys.notifications.unreadCount, context?.count);
    },
    onSuccess: () => toast.success("All notifications marked as read."),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function useClients(params: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => clientsService.list({ ...params, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useClient(id: ID) {
  return useQuery({ queryKey: queryKeys.clients.detail(id), queryFn: () => clientsService.get(id) });
}

export function useSaveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: ID; input: ClientInput }) =>
      id ? clientsService.update(id, input) : clientsService.create(input),
    meta: { silentError: true },
    onSuccess: (_c, { id }) => {
      toast.success(id ? "Client updated." : "Client created.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function useSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: ({ signal }) => searchService.search(trimmed, signal),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function useCompanySettings(enabled = true) {
  return useQuery({ queryKey: queryKeys.settings.company, queryFn: settingsService.company, enabled });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanySettings) => settingsService.updateCompany(input),
    meta: { silentError: true },
    onSuccess: () => {
      toast.success("Company settings saved.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.company });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: queryKeys.settings.notifications, queryFn: settingsService.notificationPreferences });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferences) => settingsService.updateNotificationPreferences(input),
    onSuccess: () => {
      toast.success("Notification preferences saved.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.notifications });
    },
  });
}
