import type { Metadata } from "next";
import { ProjectMilestones } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Milestones" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectMilestones projectId={id} />;
}
