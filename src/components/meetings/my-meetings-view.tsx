"use client";

import { CalendarClock, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMeetings } from "@/hooks/queries/use-meetings";
import type { Meeting, UserSummary } from "@/types/domain";
import { JoinMeetingButton } from "./join-meeting-button";
import { MeetingFormDialog } from "./meeting-form-dialog";
import { PLATFORM_LABELS, PlatformLogo } from "./platform-logo";

type Scope = "upcoming" | "past";

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today", "Tomorrow", or e.g. "Tuesday, October 13, 2026". */
export function formatDay(value: string | Date) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value));
}

/** "10:00 AM – 11:00 AM" */
export const timeRange = (m: Pick<Meeting, "startAt" | "endAt">) => `${formatTime(m.startAt)} – ${formatTime(m.endAt)}`;

export function isLive(m: Pick<Meeting, "startAt" | "endAt">, now = Date.now()) {
  return new Date(m.startAt).getTime() <= now && now < new Date(m.endAt).getTime();
}

/** Everyone in the meeting: the organizer first, then the participants. */
export const everyone = (m: Meeting): UserSummary[] => [...(m.organizer ? [m.organizer] : []), ...m.participants];

const dayKey = (value: string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** /meetings: the meetings you organise or are invited to, grouped by day. */
export function MyMeetingsView() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("upcoming");
  const [creating, setCreating] = useState(false);
  const query = useMeetings({ scope, pageSize: 100 });
  const meetings = query.data?.items ?? [];

  // Group by day in the API's order (soonest first upcoming, latest first past).
  const groups: { key: string; date: string; meetings: Meeting[] }[] = [];
  for (const m of meetings) {
    const key = dayKey(m.startAt);
    const last = groups.at(-1);
    if (last?.key === key) last.meetings.push(m);
    else groups.push({ key, date: m.startAt, meetings: [m] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My meetings"
        description="Meetings you're invited to or organising."
        actions={
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={scope} onValueChange={(v) => v && setScope(v as Scope)} aria-label="Which meetings">
              <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
              <ToggleGroupItem value="past">Past</ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus /> New meeting
            </Button>
          </>
        }
      />

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load your meetings." onRetry={() => void query.refetch()} />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={scope === "upcoming" ? "No upcoming meetings." : "No past meetings."}
          description={scope === "upcoming" ? "Meetings you're part of will show up here." : undefined}
          action={
            scope === "upcoming" ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus /> New meeting
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3" aria-labelledby={`day-${group.key}`}>
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <CalendarClock size={18} className="text-muted-foreground" aria-hidden />
                <h2 id={`day-${group.key}`} className="text-sm font-semibold">
                  {formatDay(group.date)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.meetings.length} {group.meetings.length === 1 ? "meeting" : "meetings"}
                </span>
              </div>
              <div className="space-y-3">
                {group.meetings.map((m) => (
                  <MeetingCard key={m.id} meeting={m} past={scope === "past"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MeetingFormDialog open={creating} onOpenChange={setCreating} onSaved={(m) => router.push(`/meetings/${m.id}`)} />
    </div>
  );
}

/** One meeting: platform logo, time, people and a Join meeting button (hidden once it's over). */
export function MeetingCard({ meeting: m, past }: { meeting: Meeting; past: boolean }) {
  const people = everyone(m);
  const live = isLive(m);
  return (
    <article className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <PlatformLogo platform={m.platform} className="size-7" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">
              <Link href={`/meetings/${m.id}`} className="hover:underline">
                {m.title}
              </Link>
            </h3>
            {live ? <Badge className="bg-emerald-600 text-white">Live now</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden />
              {timeRange(m)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PlatformLogo platform={m.platform} className="size-3.5" />
              {PLATFORM_LABELS[m.platform]}
            </span>
            {m.organizer ? <span>Organised by {m.organizer.name}</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-3 self-center">
          <div className="flex -space-x-1.5" aria-label={`${people.length} ${people.length === 1 ? "person" : "people"}`}>
            {people.slice(0, 5).map((u) => (
              <UserAvatar key={u.id} user={u} size="sm" className="ring-2 ring-background" />
            ))}
            {people.length > 5 ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] ring-2 ring-background">+{people.length - 5}</span>
            ) : null}
          </div>
          {/* Once it's over there's nothing to join. */}
          {past ? null : <JoinMeetingButton meeting={m} live={live} />}
        </div>
      </div>
    </article>
  );
}
