"use client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Breadcrumbs, usePageTitle } from "./breadcrumbs";
import { CommandSearchTrigger } from "./command-search";
import { MobileMenuButton } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function Header() {
  const title = usePageTitle();
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-5">
      <MobileMenuButton />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <CommandSearchTrigger />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
