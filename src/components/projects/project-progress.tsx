import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ProjectProgress({
  value,
  label = "Progress",
  showLabel = true,
  className,
}: {
  value: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">{pct}%</span>
        </div>
      ) : null}
      <Progress value={pct} aria-label={`${label}: ${pct}%`} className="h-1.5" />
    </div>
  );
}
