import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/types/domain";

export function TaskAssignee({
  user,
  showName = true,
  className,
  emptyLabel = "Unassigned",
}: {
  user: UserSummary | null | undefined;
  showName?: boolean;
  className?: string;
  emptyLabel?: string;
}) {
  if (!user) return <span className={cn("text-xs text-muted-foreground", className)}>{emptyLabel}</span>;
  return (
    <Link
      href={`/team/${user.id}`}
      className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-sm text-sm hover:underline", className)}
      title={user.name}
      onClick={(e) => e.stopPropagation()}
    >
      <UserAvatar user={user} size="sm" />
      {showName ? <span className="truncate">{user.name}</span> : <span className="sr-only">{user.name}</span>}
    </Link>
  );
}
