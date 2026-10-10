"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FormError, FormField } from "@/components/forms/form-field";
import { MultiUserSelect } from "@/components/forms/multi-user-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveMeeting } from "@/hooks/queries/use-meetings";
import { useUserOptions } from "@/hooks/queries/use-people";
import { getErrorMessage, isApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { MEETING_PLATFORMS, type ID, type Meeting, type MeetingPlatform } from "@/types/domain";
import { PLATFORM_LABELS, PLATFORM_LINK_HINTS, PlatformLogo, platformFromLink } from "./platform-logo";

const pad = (n: number) => String(n).padStart(2, "0");
/** Local `yyyy-MM-dd` and `HH:mm` for the date and time inputs. */
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** New meetings start at the next full hour and last 30 minutes. */
function defaults(meeting?: Meeting | null) {
  if (meeting) {
    const start = new Date(meeting.startAt);
    const end = new Date(meeting.endAt);
    return { date: localDate(start), start: localTime(start), end: localTime(end) };
  }
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  return { date: localDate(start), start: localTime(start), end: localTime(new Date(start.getTime() + 30 * 60_000)) };
}

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this meeting; without it, a new one is created. */
  meeting?: Meeting | null;
  onSaved?: (meeting: Meeting) => void;
}

/**
 * Create or edit a meeting: title, platform (with its logo), link, date, start
 * and end time, notes and, when creating, who to invite. People can be added or
 * removed later from the meeting's page.
 */
export function MeetingFormDialog({ open, onOpenChange, meeting, onSaved }: MeetingFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{meeting ? "Edit meeting" : "New meeting"}</DialogTitle>
          <DialogDescription>
            {meeting ? "Participants are managed on the meeting's page." : "Invite people now or add them later from the meeting's page."}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so the form starts fresh each time it opens. */}
        {open ? <MeetingForm key={meeting?.id ?? "new"} meeting={meeting} onDone={(m) => (onSaved?.(m), onOpenChange(false))} onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MeetingForm({ meeting, onDone, onCancel }: { meeting?: Meeting | null; onDone: (m: Meeting) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const save = useSaveMeeting();
  const people = useUserOptions({}, !meeting);
  const initial = defaults(meeting);
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [platform, setPlatform] = useState<MeetingPlatform>(meeting?.platform ?? "ZOOM");
  const [link, setLink] = useState(meeting?.link ?? "");
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [description, setDescription] = useState(meeting?.description ?? "");
  const [participantIds, setParticipantIds] = useState<ID[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setErrors({});
    setFormError(null);
    const startAt = new Date(`${date}T${start}`);
    const endAt = new Date(`${date}T${end}`);
    const local: Record<string, string> = {};
    if (title.trim().length < 2) local.title = "Give the meeting a title.";
    if (Number.isNaN(startAt.getTime())) local.startAt = "Choose a date and start time.";
    if (Number.isNaN(endAt.getTime()) || endAt <= startAt) local.endAt = "The meeting must end after it starts.";
    if (Object.keys(local).length) return setErrors(local);
    try {
      const saved = await save.mutateAsync({
        id: meeting?.id,
        input: {
          title: title.trim(),
          platform,
          link: link.trim() || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          description: description.trim() || null,
          ...(meeting ? {} : { participantIds }),
        },
      });
      onDone(saved);
    } catch (e) {
      if (isApiError(e) && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setFormError(getErrorMessage(e));
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormError message={formError} />
      <FormField id="meeting-title" label="Title" error={errors.title} required>
        <Input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Sprint planning" autoFocus />
      </FormField>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Platform</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Platform">
          {MEETING_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={platform === p}
              onClick={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                platform === p && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <PlatformLogo platform={p} />
              <span className="truncate">{PLATFORM_LABELS[p]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <FormField id="meeting-link" label="Meeting link" error={errors.link} hint="Pasting a Zoom, Meet or Teams link picks the platform for you.">
        <Input
          id="meeting-link"
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            const guess = platformFromLink(e.target.value.trim());
            if (guess && guess !== "OTHER") setPlatform(guess);
          }}
          placeholder={PLATFORM_LINK_HINTS[platform]}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField id="meeting-date" label="Date" error={errors.startAt} required>
          <Input id="meeting-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField id="meeting-start" label="Starts" required>
          <Input id="meeting-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </FormField>
        <FormField id="meeting-end" label="Ends" error={errors.endAt} required>
          <Input id="meeting-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </FormField>
      </div>

      {meeting ? null : (
        <FormField id="meeting-participants" label="Participants" error={errors.participantIds} hint="You can add or remove people later too.">
          <MultiUserSelect
            id="meeting-participants"
            users={(people.data ?? []).filter((u) => u.id !== user?.id)}
            value={participantIds}
            onChange={setParticipantIds}
            placeholder="Invite people…"
          />
        </FormField>
      )}

      <FormField id="meeting-notes" label="Agenda / notes" error={errors.description}>
        <Textarea id="meeting-notes" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : null}
          {meeting ? "Save changes" : "Create meeting"}
        </Button>
      </DialogFooter>
    </form>
  );
}
