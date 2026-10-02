import { z } from "zod";
import { hoursString } from "@/components/tasks/task-form-schema";
import { emptyToNull } from "@/lib/forms";
import type { ProjectInput } from "@/lib/services/projects";
import { PRIORITIES, PROJECT_STATUSES } from "@/types/domain";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .or(z.literal(""));

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(150, "Keep the name under 150 characters."),
    description: z.string().max(10000),
    clientId: z.string().nullable(),
    type: z.enum(["INTERNAL", "EXTERNAL"]),
    status: z.enum(PROJECT_STATUSES),
    priority: z.enum(PRIORITIES),
    startDate: optionalDate,
    deadline: optionalDate,
    managerId: z.string().nullable(),
    memberIds: z.array(z.string()),
    estimatedHours: hoursString.refine((v) => v === "" || Number(v) <= 100000, "Too many hours."),
  })
  .refine((v) => v.type === "INTERNAL" || Boolean(v.clientId), { path: ["clientId"], message: "External projects need a client." })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, { path: ["deadline"], message: "Deadline can't be before the start date." });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const PROJECT_FORM_FIELDS = [
  "name",
  "description",
  "clientId",
  "type",
  "status",
  "priority",
  "startDate",
  "deadline",
  "managerId",
  "memberIds",
  "estimatedHours",
] as const satisfies readonly (keyof ProjectFormValues)[];

export function emptyProjectForm(defaults: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    name: "",
    description: "",
    clientId: null,
    type: "EXTERNAL",
    status: "PLANNING",
    priority: "MEDIUM",
    startDate: "",
    deadline: "",
    managerId: null,
    memberIds: [],
    estimatedHours: "",
    ...defaults,
  };
}

export function toProjectInput(v: ProjectFormValues): ProjectInput {
  return {
    name: v.name.trim(),
    description: emptyToNull(v.description.trim()),
    clientId: v.type === "INTERNAL" ? null : v.clientId,
    type: v.type,
    status: v.status,
    priority: v.priority,
    startDate: emptyToNull(v.startDate),
    deadline: emptyToNull(v.deadline),
    managerId: v.managerId,
    memberIds: v.memberIds,
    estimatedHours: v.estimatedHours === "" ? null : Number(v.estimatedHours),
  };
}
