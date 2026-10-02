"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskAssignee } from "@/components/tasks/task-assignee";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { ProjectFilters } from "@/lib/services/projects";
import { cn } from "@/lib/utils";
import type { Project, SortDirection } from "@/types/domain";
import { ProjectProgress } from "./project-progress";
import { ProjectStatusBadge } from "./project-status-badge";

type SortKey = NonNullable<ProjectFilters["sortBy"]>;

interface ProjectTableProps {
  projects: Project[];
  sortBy?: SortKey;
  sortOrder?: SortDirection;
  onSortChange?: (sortBy: SortKey, sortOrder: SortDirection) => void;
}

export function ProjectTable({ projects, sortBy, sortOrder, onSortChange }: ProjectTableProps) {
  const router = useRouter();

  const header = (label: string, key: SortKey, className?: string) => {
    const active = sortBy === key;
    const Icon = active ? (sortOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <TableHead className={className} aria-sort={active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSortChange?.(key, active && sortOrder === "asc" ? "desc" : "asc")}
        >
          {label}
          <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border">
      <Table className="min-w-[820px]">
        <TableHeader className="bg-muted/40">
          <TableRow>
            {header("Project", "name", "w-[28%]")}
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            {header("Progress", "progress", "w-40")}
            <TableHead>PM</TableHead>
            {header("Deadline", "deadline")}
            <TableHead className="text-right">Tasks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
              <TableCell className="max-w-0">
                <Link href={`/projects/${p.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.client?.name ?? (p.type === "INTERNAL" ? "Internal" : "—")}</TableCell>
              <TableCell>
                <ProjectStatusBadge status={p.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ProjectProgress value={p.progress} showLabel={false} className="flex-1" />
                  <span className="w-9 text-right text-xs tabular-nums">{p.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                <TaskAssignee user={p.manager} emptyLabel="—" />
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(p.deadline)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {p.completedTaskCount}/{p.taskCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
