"use client";

import { endOfDay, startOfDay } from "date-fns";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ListSkeleton } from "@/components/shared/skeletons";
import { useMeetings } from "@/hooks/queries/use-meetings";
import { MeetingCard } from "./my-meetings-view";

/** My Day: the meetings on the chosen day, in time order. */
export function DayMeetings({ date }: { date: Date }) {
  const from = startOfDay(date).toISOString();
  const to = endOfDay(date).toISOString();
  const query = useMeetings({ scope: "all", from, to, pageSize: 50 });
  // When the page opened, to tell meetings that are over (render must not read the clock).
  const [now] = useState(() => Date.now());
  const meetings = query.data?.items ?? [];

  return (
    <section aria-labelledby="myday-meetings" className="space-y-3">
      <h2 id="myday-meetings" className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
        Meetings
        {meetings.length ? <span className="text-xs font-normal text-muted-foreground">{meetings.length}</span> : null}
      </h2>
      {query.isLoading ? (
        <ListSkeleton rows={1} />
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load your meetings.</p>
      ) : meetings.length ? (
        <div className="space-y-3">
          {meetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} past={new Date(m.endAt).getTime() < now} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No meetings this day.{" "}
          <Link href="/meetings" className="text-primary hover:underline">
            Schedule one
          </Link>
        </p>
      )}
    </section>
  );
}
