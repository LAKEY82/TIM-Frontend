import { api } from "@/lib/api";
import { arr, optStr, pick, rec, str, toPaginated, toUserSummary } from "@/lib/services/normalize";
import { MEETING_PLATFORMS, type ID, type Meeting, type MeetingPlatform, type Paginated, type UserSummary } from "@/types/domain";

export interface MeetingFilters {
  /** Upcoming (not ended yet) or past meetings. */
  scope?: "upcoming" | "past" | "all";
  search?: string;
  /** Meetings overlapping this window (ISO timestamps). */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface MeetingInput {
  title: string;
  description?: string | null;
  platform: MeetingPlatform;
  link?: string | null;
  /** ISO timestamps. */
  startAt: string;
  endAt: string;
  projectId?: ID | null;
  /** Only when creating; afterwards use addParticipants / removeParticipant. */
  participantIds?: ID[];
}

const toPlatform = (v: unknown): MeetingPlatform => ((MEETING_PLATFORMS as readonly unknown[]).includes(v) ? (v as MeetingPlatform) : "OTHER");

export function toMeeting(value: unknown): Meeting {
  const obj = rec(value);
  const project = rec(obj.project);
  return {
    id: str(pick(obj, "id", "_id")),
    title: str(obj.title),
    description: optStr(obj.description),
    platform: toPlatform(obj.platform),
    link: optStr(obj.link),
    startAt: str(obj.startAt),
    endAt: str(obj.endAt),
    project: project.id ? { id: str(project.id), name: str(project.name) } : null,
    organizer: toUserSummary(obj.organizer),
    participants: arr(obj.participants)
      .map(toUserSummary)
      .filter((u): u is UserSummary => Boolean(u)),
  };
}

export const meetingsService = {
  async list(filters: MeetingFilters = {}): Promise<Paginated<Meeting>> {
    const { data, meta } = await api.getWithMeta("/api/meetings", { params: { ...filters } });
    return toPaginated(data, meta, toMeeting);
  },
  get: async (id: ID): Promise<Meeting> => toMeeting(await api.get(`/api/meetings/${id}`)),
  create: async (input: MeetingInput): Promise<Meeting> => toMeeting(await api.post("/api/meetings", input)),
  update: async (id: ID, input: Partial<Omit<MeetingInput, "participantIds">>): Promise<Meeting> => toMeeting(await api.patch(`/api/meetings/${id}`, input)),
  remove: (id: ID) => api.delete(`/api/meetings/${id}`),
  addParticipants: async (id: ID, userIds: ID[]): Promise<Meeting> => toMeeting(await api.post(`/api/meetings/${id}/participants`, { userIds })),
  removeParticipant: async (id: ID, userId: ID): Promise<Meeting> => toMeeting(await api.delete(`/api/meetings/${id}/participants/${userId}`)),
};
