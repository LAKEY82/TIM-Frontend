import type { Metadata } from "next";
import { ProjectActivity } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Activity" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectActivity projectId={id} />;
}
