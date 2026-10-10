"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { meetingsService, type MeetingFilters, type MeetingInput } from "@/lib/services/meetings";
import type { ID, Meeting } from "@/types/domain";

export function useMeetings(filters: MeetingFilters = {}) {
  return useQuery({
    queryKey: queryKeys.meetings.list(filters),
    queryFn: () => meetingsService.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useMeeting(id: ID) {
  return useQuery({ queryKey: queryKeys.meetings.detail(id), queryFn: () => meetingsService.get(id), enabled: Boolean(id) });
}

/** Keeps the detail cache fresh and refetches lists after any change. */
function useMeetingMutation<V>(mutationFn: (vars: V) => Promise<Meeting>, success: string | ((m: Meeting, vars: V) => string)) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    meta: { silentError: true },
    onSuccess: (meeting, vars) => {
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting);
      toast.success(typeof success === "string" ? success : success(meeting, vars));
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
  });
}

export function useSaveMeeting() {
  return useMeetingMutation(
    ({ id, input }: { id?: ID; input: MeetingInput }) => {
      if (!id) return meetingsService.create(input);
      // Participants are managed separately once the meeting exists.
      return meetingsService.update(id, { ...input, participantIds: undefined } as Omit<MeetingInput, "participantIds">);
    },
    (_m, { id }) => (id ? "Meeting updated." : "Meeting created."),
  );
}

export function useAddParticipants() {
  return useMeetingMutation(({ id, userIds }: { id: ID; userIds: ID[] }) => meetingsService.addParticipants(id, userIds), (_m, { userIds }) =>
    userIds.length === 1 ? "Participant added." : `${userIds.length} participants added.`,
  );
}

export function useRemoveParticipant() {
  return useMeetingMutation(({ id, userId }: { id: ID; userId: ID }) => meetingsService.removeParticipant(id, userId), "Participant removed.");
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => meetingsService.remove(id),
    onSuccess: (_d, id) => {
      toast.success("Meeting deleted.");
      queryClient.removeQueries({ queryKey: queryKeys.meetings.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
    },
  });
}
