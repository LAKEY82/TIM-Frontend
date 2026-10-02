import { CalendarClock } from "lucide-react";
import { dueState, formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/domain";

const STATE_CLASS = {
  overdue: "text-red-700 dark:text-red-400 font-medium",
  today: "text-amber-700 dark:text-amber-400 font-medium",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
  done: "text-muted-foreground",
} as const;

export function TaskDueDate({
  dueDate,
  status,
  className,
  showIcon = true,
}: {
  dueDate: string | null | undefined;
  status?: TaskStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const state = dueState(dueDate, status);
  if (state === "none") return <span className={cn("text-xs text-muted-foreground", className)}>No due date</span>;
  const label = state === "today" ? "Today" : formatShortDate(dueDate);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", STATE_CLASS[state], className)} title={formatDate(dueDate)}>
      {showIcon ? <CalendarClock className="size-3.5" aria-hidden /> : null}
      {label}
      {state === "overdue" ? <span className="sr-only"> (overdue)</span> : null}
      {state === "overdue" ? <span aria-hidden> · Overdue</span> : null}
    </span>
  );
}
