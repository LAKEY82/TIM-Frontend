"use client";

import { CalendarCheck, Flag, FolderKanban, ListChecks } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { dueState, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeadlineItem } from "@/types/domain";

const KIND_ICON = { TASK: ListChecks, PROJECT: FolderKanban, MILESTONE: Flag } as const;

function hrefFor(item: DeadlineItem): string {
  if (item.kind === "PROJECT") return `/projects/${item.id}`;
  if (item.kind === "MILESTONE") return item.projectId ? `/projects/${item.projectId}/milestones` : "/projects";
  return `/tasks/${item.id}`;
}

export function UpcomingDeadlines({ items, isLoading, limit = 8 }: { items: DeadlineItem[] | undefined; isLoading?: boolean; limit?: number }) {
  if (isLoading) return <ListSkeleton rows={4} />;
  if (!items || items.length === 0) return <EmptyState icon={CalendarCheck} title="No upcoming deadlines." compact />;
  return (
    <ul className="divide-y">
      {items.slice(0, limit).map((item) => {
        const Icon = KIND_ICON[item.kind];
        const state = dueState(item.dueDate);
        return (
          <li key={`${item.kind}-${item.id}`}>
            <Link href={hrefFor(item)} className="flex items-center gap-3 rounded-md px-1 py-2 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={item.kind.toLowerCase()} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.projectName && item.kind !== "PROJECT" ? <p className="truncate text-xs text-muted-foreground">{item.projectName}</p> : null}
              </div>
              {item.assignee ? <UserAvatar user={item.assignee} size="xs" /> : null}
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  state === "overdue" ? "font-medium text-red-700 dark:text-red-400" : state === "today" ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                )}
              >
                {state === "today" ? "Today" : formatShortDate(item.dueDate)}
                {state === "overdue" ? " · Overdue" : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
