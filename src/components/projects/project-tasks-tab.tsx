"use client";

import { TaskListPanel } from "@/components/tasks/task-list-panel";
import type { ID } from "@/types/domain";

export function ProjectTasksTab({ projectId }: { projectId: ID }) {
  return <TaskListPanel baseFilters={{ projectId }} emptyTitle="No tasks in this project yet." />;
}
