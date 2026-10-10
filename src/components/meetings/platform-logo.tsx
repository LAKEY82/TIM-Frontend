import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeetingPlatform } from "@/types/domain";

export const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  TEAMS: "Microsoft Teams",
  OTHER: "Other",
};

/** Where each platform's links usually live, as a hint in the link field. */
export const PLATFORM_LINK_HINTS: Record<MeetingPlatform, string> = {
  ZOOM: "https://zoom.us/j/…",
  GOOGLE_MEET: "https://meet.google.com/…",
  TEAMS: "https://teams.microsoft.com/l/meetup-join/…",
  OTHER: "https://…",
};

/** Guesses the platform from a pasted link, so picking it is usually automatic. */
export function platformFromLink(link: string): MeetingPlatform | null {
  const host = (() => {
    try {
      return new URL(link).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (!host) return null;
  if (host === "zoom.us" || host.endsWith(".zoom.us")) return "ZOOM";
  if (host === "meet.google.com") return "GOOGLE_MEET";
  if (host === "teams.microsoft.com" || host === "teams.live.com") return "TEAMS";
  return "OTHER";
}

/**
 * Small brand marks for each platform, drawn inline (no external images), sized
 * by `className` (default 20px).
 */
export function PlatformLogo({ platform, className }: { platform: MeetingPlatform; className?: string }) {
  const size = cn("size-5 shrink-0", className);
  const label = PLATFORM_LABELS[platform];
  switch (platform) {
    case "ZOOM":
      return (
        <svg viewBox="0 0 32 32" className={size} role="img" aria-label={label}>
          <rect width="32" height="32" rx="8" fill="#2D8CFF" />
          <rect x="6" y="10.5" width="14" height="11" rx="2.5" fill="#fff" />
          <path d="M21.5 14.2 26 11v10l-4.5-3.2z" fill="#fff" />
        </svg>
      );
    case "GOOGLE_MEET":
      return (
        <svg viewBox="0 0 32 32" className={size} role="img" aria-label={label}>
          <path d="M9.5 6 4 11.5h5.5z" fill="#EA4335" />
          <path d="M9.5 6H20a2 2 0 0 1 2 2v3.5H9.5z" fill="#FFBA00" />
          <path d="M4 11.5h5.5v9H4z" fill="#2684FC" />
          <path d="M4 20.5h5.5V26H6a2 2 0 0 1-2-2z" fill="#0066DA" />
          <path d="M9.5 20.5H22V24a2 2 0 0 1-2 2H9.5z" fill="#00AC47" />
          <path d="M9.5 11.5H22v9H9.5z" fill="#00AC47" opacity=".85" />
          <path d="M22 13 28 8.5v15L22 19z" fill="#00832D" />
        </svg>
      );
    case "TEAMS":
      return (
        <svg viewBox="0 0 32 32" className={size} role="img" aria-label={label}>
          <circle cx="23.5" cy="9" r="3.5" fill="#7B83EB" />
          <rect x="18" y="13.5" width="11" height="10" rx="3" fill="#7B83EB" />
          <rect x="3" y="7" width="18" height="18" rx="3" fill="#5059C9" />
          <path d="M8 12h8v2.3h-2.8V21h-2.4v-6.7H8z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <span className={cn("inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground", size)} role="img" aria-label={label}>
          <Link2 className="size-[65%]" aria-hidden />
        </span>
      );
  }
}
