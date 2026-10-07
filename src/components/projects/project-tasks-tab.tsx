"use client";

import type { ID } from "@/types/domain";
import { ProjectTaskList } from "./project-task-list";

export function ProjectTasksTab({ projectId }: { projectId: ID }) {
  return <ProjectTaskList projectId={projectId} />;
}
