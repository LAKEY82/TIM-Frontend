import { api } from "@/lib/api";
import { arr, rec, toDepartment, toList, toUser } from "@/lib/services/normalize";
import type { Department, DepartmentDetail, ID } from "@/types/domain";

export interface DepartmentInput {
  name: string;
  description?: string | null;
  headId?: ID | null;
}

export const departmentsService = {
  list: async (): Promise<Department[]> => toList(await api.get("/api/departments"), toDepartment),

  async get(id: ID): Promise<DepartmentDetail> {
    const data = rec(await api.get(`/api/departments/${id}`));
    const members = arr(data.members ?? data.users).map((m) => toUser(rec(m).user ?? m));
    return { ...toDepartment(data), members, memberCount: members.length || toDepartment(data).memberCount };
  },

  create: async (input: DepartmentInput) => toDepartment(await api.post("/api/departments", input)),
  update: async (id: ID, input: Partial<DepartmentInput>) => toDepartment(await api.patch(`/api/departments/${id}`, input)),
  remove: (id: ID) => api.delete(`/api/departments/${id}`),
};
