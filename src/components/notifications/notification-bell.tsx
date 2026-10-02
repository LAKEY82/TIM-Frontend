"use client";

import { Bell, BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ListSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/queries/use-misc";
import { NotificationItem } from "./notification-item";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();
  const list = useNotifications({ page: 1 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
          >
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[26rem]">
          <div className="p-1">
            {list.isLoading ? (
              <ListSkeleton rows={4} className="p-2" />
            ) : list.isError ? (
              <ErrorState error={list.error} title="Unable to load notifications." onRetry={() => void list.refetch()} compact />
            ) : !list.data || list.data.items.length === 0 ? (
              <EmptyState icon={BellOff} title="No notifications." description="You're all caught up." compact className="border-0" />
            ) : (
              list.data.items.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={(id) => markRead.mutate(id)} onNavigate={() => setOpen(false)} />
              ))
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-1">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
