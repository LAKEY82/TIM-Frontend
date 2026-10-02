import type { Metadata } from "next";
import { ProjectFiles } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Files" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectFiles projectId={id} />;
}
