import { ExternalLink, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/types/domain";
import { PLATFORM_LABELS, PlatformLogo } from "./platform-logo";

/**
 * Takes the user to the meeting's link (Zoom, Meet, Teams…) in a new tab, so
 * the app stays open behind it. Without a link yet it says so instead of
 * disappearing, so people know why they can't join.
 */
export function JoinMeetingButton({
  meeting,
  live = false,
  size = "sm",
  className,
}: {
  meeting: Pick<Meeting, "link" | "platform" | "title">;
  /** Highlight it while the meeting is on. */
  live?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  if (!meeting.link) {
    return (
      <Button type="button" size={size} variant="outline" disabled className={className} title="The organizer hasn't added a link yet">
        <LinkIcon /> No link yet
      </Button>
    );
  }
  return (
    <Button asChild size={size} variant={live ? "default" : "outline"} className={className}>
      <a href={meeting.link} target="_blank" rel="noopener noreferrer" aria-label={`Join ${meeting.title} on ${PLATFORM_LABELS[meeting.platform]}`}>
        <PlatformLogo platform={meeting.platform} className="size-4" />
        Join meeting
        <ExternalLink className="opacity-60" aria-hidden />
      </a>
    </Button>
  );
}
