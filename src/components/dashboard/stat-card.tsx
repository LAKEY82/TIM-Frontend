import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  href?: string;
  hint?: string;
  /** Status tone for the icon only; the number stays in text ink. */
  tone?: "default" | "good" | "warning" | "critical";
  className?: string;
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  good: "bg-status-good/10 text-[color:var(--status-good)]",
  warning: "bg-status-warning/15 text-amber-700 dark:text-[color:var(--status-warning)]",
  critical: "bg-status-critical/10 text-[color:var(--status-critical)]",
};

/** KPI tile. Links through to the filtered list so numbers are one click from detail. */
export function StatCard({ label, value, icon: Icon, href, hint, tone = "default", className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-6 items-center justify-center rounded-md", TONE[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const classes = cn("block rounded-xl border bg-card p-4 transition-colors", href && "hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring outline-none", className);
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
