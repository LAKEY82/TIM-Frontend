"use client";

import { addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { useMemo, useState } from "react";
import { DayMeetings } from "@/components/meetings/day-meetings";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useMyDay } from "@/hooks/queries/use-tasks";
import { formatDate, formatHours, toISODate } from "@/lib/format";
import { QaSetupSection } from "./qa-setup-section";
import { TaskSection } from "./task-section";

/**
 * My Day: the employee's primary workflow. Task → Start → Complete/Submit
 * happens directly from these cards.
 */
export function MyDayView() {
  const [date, setDate] = useState(() => new Date());
  const iso = useMemo(() => toISODate(date), [date]);
  const isToday = iso === toISODate(new Date());
  const query = useMyDay(iso);
  const day = query.data;
  const plannedHours = day?.today.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatDate(date, "EEEE, MMMM d")}
        description={
          day ? `${day.today.length} task${day.today.length === 1 ? "" : "s"} planned · ${formatHours(plannedHours)} estimated` : isToday ? "Your day" : undefined
        }
        actions={
          <div className="flex items-center gap-1" role="group" aria-label="Change day">
            <Button variant="outline" size="icon-sm" onClick={() => setDate((d) => subDays(d, 1))} aria-label="Previous day">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())} disabled={isToday}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setDate((d) => addDays(d, 1))} aria-label="Next day">
              <ChevronRight />
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <ListSkeleton rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load your day." onRetry={() => void query.refetch()} />
      ) : day ? (
        <div className="space-y-8">
          <DayMeetings date={date} />
          {isToday ? <QaSetupSection tasks={day.qaSetup} /> : null}
          {day.qaQueue.length > 0 ? (
            <TaskSection id="myday-qa" title="Waiting for your QA" tasks={day.qaQueue} emptyTitle="Nothing waiting for QA." />
          ) : null}
          <TaskSection id="myday-today" title={isToday ? "Today's tasks" : "Tasks for this day"} tasks={day.today} emptyTitle="No tasks assigned for today." emptyIcon={PartyPopper} />
          <TaskSection id="myday-overdue" title="Overdue" tasks={day.overdue} emptyTitle="Nothing overdue." tone="critical" />
          <TaskSection id="myday-upcoming" title="Upcoming" tasks={day.upcoming} emptyTitle="No upcoming tasks." />
        </div>
      ) : null}
    </div>
  );
}
