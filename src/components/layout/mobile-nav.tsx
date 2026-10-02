"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/queries/use-misc";
import { cn } from "@/lib/utils";
import { isNavItemActive, MOBILE_NAV } from "./nav-config";
import { Brand, SidebarNav } from "./sidebar";

/** Hamburger that opens the full navigation in a sheet (mobile only). */
export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto p-3">
        <SheetHeader className="p-0 pb-2">
          <SheetTitle asChild>
            <div>
              <Brand />
            </div>
          </SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/** Bottom tab bar on phones: My Day, Tasks, Notifications, Projects. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: unread = 0 } = useUnreadCount();
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-0.5 py-2 text-[11px] outline-none focus-visible:bg-muted",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
            {item.href === "/notifications" && unread > 0 ? (
              <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground" aria-label={`${unread} unread`}>
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
