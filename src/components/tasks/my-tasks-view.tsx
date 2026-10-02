"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePermission } from "@/hooks/use-permission";
import { TASK_STATUSES, type TaskStatus } from "@/types/domain";
import { TaskCreateButton } from "./task-create-modal";
import { TaskListPanel } from "./task-list-panel";

/**
 * /tasks — "My Tasks" by default. Managers can switch to all tasks they're
 * allowed to see (`?scope=all`); the API still scopes results by permission.
 */
export function MyTasksView() {
  const params = useSearchParams();
  const router = useRouter();
  const canSeeAll = usePermission(["tasks:read_all", "tasks:assign"], "any");
  const scope = canSeeAll && params.get("scope") === "all" ? "all" : "mine";
  const statusParam = params.get("status");
  const initialStatus = statusParam && (TASK_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as TaskStatus) : null;
  const initialOverdue = params.get("overdue") === "true";

  return (
    <div className="space-y-5">
      <PageHeader
        title={scope === "all" ? "All tasks" : "My tasks"}
        description={scope === "all" ? "Every task you have access to." : "Tasks assigned to you."}
        actions={
          <>
            {canSeeAll ? (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={scope}
                onValueChange={(v) => v && router.replace(v === "all" ? "/tasks?scope=all" : "/tasks")}
                aria-label="Task scope"
              >
                <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
                <ToggleGroupItem value="all">All</ToggleGroupItem>
              </ToggleGroup>
            ) : null}
            <TaskCreateButton openAfterCreate />
          </>
        }
      />
      <TaskListPanel
        // Remount when scope or deep-link filters change so initial state applies.
        key={`${scope}-${initialStatus ?? ""}-${initialOverdue}`}
        baseFilters={scope === "mine" ? { assigneeId: "me" } : {}}
        showAssigneeFilter={scope === "all"}
        initialStatus={initialStatus}
        initialOverdue={initialOverdue}
        showProject
        emptyTitle={scope === "mine" ? "No tasks assigned to you." : "No tasks yet."}
      />
    </div>
  );
}
