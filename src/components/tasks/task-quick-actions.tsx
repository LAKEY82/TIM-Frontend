"use client";

import { Ban, Check, CheckCheck, Loader2, Play, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApproveTask, useSubmitForReview, useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { ACTION_TARGET, availableActions, type TaskAction } from "@/lib/task-workflow";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import type { TaskSummary } from "@/types/domain";
import { RequestChangesDialog } from "./request-changes-dialog";

const ACTION_UI: Record<TaskAction, { label: string; icon: typeof Play; variant: "default" | "outline" | "ghost" | "destructive" }> = {
  start: { label: "Start", icon: Play, variant: "outline" },
  resume: { label: "Resume", icon: Play, variant: "outline" },
  complete: { label: "Complete", icon: Check, variant: "outline" },
  block: { label: "Block", icon: Ban, variant: "ghost" },
  submit: { label: "Submit for review", icon: Send, variant: "default" },
  approve: { label: "Approve", icon: CheckCheck, variant: "default" },
  request_changes: { label: "Request changes", icon: RotateCcw, variant: "outline" },
};

interface TaskQuickActionsProps {
  task: TaskSummary;
  size?: "xs" | "sm" | "default";
  className?: string;
  /** Hide labels on small buttons, keeping accessible names. */
  iconOnly?: boolean;
}

/**
 * Workflow buttons (Start, Complete, Block, Submit, Approve, Request changes).
 * Every action calls the API; nothing is changed locally without it.
 */
export function TaskQuickActions({ task, size = "sm", className, iconOnly }: TaskQuickActionsProps) {
  const { user } = useAuth();
  const updateStatus = useUpdateTaskStatus();
  const submit = useSubmitForReview();
  const approve = useApproveTask();
  const [changesOpen, setChangesOpen] = useState(false);
  const [pending, setPending] = useState<TaskAction | null>(null);

  const actions = availableActions(task, user);
  if (actions.length === 0) return null;

  const run = async (action: TaskAction) => {
    if (action === "request_changes") {
      setChangesOpen(true);
      return;
    }
    setPending(action);
    try {
      if (action === "submit") await submit.mutateAsync({ id: task.id });
      else if (action === "approve") await approve.mutateAsync({ id: task.id });
      else await updateStatus.mutateAsync({ id: task.id, status: ACTION_TARGET[action] });
    } catch {
      // Error toast is raised by the global mutation handler; state was rolled back.
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
      {actions.map((action) => {
        const ui = ACTION_UI[action];
        const Icon = pending === action ? Loader2 : ui.icon;
        return (
          <Button
            key={action}
            type="button"
            size={size}
            variant={ui.variant}
            disabled={pending !== null}
            onClick={() => void run(action)}
            aria-label={iconOnly ? ui.label : undefined}
            title={iconOnly ? ui.label : undefined}
          >
            <Icon className={cn(pending === action && "animate-spin")} aria-hidden />
            {iconOnly ? null : ui.label}
          </Button>
        );
      })}
      {actions.includes("request_changes") ? (
        <RequestChangesDialog taskId={task.id} taskTitle={task.title} open={changesOpen} onOpenChange={setChangesOpen} />
      ) : null}
    </div>
  );
}
