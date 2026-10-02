"use client";

import { BellOff, CheckCheck } from "lucide-react";
import { useState } from "react";
import { DataPagination } from "@/components/shared/data-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadCount } from "@/hooks/queries/use-misc";
import { NotificationItem } from "./notification-item";

export function NotificationsView() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const query = useNotifications({ page, unreadOnly: filter === "unread" || undefined });
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "You're all caught up."}
        actions={
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={filter} onValueChange={(v) => { if (v) { setFilter(v as "all" | "unread"); setPage(1); } }} aria-label="Filter notifications">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" variant="outline" onClick={() => markAll.mutate()} disabled={unread === 0 || markAll.isPending}>
              <CheckCheck /> Mark all read
            </Button>
          </>
        }
      />
      {query.isLoading ? (
        <ListSkeleton rows={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load notifications." onRetry={() => void query.refetch()} />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={BellOff} title={filter === "unread" ? "No unread notifications." : "No notifications."} />
      ) : (
        <>
          <div className="divide-y rounded-lg border p-1">
            {query.data?.items.map((n) => <NotificationItem key={n.id} notification={n} onRead={(id) => markRead.mutate(id)} />)}
          </div>
          {query.data ? (
            <DataPagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} pageSize={query.data.pageSize} onPageChange={setPage} isFetching={query.isFetching} />
          ) : null}
        </>
      )}
    </div>
  );
}
