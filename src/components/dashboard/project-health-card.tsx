import { AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ProjectProgress } from "@/components/projects/project-progress";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { EmptyState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { formatShortDate } from "@/lib/format";
import type { AttentionProject } from "@/types/domain";

/** One project that needs management attention, with the API-provided reasons. */
export function ProjectHealthCard({ item }: { item: AttentionProject }) {
  const { project, reasons } = item;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block space-y-2.5 rounded-lg border p-3 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[project.client?.name, project.manager?.name ? `PM: ${project.manager.name}` : null, project.deadline ? `Due ${formatShortDate(project.deadline)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <ProjectProgress value={project.progress} />
      {reasons.length > 0 ? (
        <ul className="space-y-1">
          {reasons.map((r) => (
            <li key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 shrink-0 text-[color:var(--status-serious)]" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}

export function ProjectsRequiringAttention({ items, isLoading }: { items: AttentionProject[] | undefined; isLoading?: boolean }) {
  if (isLoading) return <ListSkeleton rows={3} />;
  if (!items || items.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No projects need attention." description="Nothing is at risk or overdue right now." compact />;
  }
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <ProjectHealthCard key={item.project.id} item={item} />
      ))}
    </div>
  );
}
