"use client";

import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import type { TaskSummary } from "@/types/domain";
import { TaskCard } from "./task-card";

interface TaskSectionProps {
  id: string;
  title: string;
  tasks: TaskSummary[];
  emptyTitle: string;
  emptyIcon?: LucideIcon;
  tone?: "default" | "critical";
  className?: string;
}

/** A titled group of task cards (My Day / employee dashboard). */
export function TaskSection({ id, title, tasks, emptyTitle, emptyIcon, tone = "default", className }: TaskSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", className)}>
      <h2 id={id} className="flex items-center gap-2 text-sm font-semibold">
        {title}
        <span
          className={cn(
            "rounded-full px-1.5 text-xs font-medium tabular-nums",
            tone === "critical" && tasks.length > 0 ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground",
          )}
        >
          {tasks.length}
        </span>
      </h2>
      {tasks.length === 0 ? (
        <EmptyState title={emptyTitle} icon={emptyIcon} compact />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
