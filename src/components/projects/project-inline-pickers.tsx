"use client";

/**
 * Inline project controls for the header and Overview: assign or change the
 * QA, and move the project between statuses (including QA testing).
 */
import { Check, ChevronDown, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/tasks/inline-pickers";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUpdateProject } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage } from "@/lib/api";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PROJECT_STATUSES, type Project } from "@/types/domain";
import { ProjectStatusBadge } from "./project-status-badge";

const onError = (error: unknown) => toast.error(getErrorMessage(error, "Couldn't update the project."));

/** Shows the project's QA; managers can click to assign or change them. */
export function ProjectQaPicker({ project, className }: { project: Project; className?: string }) {
  const canEdit = usePermission("projects:update");
  const update = useUpdateProject(project.id);

  if (!canEdit) {
    return project.qa ? (
      <span className={className}>{project.qa.name}</span>
    ) : (
      <span className={cn("text-amber-700 dark:text-amber-400", className)}>Not assigned</span>
    );
  }
  return (
    <AssigneeSelect
      value={project.qa}
      projectId={project.id}
      showName
      clearable={false}
      noun="QA"
      emptyLabel="Assign QA"
      className={cn(!project.qa && "text-amber-700 dark:text-amber-400 [&_span]:text-inherit", className)}
      onChange={(user) => user && update.mutate({ qaId: user.id }, { onError })}
    />
  );
}

/** Status badge; managers can click it to move the project along. */
export function ProjectStatusPicker({ project }: { project: Project }) {
  const canEdit = usePermission("projects:update");
  const update = useUpdateProject(project.id);
  if (!canEdit) return <ProjectStatusBadge status={project.status} />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-md outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Status: ${PROJECT_STATUS_META[project.status].label}. Change status`}
        >
          <ProjectStatusBadge status={project.status} />
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Project status</DropdownMenuLabel>
        {PROJECT_STATUSES.map((s) => {
          const needsQa = s === "QA_TESTING" && !project.qa;
          return (
            <DropdownMenuItem
              key={s}
              onSelect={() => s !== project.status && update.mutate({ status: s }, { onError })}
            >
              <span className={cn("size-2 rounded-full", PROJECT_STATUS_META[s].dot)} aria-hidden />
              <span className="flex flex-col">
                {PROJECT_STATUS_META[s].label}
                {s === "QA_TESTING" ? (
                  <span className="text-xs text-muted-foreground">{needsQa ? "Tasks wait until a QA is assigned" : "Sends approved tasks to the QA"}</span>
                ) : null}
              </span>
              {s === project.status ? <Check className="ml-auto size-4" aria-hidden /> : s === "QA_TESTING" ? <FlaskConical className="ml-auto size-4 text-cyan-600" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
