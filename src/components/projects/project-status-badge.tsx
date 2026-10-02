import { Badge } from "@/components/ui/badge";
import { MILESTONE_STATUS_META, PROJECT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MilestoneStatus, ProjectStatus } from "@/types/domain";

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const meta = PROJECT_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function MilestoneStatusBadge({ status, className }: { status: MilestoneStatus; className?: string }) {
  const meta = MILESTONE_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}
