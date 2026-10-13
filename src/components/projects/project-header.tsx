"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { TaskCreateButton } from "@/components/tasks/task-create-modal";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ID } from "@/types/domain";
import { ProjectDialog } from "./project-create-modal";
import { ProjectDeleteDialog } from "./project-delete-dialog";
import { ProjectQaPicker, ProjectStatusPicker } from "./project-inline-pickers";
import { ProjectProgress } from "./project-progress";
import { TaskBreakdownButton } from "./task-breakdown-dialog";

export const PROJECT_TABS = [
  { segment: "", label: "Overview" },
  { segment: "tasks", label: "List" },
  { segment: "board", label: "Board" },
  { segment: "milestones", label: "Milestones" },
  { segment: "calendar", label: "Calendar" },
  { segment: "timeline", label: "Timeline" },
  { segment: "members", label: "Members" },
  { segment: "files", label: "Files" },
  { segment: "links", label: "Links" },
  { segment: "activity", label: "Activity" },
  { segment: "analytics", label: "Analytics" },
] as const;

export function ProjectHeader({ projectId }: { projectId: ID }) {
  const query = useProject(projectId);
  const canEdit = usePermission("projects:update");
  const canDelete = usePermission("projects:delete");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  useBreadcrumbLabel(projectId, query.data?.name);

  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-hidden>
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }
  if (query.isError || !query.data) return <ErrorState error={query.error} title="Unable to load project." onRetry={() => void query.refetch()} />;
  const p = query.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{p.name}</h1>
            <ProjectStatusPicker project={p} />
            <TaskPriorityBadge priority={p.priority} />
          </div>
          <p className="text-sm text-muted-foreground">
            {p.client ? (
              <Link href={`/clients/${p.client.id}`} className="hover:text-foreground hover:underline">
                {p.client.name}
              </Link>
            ) : (
              "Internal project"
            )}
            {p.manager ? (
              <>
                {" · PM "}
                <Link href={`/team/${p.manager.id}`} className="hover:text-foreground hover:underline">
                  {p.manager.name}
                </Link>
              </>
            ) : null}
            {" · QA "}
            <ProjectQaPicker project={p} className="-my-1 align-middle text-sm" />
            {` · ${formatDate(p.startDate)} → ${formatDate(p.deadline)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TaskBreakdownButton projectId={p.id} />
          <TaskCreateButton defaults={{ projectId: p.id }} />
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete
            </Button>
          ) : null}
        </div>
      </div>
      <ProjectProgress value={p.progress} label={`${p.completedTaskCount} of ${p.taskCount} tasks done`} className="max-w-md" />
      {canEdit ? <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={p} /> : null}
      {canDelete ? <ProjectDeleteDialog project={p} open={deleteOpen} onOpenChange={setDeleteOpen} /> : null}
    </div>
  );
}

export function ProjectTabs({ projectId }: { projectId: ID }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  return (
    <nav aria-label="Project sections" className="-mx-4 relative overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {PROJECT_TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment ? pathname.startsWith(href) : pathname === base;
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center rounded-t-md px-3 text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "font-medium text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
