"use client";

import {
  AlarmClock,
  AtSign,
  CalendarClock,
  CheckCircle2,
  Eye,
  FolderKanban,
  RotateCcw,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { NOTIFICATION_LABELS } from "@/lib/constants";
import { entityHref } from "@/lib/entity-links";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/domain";

const ICONS: Record<NotificationType, LucideIcon> = {
  TASK_ASSIGNED: UserPlus,
  REVIEW_REQUESTED: Eye,
  TASK_APPROVED: CheckCircle2,
  CHANGES_REQUESTED: RotateCcw,
  DEADLINE_APPROACHING: AlarmClock,
  MENTION: AtSign,
  PROJECT_UPDATE: FolderKanban,
  MEETING_INVITE: CalendarClock,
};

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onNavigate?: () => void;
}

export function NotificationItem({ notification, onRead, onNavigate }: NotificationItemProps) {
  const router = useRouter();
  const Icon = ICONS[notification.type];
  const href = entityHref(notification.entityType, notification.entityId);

  const activate = () => {
    if (!notification.read) onRead(notification.id);
    if (href) {
      onNavigate?.();
      router.push(href);
    }
  };

  return (
    <button
      type="button"
      onClick={activate}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        !notification.read && "bg-primary/[0.04]",
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {NOTIFICATION_LABELS[notification.type]}
        </span>
        <span className={cn("block text-sm leading-snug", !notification.read && "font-medium")}>{notification.title}</span>
        {notification.body ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span> : null}
        <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)} className="mt-1 block text-xs text-muted-foreground">
          {formatRelative(notification.createdAt)}
        </time>
      </span>
      {!notification.read ? (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" role="img" />
      ) : null}
    </button>
  );
}
