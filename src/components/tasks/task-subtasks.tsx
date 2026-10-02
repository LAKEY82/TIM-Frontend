"use client";

import { Loader2, Plus, SquareCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import type { Task } from "@/types/domain";
import { TaskAssignee } from "./task-assignee";
import { TaskStatusBadge } from "./task-status-badge";

export function TaskSubtasks({ task }: { task: Task }) {
  const canCreate = usePermission("tasks:create");
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const done = task.subtasks.filter((s) => s.status === "COMPLETED" || s.status === "APPROVED").length;

  const add = () => {
    const value = title.trim();
    if (value.length < 3 || !task.project) return;
    create.mutate(
      {
        title: value,
        projectId: task.project.id,
        milestoneId: task.milestone?.id ?? null,
        parentId: task.id,
        priority: task.priority,
        type: task.type ?? "OTHER",
        tags: [],
      },
      { onSuccess: () => setTitle("") },
    );
  };

  return (
    <div className="space-y-3">
      {task.subtasks.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            {done} of {task.subtasks.length} done
          </p>
          <ul className="divide-y rounded-lg border">
            {task.subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                <Link href={`/tasks/${s.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  {s.title}
                </Link>
                <TaskAssignee user={s.assignee} showName={false} />
                <TaskStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={SquareCheck} title="No subtasks." compact />
      )}
      {canCreate && task.project ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a subtask…" aria-label="New subtask title" />
          <Button type="submit" variant="outline" disabled={title.trim().length < 3 || create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </form>
      ) : null}
    </div>
  );
}
