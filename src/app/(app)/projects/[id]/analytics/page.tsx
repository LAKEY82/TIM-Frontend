import type { Metadata } from "next";
import { ProjectAnalytics } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Project analytics" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectAnalytics projectId={id} />;
}
