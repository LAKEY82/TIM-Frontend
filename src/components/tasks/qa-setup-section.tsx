"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { useMyDay } from "@/hooks/queries/use-tasks";
import { toISODate } from "@/lib/format";
import type { TaskSummary } from "@/types/domain";
import { TaskQaDueDatePicker, TaskQaPicker } from "./inline-pickers";

/** Why a task in QA is still on the project manager's list. */
export function qaSetupReason(t: TaskSummary): string {
  if (!t.qa) return "Choose a QA tester";
  if (t.stage !== "QA" && t.assignee && t.qa.id === t.assignee.id) return "The developer can't test their own work — pick another tester";
  if (!t.qaDueDate) return "Set the QA due date";
  return "";
}

/**
 * The project manager's to-do for tasks that just entered QA: pick who tests
 * each one and by when. Renders nothing when there's nothing to set up.
 */
export function QaSetupSection({ tasks }: { tasks?: TaskSummary[] }) {
  const today = useMemo(() => toISODate(new Date()), []);
  const day = useMyDay(today);
  const list = tasks ?? day.data?.qaSetup ?? [];
  if (list.length === 0) return null;

  return (
    <SectionCard
      title={`QA to set up (${list.length})`}
      description="These passed code review. Choose who tests each one and the QA due date."
      className="border-cyan-500/30"
    >
      <ul className="divide-y" aria-label="QA to set up">
        {list.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <FlaskConical className="mt-0.5 size-4 shrink-0 text-cyan-600" aria-hidden />
              <div className="min-w-0">
                <Link href={`/tasks/${t.id}`} className="block truncate text-sm font-medium hover:underline">
                  {t.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[t.project?.name, t.assignee ? `Developer: ${t.assignee.name}` : null].filter(Boolean).join(" · ")}
                  <span className="text-amber-700 dark:text-amber-400"> · {qaSetupReason(t)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-6 sm:pl-0">
              <TaskQaPicker task={t} showName />
              <TaskQaDueDatePicker task={t} />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
