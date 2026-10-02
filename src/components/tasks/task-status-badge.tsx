import {
  Ban,
  CheckCheck,
  CheckCircle2,
  Circle,
  CircleDot,
  Eye,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/domain";

export const TASK_STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  TODO: Circle,
  IN_PROGRESS: CircleDot,
  BLOCKED: Ban,
  COMPLETED: CheckCircle2,
  IN_REVIEW: Eye,
  CHANGES_REQUESTED: RotateCcw,
  APPROVED: CheckCheck,
};

/** Status badge: icon + label + color, so state never relies on color alone. */
export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = TASK_STATUS_META[status];
  const Icon = TASK_STATUS_ICONS[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.badge, className)}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}
