import type { Metadata } from "next";
import { ProjectCalendar } from "@/components/projects/project-sections";

export const metadata: Metadata = { title: "Project calendar" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectCalendar projectId={id} />;
}
