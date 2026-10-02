import type { Metadata } from "next";
import { ProjectTasksTab } from "@/components/projects/project-tasks-tab";

export const metadata: Metadata = { title: "Project tasks" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectTasksTab projectId={id} />;
}
