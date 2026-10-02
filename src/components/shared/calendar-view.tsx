"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Flag, FolderKanban, ListChecks } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toDate, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeadlineKind } from "@/types/domain";

export type CalendarMode = "month" | "week" | "day";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  kind: DeadlineKind;
  href: string;
  subtitle?: string | null;
  /** Tailwind class for the leading dot (status color). */
  dotClass?: string;
  done?: boolean;
}

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** The visible [from, to] range for a mode and cursor, for fetching. */
export function calendarRange(mode: CalendarMode, cursor: Date): { from: string; to: string } {
  if (mode === "day") return { from: toISODate(cursor), to: toISODate(cursor) };
  if (mode === "week") return { from: toISODate(startOfWeek(cursor, WEEK_OPTS)), to: toISODate(endOfWeek(cursor, WEEK_OPTS)) };
  return {
    from: toISODate(startOfWeek(startOfMonth(cursor), WEEK_OPTS)),
    to: toISODate(endOfWeek(endOfMonth(cursor), WEEK_OPTS)),
  };
}

const KIND_ICON = { TASK: ListChecks, PROJECT: FolderKanban, MILESTONE: Flag } as const;

function EventChip({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const Icon = KIND_ICON[event.kind];
  return (
    <Link
      href={event.href}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md border bg-card px-1.5 py-1 text-xs outline-none hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring",
        event.done && "text-muted-foreground line-through",
      )}
      title={`${event.title}${event.subtitle ? ` — ${event.subtitle}` : ""}`}
    >
      {event.dotClass ? <span className={cn("size-1.5 shrink-0 rounded-full", event.dotClass)} aria-hidden /> : null}
      <Icon className="size-3 shrink-0 text-muted-foreground" aria-label={event.kind.toLowerCase()} />
      <span className="truncate">{event.title}</span>
      {!compact && event.subtitle ? <span className="ml-auto hidden truncate text-muted-foreground sm:inline">{event.subtitle}</span> : null}
    </Link>
  );
}

interface CalendarViewProps {
  mode: CalendarMode;
  cursor: Date;
  onModeChange: (mode: CalendarMode) => void;
  onCursorChange: (date: Date) => void;
  events: CalendarEvent[];
  isFetching?: boolean;
  toolbarExtra?: React.ReactNode;
}

export function CalendarView({ mode, cursor, onModeChange, onCursorChange, events, isFetching, toolbarExtra }: CalendarViewProps) {
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const d = toDate(e.date);
      if (!d) continue;
      const key = toISODate(d);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const step = (dir: 1 | -1) => {
    if (mode === "month") onCursorChange(dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (mode === "week") onCursorChange(dir === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else onCursorChange(dir === 1 ? addDays(cursor, 1) : subDays(cursor, 1));
  };

  const title =
    mode === "month"
      ? format(cursor, "MMMM yyyy")
      : mode === "week"
        ? `${format(startOfWeek(cursor, WEEK_OPTS), "MMM d")} – ${format(endOfWeek(cursor, WEEK_OPTS), "MMM d, yyyy")}`
        : format(cursor, "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label={`Previous ${mode}`}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCursorChange(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label={`Next ${mode}`}>
            <ChevronRight />
          </Button>
        </div>
        <h2 className="text-sm font-semibold" aria-live="polite">
          {title}
          {isFetching ? <span className="ml-2 text-xs font-normal text-muted-foreground">Loading…</span> : null}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          {toolbarExtra}
          <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && onModeChange(v as CalendarMode)} aria-label="Calendar view">
            <ToggleGroupItem value="month">Month</ToggleGroupItem>
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid cursor={cursor} byDay={byDay} onPickDay={(d) => { onCursorChange(d); onModeChange("day"); }} />
      ) : mode === "week" ? (
        <WeekGrid cursor={cursor} byDay={byDay} />
      ) : (
        <DayList cursor={cursor} events={byDay.get(toISODate(cursor)) ?? []} />
      )}
    </div>
  );
}

function MonthGrid({ cursor, byDay, onPickDay }: { cursor: Date; byDay: Map<string, CalendarEvent[]>; onPickDay: (d: Date) => void }) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), WEEK_OPTS), end: endOfWeek(endOfMonth(cursor), WEEK_OPTS) });
  const weekdays = days.slice(0, 7);
  return (
    <div className="relative overflow-x-auto rounded-lg border">
      <div className="grid min-w-[720px] grid-cols-7">
        {weekdays.map((d) => (
          <div key={d.toISOString()} className="border-b bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {format(d, "EEE")}
          </div>
        ))}
        {days.map((day) => {
          const items = byDay.get(toISODate(day)) ?? [];
          const shown = items.slice(0, 3);
          return (
            <section
              key={day.toISOString()}
              aria-label={`${format(day, "EEEE, MMMM d")}: ${items.length} item${items.length === 1 ? "" : "s"}`}
              className={cn("min-h-28 space-y-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !isSameMonth(day, cursor) && "bg-muted/30")}
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  isToday(day) && "bg-primary font-semibold text-primary-foreground hover:bg-primary",
                  !isSameMonth(day, cursor) && !isToday(day) && "text-muted-foreground",
                )}
                aria-label={`Open ${format(day, "MMMM d")}`}
              >
                {format(day, "d")}
              </button>
              {shown.map((e) => (
                <EventChip key={`${e.kind}-${e.id}`} event={e} compact />
              ))}
              {items.length > shown.length ? (
                <button type="button" onClick={() => onPickDay(day)} className="px-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                  +{items.length - shown.length} more
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ cursor, byDay }: { cursor: Date; byDay: Map<string, CalendarEvent[]> }) {
  const days = eachDayOfInterval({ start: startOfWeek(cursor, WEEK_OPTS), end: endOfWeek(cursor, WEEK_OPTS) });
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const items = byDay.get(toISODate(day)) ?? [];
        return (
          <section key={day.toISOString()} aria-label={format(day, "EEEE, MMMM d")} className={cn("min-h-40 space-y-1.5 rounded-lg border p-2", isToday(day) && "border-primary/50")}>
            <p className={cn("text-xs font-medium", isToday(day) ? "text-primary" : "text-muted-foreground")}>{format(day, "EEE d")}</p>
            {items.length === 0 ? <p className="text-xs text-muted-foreground/70">—</p> : items.map((e) => <EventChip key={`${e.kind}-${e.id}`} event={e} compact />)}
          </section>
        );
      })}
    </div>
  );
}

function DayList({ cursor, events }: { cursor: Date; events: CalendarEvent[] }) {
  if (events.length === 0) {
    return <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">Nothing scheduled for {format(cursor, "MMMM d")}.</p>;
  }
  return (
    <div className="grid gap-2">
      {events.map((e) => (
        <EventChip key={`${e.kind}-${e.id}`} event={e} />
      ))}
    </div>
  );
}

