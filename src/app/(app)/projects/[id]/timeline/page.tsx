import type { Metadata } from "next";
import { ProjectTimeline } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Project timeline" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectTimeline projectId={id} />;
}
