import { ChevronDown, ChevronsUp, ChevronUp, Equal, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

const ICONS: Record<Priority, LucideIcon> = {
  LOW: ChevronDown,
  MEDIUM: Equal,
  HIGH: ChevronUp,
  URGENT: ChevronsUp,
};

export function TaskPriorityBadge({ priority, className, iconOnly }: { priority: Priority; className?: string; iconOnly?: boolean }) {
  const meta = PRIORITY_META[priority];
  const Icon = ICONS[priority];
  if (iconOnly) {
    return (
      <span className={cn("inline-flex", meta.ink, className)} title={`${meta.label} priority`}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{meta.label} priority</span>
      </span>
    );
  }
  return (
    <Badge variant="outline" className={cn("gap-1", meta.badge, className)}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}
