import type { Metadata } from "next";
import { ProjectLinks } from "@/components/projects/project-links";

export const metadata: Metadata = { title: "Links" };

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectLinks projectId={id} />;
}
