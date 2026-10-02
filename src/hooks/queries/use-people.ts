"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { departmentsService, type DepartmentInput } from "@/lib/services/departments";
import { usersService, type UserFilters, type UserInput, type UserUpdate } from "@/lib/services/users";
import type { ID } from "@/types/domain";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => usersService.list(filters),
    placeholderData: keepPreviousData,
  });
}

/** Active users for pickers; cached longer since it changes rarely. */
export function useUserOptions(params: { departmentId?: ID; search?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.options(params),
    queryFn: () => usersService.options(params),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useUser(id: ID) {
  return useQuery({ queryKey: queryKeys.users.detail(id), queryFn: () => usersService.get(id), enabled: Boolean(id) });
}

export function useUserWorkload(id: ID) {
  return useQuery({ queryKey: queryKeys.users.workload(id), queryFn: () => usersService.workload(id), enabled: Boolean(id) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => usersService.create(input),
    meta: { silentError: true },
    onSuccess: (user) => {
      toast.success(`${user.name} was added.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: ID; input: UserUpdate }) => usersService.update(id, input),
    meta: { silentError: true },
    onSuccess: (user) => {
      toast.success(`${user.name} was updated.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: ID; active: boolean }) =>
      active ? usersService.reactivate(id) : usersService.deactivate(id),
    onSuccess: (user) => {
      toast.success(user.status === "ACTIVE" ? `${user.name} reactivated.` : `${user.name} deactivated.`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export function useDepartments() {
  return useQuery({ queryKey: queryKeys.departments.list, queryFn: departmentsService.list, staleTime: 5 * 60_000 });
}

export function useDepartment(id: ID) {
  return useQuery({ queryKey: queryKeys.departments.detail(id), queryFn: () => departmentsService.get(id), enabled: Boolean(id) });
}

export function useSaveDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: ID; input: DepartmentInput }) =>
      id ? departmentsService.update(id, input) : departmentsService.create(input),
    meta: { silentError: true },
    onSuccess: (_d, { id }) => {
      toast.success(id ? "Department updated." : "Department created.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => departmentsService.remove(id),
    onSuccess: () => {
      toast.success("Department deleted.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}
