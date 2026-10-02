import type { Metadata } from "next";
import { ProjectBoard } from "@/components/projects/project-board";

export const metadata: Metadata = { title: "Board" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectBoard projectId={id} />;
}
