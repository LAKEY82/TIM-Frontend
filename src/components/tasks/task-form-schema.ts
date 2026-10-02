import { z } from "zod";
import { emptyToNull } from "@/lib/forms";
import type { TaskInput } from "@/lib/services/tasks";
import { PRIORITIES, TASK_TYPES } from "@/types/domain";

const optionalId = z.string().nullable();
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .or(z.literal(""));

export const hoursString = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 1000), "Enter hours between 0 and 1000.");

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200, "Keep the title under 200 characters."),
    description: z.string().max(10000, "Description is too long."),
    projectId: z.string({ required_error: "Select a project." }).min(1, "Select a project."),
    milestoneId: optionalId,
    assigneeId: optionalId,
    reviewerId: optionalId,
    departmentId: optionalId,
    priority: z.enum(PRIORITIES),
    type: z.enum(TASK_TYPES),
    startDate: optionalDate,
    dueDate: optionalDate,
    estimatedHours: hoursString,
    tags: z.string().max(300),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    path: ["dueDate"],
    message: "Due date can't be before the start date.",
  })
  .refine((v) => !v.assigneeId || !v.reviewerId || v.assigneeId !== v.reviewerId, {
    path: ["reviewerId"],
    message: "The reviewer should be someone other than the assignee.",
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_FIELDS = [
  "title",
  "description",
  "projectId",
  "milestoneId",
  "assigneeId",
  "reviewerId",
  "departmentId",
  "priority",
  "type",
  "startDate",
  "dueDate",
  "estimatedHours",
  "tags",
] as const satisfies readonly (keyof TaskFormValues)[];

export function emptyTaskForm(defaults: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    title: "",
    description: "",
    projectId: "",
    milestoneId: null,
    assigneeId: null,
    reviewerId: null,
    departmentId: null,
    priority: "MEDIUM",
    type: "FEATURE",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    tags: "",
    ...defaults,
  };
}

export function toTaskInput(values: TaskFormValues): TaskInput {
  return {
    title: values.title.trim(),
    description: emptyToNull(values.description.trim()),
    projectId: values.projectId,
    milestoneId: values.milestoneId,
    assigneeId: values.assigneeId,
    reviewerId: values.reviewerId,
    departmentId: values.departmentId,
    priority: values.priority,
    type: values.type,
    startDate: emptyToNull(values.startDate),
    dueDate: emptyToNull(values.dueDate),
    estimatedHours: values.estimatedHours === "" ? null : Number(values.estimatedHours),
    tags: values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}
