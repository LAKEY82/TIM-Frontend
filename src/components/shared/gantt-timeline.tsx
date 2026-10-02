"use client";

import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  max as maxDate,
  min as minDate,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { GanttChart } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { EmptyState } from "@/components/shared/states";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate, toDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineZoom = "day" | "week" | "month";

export interface TimelineRow {
  id: string;
  label: string;
  sublabel?: string | null;
  kind: "PROJECT" | "MILESTONE" | "TASK";
  start?: string | null;
  end?: string | null;
  href: string;
  /** 0 = project, 1 = milestone, 2 = task */
  depth?: number;
  /** Tailwind bg class for the bar (status color). */
  barClass?: string;
  progress?: number;
}

/** Pixels per day at each zoom level. */
const DAY_WIDTH: Record<TimelineZoom, number> = { day: 36, week: 14, month: 4 };
const WEEK_OPTS = { weekStartsOn: 1 as const };

interface GanttTimelineProps {
  rows: TimelineRow[];
  zoom: TimelineZoom;
  onZoomChange: (zoom: TimelineZoom) => void;
  emptyLabel?: string;
}

/**
 * Lightweight Gantt: a sticky label column and a scrollable time grid.
 * Rows without dates are listed with an "unscheduled" note instead of hidden.
 */
export function GanttTimeline({ rows, zoom, onZoomChange, emptyLabel = "Nothing to show on the timeline yet." }: GanttTimelineProps) {
  const dayWidth = DAY_WIDTH[zoom];
  const scrollerRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => {
    const dates = rows.flatMap((r) => [toDate(r.start), toDate(r.end)]).filter((d): d is Date => d !== null);
    const today = new Date();
    if (dates.length === 0) return null;
    const first = minDate([...dates, today]);
    const last = maxDate([...dates, today]);
    const start = zoom === "month" ? startOfMonth(first) : startOfWeek(addDays(first, -3), WEEK_OPTS);
    const end = zoom === "month" ? endOfMonth(last) : endOfWeek(addDays(last, 3), WEEK_OPTS);
    return { start, end, days: differenceInCalendarDays(end, start) + 1 };
  }, [rows, zoom]);

  const ticks = useMemo(() => {
    if (!range) return [];
    const interval = { start: range.start, end: range.end };
    const dates =
      zoom === "day" ? eachDayOfInterval(interval) : zoom === "week" ? eachWeekOfInterval(interval, WEEK_OPTS) : eachMonthOfInterval(interval);
    return dates.map((d) => ({
      date: d,
      left: differenceInCalendarDays(d, range.start) * dayWidth,
      label: zoom === "day" ? format(d, "d") : zoom === "week" ? format(d, "MMM d") : format(d, "MMM yyyy"),
    }));
  }, [range, zoom, dayWidth]);

  const todayOffset = range ? differenceInCalendarDays(new Date(), range.start) * dayWidth : 0;

  // Open centred on today rather than at the start of the range.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = Math.max(0, todayOffset - el.clientWidth / 3);
  }, [todayOffset]);

  const toolbar = (
    <div className="flex justify-end">
      <ToggleGroup type="single" variant="outline" size="sm" value={zoom} onValueChange={(v) => v && onZoomChange(v as TimelineZoom)} aria-label="Timeline zoom">
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  if (rows.length === 0 || !range) {
    return (
      <div className="space-y-3">
        {toolbar}
        <EmptyState icon={GanttChart} title={emptyLabel} description={rows.length ? "Add start and due dates to place items on the timeline." : undefined} />
      </div>
    );
  }

  const width = range.days * dayWidth;
  const todayLeft = todayOffset;

  return (
    <div className="space-y-3">
      {toolbar}
      <div ref={scrollerRef} className="relative overflow-x-auto rounded-lg border" role="region" aria-label="Timeline" tabIndex={0}>
        <div className="grid" style={{ gridTemplateColumns: `minmax(12rem, 16rem) ${width}px` }}>
          {/* Header */}
          <div className="sticky left-0 z-20 border-r border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur">Item</div>
          <div className="relative h-9 border-b bg-muted/40">
            {ticks.map((t) => (
              <span key={t.date.toISOString()} className="absolute top-0 h-full border-l pl-1 pt-2 text-[11px] whitespace-nowrap text-muted-foreground" style={{ left: t.left }}>
                {t.label}
              </span>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row) => {
            const s = toDate(row.start) ?? toDate(row.end);
            const e = toDate(row.end) ?? toDate(row.start);
            const left = s ? differenceInCalendarDays(s, range.start) * dayWidth : 0;
            const span = s && e ? Math.max(1, differenceInCalendarDays(e, s) + 1) * dayWidth : 0;
            const isPoint = row.kind === "MILESTONE" && s && e && differenceInCalendarDays(e, s) === 0;
            const label = `${row.label}: ${s ? formatDate(s) : "unscheduled"}${e && s && e.getTime() !== s.getTime() ? ` to ${formatDate(e)}` : ""}`;
            return (
              <div key={`${row.kind}-${row.id}`} className="contents">
                <div className="sticky left-0 z-10 flex min-w-0 flex-col justify-center border-r border-b bg-background px-3 py-1.5" style={{ paddingLeft: 12 + (row.depth ?? 0) * 14 }}>
                  <Link href={row.href} className={cn("truncate text-sm hover:underline", row.kind === "PROJECT" && "font-semibold", row.kind === "MILESTONE" && "font-medium")}>
                    {row.label}
                  </Link>
                  {row.sublabel ? <span className="truncate text-xs text-muted-foreground">{row.sublabel}</span> : null}
                </div>
                <div className="relative h-11 border-b">
                  {ticks.map((t) => (
                    <span key={t.date.toISOString()} aria-hidden className="absolute inset-y-0 border-l border-border/50" style={{ left: t.left }} />
                  ))}
                  {todayLeft >= 0 && todayLeft <= width ? <span aria-hidden className="absolute inset-y-0 w-px bg-primary/60" style={{ left: todayLeft }} /> : null}
                  {s ? (
                    isPoint ? (
                      <Link
                        href={row.href}
                        aria-label={label}
                        title={label}
                        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-foreground outline-none ring-2 ring-background focus-visible:ring-ring"
                        style={{ left: left + dayWidth / 2 }}
                      />
                    ) : (
                      <Link
                        href={row.href}
                        aria-label={label}
                        title={label}
                        className={cn(
                          "absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          row.barClass ?? "bg-[color:var(--series-1)]",
                          row.kind === "PROJECT" && "h-6",
                        )}
                        style={{ left, width: span }}
                      >
                        {row.progress !== undefined ? (
                          <span aria-hidden className="absolute inset-y-0 left-0 bg-black/20 dark:bg-white/25" style={{ width: `${row.progress}%` }} />
                        ) : null}
                      </Link>
                    )
                  ) : (
                    <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">Unscheduled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
