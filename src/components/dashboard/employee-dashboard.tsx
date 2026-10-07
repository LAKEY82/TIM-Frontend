"use client";

import { Ban, CalendarCheck, Clock, Eye, PartyPopper, Sun } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { TaskSection } from "@/components/tasks/task-section";
import { Button } from "@/components/ui/button";
import { useMyDay } from "@/hooks/queries/use-tasks";
import { firstName, formatDate, greeting, toISODate } from "@/lib/format";
import { useCurrentUser } from "@/providers/auth-provider";
import { StatCard } from "./stat-card";

/** Simple, personal dashboard for employees. */
export function EmployeeDashboard() {
  const me = useCurrentUser();
  const today = useMemo(() => toISODate(new Date()), []);
  const query = useMyDay(today);
  const day = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName(me.name)}`}
        description={formatDate(new Date(), "EEEE, MMMM d")}
        actions={
          <Button asChild size="sm">
            <Link href="/my-day">
              <Sun /> Open My Day
            </Link>
          </Button>
        }
      />

      {query.isError ? <ErrorState error={query.error} title="Unable to load your tasks." onRetry={() => void query.refetch()} /> : null}

      {query.isLoading ? (
        <>
          <StatCardsSkeleton count={4} />
          <ListSkeleton rows={4} />
        </>
      ) : day ? (
        <>
          <section aria-label="My summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Today" value={day.today.length} icon={CalendarCheck} href="/my-day" />
            <StatCard label="Overdue" value={day.overdue.length} icon={Clock} href="/my-day" tone={day.overdue.length > 0 ? "critical" : "default"} />
            <StatCard label="In review" value={day.inReview.length} icon={Eye} href="/tasks?status=IN_REVIEW" />
            <StatCard label="Blocked" value={day.blocked.length} icon={Ban} href="/tasks?status=BLOCKED" tone={day.blocked.length > 0 ? "warning" : "default"} />
          </section>

          {day.qaQueue.length > 0 ? (
            <TaskSection id="emp-qa" title="Waiting for your QA" tasks={day.qaQueue} emptyTitle="Nothing waiting for QA." />
          ) : null}
          <TaskSection id="emp-today" title="Today's tasks" tasks={day.today} emptyTitle="No tasks assigned for today." emptyIcon={PartyPopper} />
          <TaskSection id="emp-overdue" title="Overdue" tasks={day.overdue} emptyTitle="Nothing overdue. Nice work." tone="critical" />
          <TaskSection id="emp-review" title="In review" tasks={day.inReview} emptyTitle="Nothing waiting for review." />
          <TaskSection id="emp-upcoming" title="Upcoming" tasks={day.upcoming} emptyTitle="No upcoming tasks." />
          <TaskSection id="emp-blocked" title="Blocked" tasks={day.blocked} emptyTitle="Nothing blocked." />
        </>
      ) : null}
    </div>
  );
}
