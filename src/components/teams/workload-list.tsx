import { Users } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatHours } from "@/lib/format";
import type { WorkloadEntry } from "@/types/domain";

/**
 * Factual workload per person: assigned, estimated hours, completed,
 * in review, blocked, overdue. Deliberately no scores or rankings.
 */
export function WorkloadList({
  items,
  isLoading,
  error,
  onRetry,
  emptyLabel = "No workload data.",
}: {
  items: WorkloadEntry[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyLabel?: string;
}) {
  if (isLoading) return <ListSkeleton rows={4} />;
  if (error) return <ErrorState error={error} title="Unable to load workload." onRetry={onRetry} compact />;
  if (!items || items.length === 0) return <EmptyState icon={Users} title={emptyLabel} compact />;

  return (
    <ul className="divide-y">
      {items.map((w) => (
        <li key={w.userId} className="py-2.5">
          <div className="flex items-center gap-3">
            <UserAvatar user={{ name: w.name, avatarUrl: w.avatarUrl }} size="sm" className="size-7" />
            <div className="min-w-0 flex-1">
              <Link href={`/team/${w.userId}`} className="block truncate text-sm font-medium hover:underline">
                {w.name}
              </Link>
              {w.departmentName ? <p className="truncate text-xs text-muted-foreground">{w.departmentName}</p> : null}
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs sm:grid-cols-6">
            <Metric label="Assigned" value={w.assigned} />
            <Metric label="Estimated" value={formatHours(w.estimatedHours)} />
            <Metric label="Completed" value={w.completed} />
            <Metric label="In review" value={w.inReview} />
            <Metric label="Blocked" value={w.blocked} alert={w.blocked > 0} />
            <Metric label="Overdue" value={w.overdue} alert={w.overdue > 0} />
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={alert ? "font-semibold text-red-700 tabular-nums dark:text-red-400" : "font-medium tabular-nums"}>{value}</dd>
    </div>
  );
}
