import { api, type QueryParams } from "@/lib/api";
import { toAttachment, toList, toPaginated, toProject, toTaskSummary, toUserSummary } from "@/lib/services/normalize";
import type {
  Attachment,
  ID,
  Paginated,
  Priority,
  Project,
  ProjectStatus,
  ProjectType,
  SortDirection,
  TaskSummary,
  UserSummary,
} from "@/types/domain";

export interface ProjectFilters extends QueryParams {
  search?: string;
  status?: ProjectStatus;
  clientId?: ID;
  managerId?: ID;
  memberId?: ID;
  departmentId?: ID;
  sortBy?: "name" | "deadline" | "progress" | "createdAt";
  sortOrder?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  clientId?: ID | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  startDate?: string | null;
  deadline?: string | null;
  managerId?: ID | null;
  qaId?: ID | null;
  memberIds: ID[];
  estimatedHours?: number | null;
  /** Create only: break the project into workflow stages. */
  workflow?: WorkflowPeople;
}

/** Who does each workflow stage. Design/Frontend/Backend stages exist only when someone is named. */
export interface WorkflowPeople {
  designerId?: ID | null;
  frontendId?: ID | null;
  backendId?: ID | null;
  /** Defaults to the frontend developer, then the backend developer. */
  bugFixerId?: ID | null;
}

export const projectsService = {
  async list(filters: ProjectFilters = {}): Promise<Paginated<Project>> {
    const { data, meta } = await api.getWithMeta("/api/projects", { params: filters });
    return toPaginated(data, meta, toProject);
  },
  get: async (id: ID) => toProject(await api.get(`/api/projects/${id}`)),
  create: async (input: ProjectInput) => toProject(await api.post("/api/projects", input)),
  update: async (id: ID, input: Partial<ProjectInput>) => toProject(await api.patch(`/api/projects/${id}`, input)),
  remove: (id: ID) => api.delete(`/api/projects/${id}`),

  members: async (id: ID): Promise<UserSummary[]> =>
    toList(await api.get(`/api/projects/${id}/members`), (m) => {
      const obj = m && typeof m === "object" && "user" in m ? (m as { user: unknown }).user : m;
      return toUserSummary(obj) ?? { id: "", name: "Unknown" };
    }),
  addMember: (id: ID, userId: ID) => api.post(`/api/projects/${id}/members`, { userId }),
  removeMember: (id: ID, userId: ID) => api.delete(`/api/projects/${id}/members/${userId}`),

  /** The project's workflow stage tasks, in order. */
  workflow: async (id: ID): Promise<TaskSummary[]> => toList(await api.get(`/api/projects/${id}/workflow`), toTaskSummary),
  setupWorkflow: async (id: ID, input: WorkflowPeople & { qaId?: ID }): Promise<TaskSummary[]> =>
    toList(await api.post(`/api/projects/${id}/workflow`, input), toTaskSummary),

  files: async (id: ID): Promise<Attachment[]> => toList(await api.get(`/api/projects/${id}/files`), toAttachment),
  uploadFile: async (id: ID, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return toAttachment(await api.post(`/api/projects/${id}/files`, form));
  },
};
