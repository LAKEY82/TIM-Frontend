"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { milestonesService, type MilestoneInput } from "@/lib/services/misc";
import { projectsService, type ProjectFilters, type ProjectInput, type ProjectLinkInput, type WorkflowPeople } from "@/lib/services/projects";
import type { ID } from "@/types/domain";

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectsService.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: ID) {
  return useQuery({ queryKey: queryKeys.projects.detail(id), queryFn: () => projectsService.get(id), enabled: Boolean(id) });
}

export function useProjectMembers(id: ID | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.members(id ?? ""),
    queryFn: () => projectsService.members(id ?? ""),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useProjectFiles(id: ID) {
  return useQuery({ queryKey: queryKeys.projects.files(id), queryFn: () => projectsService.files(id) });
}

export function useProjectLinks(id: ID) {
  return useQuery({ queryKey: queryKeys.projects.links(id), queryFn: () => projectsService.links(id) });
}

export function useAddProjectLink(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectLinkInput) => projectsService.addLink(projectId, input),
    meta: { silentError: true },
    onSuccess: () => {
      toast.success("Link added.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.links(projectId) });
    },
  });
}

export function useRemoveProjectLink(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: ID) => projectsService.removeLink(projectId, linkId),
    onSuccess: () => {
      toast.success("Link removed.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.links(projectId) });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsService.create(input),
    meta: { silentError: true },
    onSuccess: () => {
      toast.success("Project created.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

export function useUpdateProject(id: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) => projectsService.update(id, input),
    meta: { silentError: true },
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), project);
      toast.success("Project updated.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      // A new QA or "QA testing" status moves tasks into QA on the server.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

export function useProjectWorkflow(projectId: ID) {
  return useQuery({ queryKey: queryKeys.tasks.workflow(projectId), queryFn: () => projectsService.workflow(projectId), enabled: Boolean(projectId) });
}

export function useSetupWorkflow(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowPeople & { qaId?: ID }) => projectsService.setupWorkflow(projectId, input),
    meta: { silentError: true },
    onSuccess: (stages) => {
      queryClient.setQueryData(queryKeys.tasks.workflow(projectId), stages);
      toast.success("Workflow created. The first stage is open.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

/** Permanently deletes a project and everything in it. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => projectsService.remove(id),
    meta: { silentError: true },
    onSuccess: (_d, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(id) });
      toast.success("Project deleted.");
      for (const key of [queryKeys.projects.all, queryKeys.tasks.all, queryKeys.analytics.all, queryKeys.activity.all, queryKeys.notifications.all]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useAddProjectMember(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: ID) => projectsService.addMember(projectId, userId),
    onSuccess: () => {
      toast.success("Member added.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useRemoveProjectMember(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: ID) => projectsService.removeMember(projectId, userId),
    onSuccess: () => {
      toast.success("Member removed.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUploadProjectFile(projectId: ID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => projectsService.uploadFile(projectId, file),
    onSuccess: () => {
      toast.success("File uploaded.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.files(projectId) });
    },
  });
}

export function useMilestones(params: { projectId?: ID; from?: string; to?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.milestones.list(params),
    queryFn: () => milestonesService.list(params),
    enabled,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MilestoneInput) => milestonesService.create(input),
    meta: { silentError: true },
    onSuccess: () => {
      toast.success("Milestone created.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: ID; input: Partial<MilestoneInput> }) => milestonesService.update(id, input),
    onSuccess: () => {
      toast.success("Milestone updated.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}
