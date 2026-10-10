"use client";

import { ArrowLeft, Copy, Loader2, Pencil, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MultiUserSelect } from "@/components/forms/multi-user-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAddParticipants, useDeleteMeeting, useMeeting, useRemoveParticipant } from "@/hooks/queries/use-meetings";
import { useUserOptions } from "@/hooks/queries/use-people";
import { can } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";
import type { ID, Meeting } from "@/types/domain";
import { JoinMeetingButton } from "./join-meeting-button";
import { MeetingFormDialog } from "./meeting-form-dialog";
import { formatDay, isLive, timeRange } from "./my-meetings-view";
import { PLATFORM_LABELS, PlatformLogo } from "./platform-logo";

/** /meetings/[id]: one meeting, with its link, time, notes and participants. */
export function MeetingDetails({ meetingId }: { meetingId: ID }) {
  const router = useRouter();
  const { user } = useAuth();
  const query = useMeeting(meetingId);
  const remove = useDeleteMeeting();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // When the page opened, for "Live now" / "Ended" (render must not read the clock).
  const [now] = useState(() => Date.now());

  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState error={query.error} title="Unable to load the meeting." onRetry={() => void query.refetch()} />;

  const m = query.data;
  // The organizer (or an admin) manages the meeting; the API checks this too.
  const canManage = Boolean(user && (m.organizer?.id === user.id || can(user, "users:manage")));
  const ended = new Date(m.endAt).getTime() < now;
  const live = isLive(m, now);

  return (
    <div className="space-y-5">
      <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> My meetings
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PlatformLogo platform={m.platform} className="size-8" />
            <span className="truncate">{m.title}</span>
            {live ? <Badge className="bg-emerald-600 text-white">Live now</Badge> : ended ? <Badge variant="outline">Ended</Badge> : null}
          </span>
        }
        description={`${formatDay(m.startAt)} · ${timeRange(m)} · ${PLATFORM_LABELS[m.platform]}`}
        actions={
          <>
            {ended ? null : <JoinMeetingButton meeting={m} live />}
            {canManage ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleting(true)} aria-label="Delete meeting">
                  <Trash2 />
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <SectionCard title="Details">
            <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">Platform</dt>
              <dd className="flex items-center gap-2">
                <PlatformLogo platform={m.platform} className="size-4" /> {PLATFORM_LABELS[m.platform]}
              </dd>
              <dt className="text-muted-foreground">When</dt>
              <dd>
                {formatDay(m.startAt)}, {timeRange(m)}
              </dd>
              <dt className="text-muted-foreground">Link</dt>
              <dd className="min-w-0">
                {m.link ? (
                  <span className="flex min-w-0 items-center gap-1">
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">
                      {m.link}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy meeting link"
                      onClick={() => void navigator.clipboard?.writeText(m.link!).then(() => toast.success("Link copied."))}
                    >
                      <Copy />
                    </Button>
                  </span>
                ) : (
                  <span className="text-muted-foreground">No link yet{canManage ? " — add one with Edit." : "."}</span>
                )}
              </dd>
              {m.project ? (
                <>
                  <dt className="text-muted-foreground">Project</dt>
                  <dd>
                    <Link href={`/projects/${m.project.id}`} className="hover:underline">
                      {m.project.name}
                    </Link>
                  </dd>
                </>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Agenda / notes">
            {m.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No agenda yet.</p>
            )}
          </SectionCard>
        </div>

        <aside>
          <Participants meeting={m} canManage={canManage} />
        </aside>
      </div>

      <MeetingFormDialog open={editing} onOpenChange={setEditing} meeting={m} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this meeting?"
        description="It's removed for everyone invited. This can't be undone."
        confirmLabel="Delete meeting"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate(m.id, { onSuccess: () => router.push("/meetings") })}
      />
    </div>
  );
}

/** Who's coming. The organizer adds or removes people at any time; anyone can leave. */
function Participants({ meeting: m, canManage }: { meeting: Meeting; canManage: boolean }) {
  const { user } = useAuth();
  const add = useAddParticipants();
  const removeOne = useRemoveParticipant();
  const [adding, setAdding] = useState<ID[]>([]);
  const people = useUserOptions({}, canManage);
  const invited = new Set([m.organizer?.id, ...m.participants.map((p) => p.id)]);
  const candidates = (people.data ?? []).filter((u) => !invited.has(u.id));

  return (
    <SectionCard title={`Participants (${m.participants.length + (m.organizer ? 1 : 0)})`}>
      <div className="space-y-4">
        <ul className="space-y-2">
          {m.organizer ? (
            <li className="flex items-center gap-2 text-sm">
              <UserAvatar user={m.organizer} size="sm" />
              <span className="min-w-0 flex-1 truncate">{m.organizer.name}</span>
              <Badge variant="outline">Organizer</Badge>
            </li>
          ) : null}
          {m.participants.map((p) => {
            const self = p.id === user?.id;
            const removing = removeOne.isPending && removeOne.variables?.userId === p.id;
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <UserAvatar user={p} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {p.name}
                  {self ? <span className="text-muted-foreground"> (you)</span> : null}
                </span>
                {canManage || self ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={self && !canManage ? "Leave meeting" : `Remove ${p.name}`}
                    onClick={() => removeOne.mutate({ id: m.id, userId: p.id })}
                    disabled={removing}
                  >
                    {removing ? <Loader2 className="animate-spin" /> : <X />}
                  </Button>
                ) : null}
              </li>
            );
          })}
          {m.participants.length === 0 ? <li className="text-sm text-muted-foreground">Nobody invited yet.</li> : null}
        </ul>

        {canManage ? (
          <div className="space-y-2 border-t pt-4">
            <MultiUserSelect id="add-participants" users={candidates} value={adding} onChange={setAdding} placeholder="Add people…" />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!adding.length || add.isPending}
              onClick={() => add.mutate({ id: m.id, userIds: adding }, { onSuccess: () => setAdding([]) })}
            >
              {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Add {adding.length ? adding.length : ""} {adding.length === 1 ? "participant" : "participants"}
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
