import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectLinkKind } from "@/types/domain";

export const LINK_KIND_LABELS: Record<ProjectLinkKind, string> = { FIGMA: "Figma", GITHUB: "GitHub", OTHER: "Link" };

/** Same rule as the API: figma.com → Figma, github.com → GitHub, otherwise a plain link. */
export function linkKindFromUrl(url: string): ProjectLinkKind | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  if (host === "figma.com" || host.endsWith(".figma.com")) return "FIGMA";
  if (host === "github.com" || host.endsWith(".github.com")) return "GITHUB";
  return "OTHER";
}

/** Figma and GitHub marks drawn inline (no external images); a chain link for anything else. */
export function LinkLogo({ kind, className }: { kind: ProjectLinkKind; className?: string }) {
  const size = cn("size-5 shrink-0", className);
  if (kind === "FIGMA") {
    return (
      <svg viewBox="0 0 38 57" className={size} role="img" aria-label="Figma">
        <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
        <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
        <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
        <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
        <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
      </svg>
    );
  }
  if (kind === "GITHUB") {
    // Follows the text colour, so it reads in light and dark themes.
    return (
      <svg viewBox="0 0 16 16" className={cn(size, "text-foreground")} role="img" aria-label="GitHub">
        <path
          fill="currentColor"
          d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
        />
      </svg>
    );
  }
  return (
    <span className={cn("inline-flex items-center justify-center rounded-md bg-muted text-muted-foreground", size)} role="img" aria-label="Link">
      <Link2 className="size-[65%]" aria-hidden />
    </span>
  );
}
