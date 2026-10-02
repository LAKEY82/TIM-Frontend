import { api, type QueryParams } from "@/lib/api";
import { toList, toPaginated, toUser, toWorkload } from "@/lib/services/normalize";
import type { ID, Paginated, Role, User, UserStatus, WorkloadEntry } from "@/types/domain";

export interface UserFilters extends QueryParams {
  search?: string;
  role?: Role;
  departmentId?: ID;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export interface UserInput {
  name: string;
  email: string;
  role: Role;
  departmentId: ID | null;
  jobTitle?: string | null;
  password?: string;
}

export type UserUpdate = Partial<UserInput> & { status?: UserStatus };

export const usersService = {
  async list(filters: UserFilters = {}): Promise<Paginated<User>> {
    const { data, meta } = await api.getWithMeta("/api/users", { params: filters });
    return toPaginated(data, meta, toUser);
  },

  /** Lightweight list for pickers (assignee / reviewer / members). */
  async options(params: { departmentId?: ID; search?: string } = {}): Promise<User[]> {
    const data = await api.get("/api/users", { params: { ...params, status: "ACTIVE", pageSize: 200 } });
    return toList(data, toUser);
  },

  get: async (id: ID) => toUser(await api.get(`/api/users/${id}`)),
  create: async (input: UserInput) => toUser(await api.post("/api/users", input)),
  update: async (id: ID, input: UserUpdate) => toUser(await api.patch(`/api/users/${id}`, input)),
  deactivate: async (id: ID) => toUser(await api.patch(`/api/users/${id}`, { status: "INACTIVE" })),
  reactivate: async (id: ID) => toUser(await api.patch(`/api/users/${id}`, { status: "ACTIVE" })),

  async workload(id: ID): Promise<WorkloadEntry> {
    return toWorkload(await api.get(`/api/users/${id}/workload`));
  },
};
