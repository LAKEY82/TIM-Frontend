import { ProjectHeader, ProjectTabs } from "@/components/projects/project-header";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      <ProjectHeader projectId={id} />
      <ProjectTabs projectId={id} />
      <div>{children}</div>
    </div>
  );
}
