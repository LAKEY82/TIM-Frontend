"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { tasksService } from "@/lib/services/tasks";
import type { Comment, ID, UserSummary } from "@/types/domain";

export function useComments(taskId: ID) {
  return useQuery({ queryKey: queryKeys.comments.forTask(taskId), queryFn: () => tasksService.comments(taskId) });
}

export function useAddComment(taskId: ID, author: UserSummary) {
  const queryClient = useQueryClient();
  const key = queryKeys.comments.forTask(taskId);
  return useMutation({
    mutationFn: ({ body, mentionIds }: { body: string; mentionIds: ID[] }) => tasksService.addComment(taskId, body, mentionIds),
    // Optimistic: show the comment immediately, marked as pending.
    onMutate: async ({ body }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Comment[]>(key);
      const optimistic: Comment = {
        id: `optimistic-${Date.now()}`,
        taskId,
        body,
        author,
        mentions: [],
        createdAt: new Date().toISOString(),
        edited: false,
      };
      queryClient.setQueryData<Comment[]>(key, [...(previous ?? []), optimistic]);
      return { previous };
    },
    onError: (_e, _v, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useEditComment(taskId: ID) {
  const queryClient = useQueryClient();
  const key = queryKeys.comments.forTask(taskId);
  return useMutation({
    mutationFn: ({ id, body, mentionIds }: { id: ID; body: string; mentionIds: ID[] }) =>
      tasksService.editComment(taskId, id, body, mentionIds),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Comment[]>(key);
      queryClient.setQueryData<Comment[]>(key, (list) => list?.map((c) => (c.id === id ? { ...c, body, edited: true } : c)));
      return { previous };
    },
    onError: (_e, _v, context) => queryClient.setQueryData(key, context?.previous),
    onSuccess: () => toast.success("Comment updated."),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteComment(taskId: ID) {
  const queryClient = useQueryClient();
  const key = queryKeys.comments.forTask(taskId);
  return useMutation({
    mutationFn: (id: ID) => tasksService.deleteComment(taskId, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Comment[]>(key);
      queryClient.setQueryData<Comment[]>(key, (list) => list?.filter((c) => c.id !== id));
      return { previous };
    },
    onError: (_e, _v, context) => queryClient.setQueryData(key, context?.previous),
    onSuccess: () => toast.success("Comment deleted."),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}
