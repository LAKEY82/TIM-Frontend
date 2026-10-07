"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePermission } from "@/hooks/use-permission";
import type { TaskFilters } from "@/lib/services/tasks";
import { TASK_STATUSES, type TaskStatus } from "@/types/domain";
import { TaskCreateButton } from "./task-create-modal";
import { TaskListPanel } from "./task-list-panel";

type Scope = "mine" | "review" | "qa" | "all";

const COPY: Record<Scope, { title: string; description: string; empty: string }> = {
  mine: { title: "My tasks", description: "Tasks assigned to you.", empty: "No tasks assigned to you." },
  review: { title: "To review", description: "Work developers sent for your review. Approve it, send it to QA, or request changes.", empty: "Nothing is waiting for your review." },
  qa: { title: "QA queue", description: "Tasks you test as a project's QA. Pass them or report bugs.", empty: "Nothing is waiting for your QA." },
  all: { title: "All tasks", description: "Every task you have access to.", empty: "No tasks yet." },
};

/**
 * /tasks: "My tasks" by default, the QA queue (`?scope=qa`), or for managers
 * every task they can see (`?scope=all`). The API scopes results by permission.
 */
export function MyTasksView() {
  const params = useSearchParams();
  const router = useRouter();
  const canSeeAll = usePermission(["tasks:read_all", "tasks:assign"], "any");
  const canReview = usePermission("tasks:review");
  const requested = params.get("scope");
  const scope: Scope = requested === "qa" ? "qa" : canReview && requested === "review" ? "review" : canSeeAll && requested === "all" ? "all" : "mine";
  const statusParam = params.get("status");
  const statusFromUrl = statusParam && (TASK_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as TaskStatus) : null;
  // The QA queue opens on tasks currently in QA; the filter can widen it.
  const initialStatus = statusFromUrl ?? (scope === "qa" ? "IN_QA" : null);
  const initialOverdue = params.get("overdue") === "true";
  // "Mine" also holds what's waiting on you: QA testing (anyone can be a project's QA) and, for reviewers, reviews.
  const baseFilters: TaskFilters =
    scope === "mine"
      ? { assigneeId: "me", includeQa: true, ...(canReview ? { includeReviews: true } : {}) }
      : scope === "review"
        ? { awaitingReview: true }
        : scope === "qa"
          ? { qaId: "me" }
          : {};
  const copy =
    scope === "mine"
      ? canReview
        ? { ...COPY.mine, description: "Tasks assigned to you, plus work waiting for your review or QA testing.", empty: "Nothing assigned to you or waiting for you." }
        : { ...COPY.mine, description: "Tasks assigned to you, plus tasks waiting for your QA testing.", empty: "Nothing assigned to you or waiting for your QA." }
      : COPY[scope];

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={scope}
              onValueChange={(v) => v && router.replace(v === "mine" ? "/tasks" : `/tasks?scope=${v}`)}
              aria-label="Which tasks"
            >
              <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
              {canReview ? <ToggleGroupItem value="review">To review</ToggleGroupItem> : null}
              <ToggleGroupItem value="qa">QA queue</ToggleGroupItem>
              {canSeeAll ? <ToggleGroupItem value="all">All</ToggleGroupItem> : null}
            </ToggleGroup>
            <TaskCreateButton openAfterCreate />
          </>
        }
      />
      <TaskListPanel
        // Remount when scope or deep-link filters change so initial state applies.
        key={`${scope}-${initialStatus ?? ""}-${initialOverdue}`}
        baseFilters={baseFilters}
        // "Mine" includes other people's work waiting on you, so it can be filtered by developer.
        showAssigneeFilter
        initialStatus={initialStatus}
        initialOverdue={initialOverdue}
        showProject
        deadline={scope === "qa" ? "qaDueDate" : "dueDate"}
        emptyTitle={copy.empty}
      />
    </div>
  );
}
