"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { TASK_STATUS_META } from "@/lib/constants";
import { TASK_STATUSES, type ID, type TaskStatus } from "@/types/domain";
import { TaskStatusBadge } from "./task-status-badge";

/**
 * Direct status control for managers. The API decides whether the
 * transition is allowed; on rejection the optimistic change is rolled back.
 */
export function TaskStatusSelect({ taskId, status, disabled }: { taskId: ID; status: TaskStatus; disabled?: boolean }) {
  const mutation = useUpdateTaskStatus();
  return (
    <Select
      value={status}
      disabled={disabled || mutation.isPending}
      onValueChange={(value) => {
        if (value !== status) mutation.mutate({ id: taskId, status: value as TaskStatus });
      }}
    >
      <SelectTrigger size="sm" className="h-7 w-auto border-none px-1 shadow-none" aria-label={`Status: ${TASK_STATUS_META[status].label}. Change status`}>
        <SelectValue>
          <TaskStatusBadge status={status} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <TaskStatusBadge status={s} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
