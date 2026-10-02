"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { entityHref } from "@/lib/entity-links";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types/domain";

interface ActivityTimelineProps {
  items: ActivityItem[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyLabel?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Reusable activity feed: "Lakindu assigned Checkout API to Pabasara."
 * Entity names link to their detail pages so management can drill down.
 */
export function ActivityTimeline({
  items,
  isLoading,
  error,
  onRetry,
  emptyLabel = "No activity yet.",
  compact,
  className,
}: ActivityTimelineProps) {
  if (isLoading) return <ListSkeleton rows={compact ? 3 : 5} />;
  if (error) return <ErrorState error={error} title="Unable to load activity." onRetry={onRetry} compact />;
  if (!items || items.length === 0) return <EmptyState icon={Activity} title={emptyLabel} compact />;

  return (
    <ol className={cn("relative space-y-4", className)}>
      {items.map((item, index) => (
        <li key={item.id || index} className="relative flex gap-3">
          {index < items.length - 1 ? (
            <span aria-hidden className="absolute top-8 bottom-[-16px] left-[13px] w-px bg-border" />
          ) : null}
          <UserAvatar user={item.actor} size="sm" className="mt-0.5 size-7" />
          <div className="min-w-0 flex-1 text-sm">
            <ActivitySentence item={item} />
            <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)} className="text-xs text-muted-foreground">
              {formatRelative(item.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function EntityLink({ type, id, name }: { type: ActivityItem["entityType"]; id: string; name: string }) {
  const href = entityHref(type, id);
  if (!href) return <span className="font-medium">{name}</span>;
  return (
    <Link href={href} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

export function ActivitySentence({ item }: { item: ActivityItem }) {
  const actor = item.actor ? (
    <Link href={`/team/${item.actor.id}`} className="font-medium hover:underline">
      {item.actor.name}
    </Link>
  ) : (
    <span className="font-medium">System</span>
  );

  if (item.message && !item.entityName) {
    return (
      <p className="leading-snug">
        {actor} <span className="text-muted-foreground">{item.message}</span>
      </p>
    );
  }

  return (
    <p className="leading-snug">
      {actor} <span className="text-muted-foreground">{item.action}</span>{" "}
      <EntityLink type={item.entityType} id={item.entityId} name={item.entityName} />
      {item.target ? (
        <>
          {" "}
          <span className="text-muted-foreground">to</span>{" "}
          <EntityLink type={item.target.type} id={item.target.id} name={item.target.name} />
        </>
      ) : null}
      .
    </p>
  );
}
