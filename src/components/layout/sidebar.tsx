"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadCount } from "@/hooks/queries/use-misc";
import { useCan } from "@/hooks/use-permission";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_SECTIONS, type NavSection } from "./nav-config";

function useVisibleSections(): NavSection[] {
  const can = useCan();
  const { user } = useAuth();
  return useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => (!item.permissions || can(item.permissions, "any")) && (!item.when || (user ? item.when(user) : false))),
      })).filter((section) => section.items.length > 0),
    [can, user],
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        T
      </span>
      {!collapsed ? (
        <span className="truncate text-sm font-semibold tracking-tight">
          Theiavora <span className="font-normal text-muted-foreground">Management</span>
        </span>
      ) : (
        <span className="sr-only">Theiavora Management</span>
      )}
    </Link>
  );
}

interface SidebarNavProps {
  /** Icon-only rail (tablet). */
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const sections = useVisibleSections();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {sections.map((section, index) => (
        <div key={section.label ?? index} className="flex flex-col gap-0.5">
          {section.label && !collapsed ? (
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{section.label}</p>
          ) : null}
          {section.label && collapsed ? <div className="mx-2 mb-1 h-px bg-sidebar-border" aria-hidden /> : null}
          {section.items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const badge = item.href === "/notifications" && unread > 0 ? unread : null;
            const link = (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/75 outline-none transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
                {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                {badge ? (
                  <span
                    className={cn(
                      "ml-auto rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums",
                      collapsed && "absolute -top-0.5 right-0.5 ml-0",
                    )}
                    aria-label={`${badge} unread`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Desktop (lg+) full sidebar and tablet (md) icon rail. Hidden on mobile. */
export function Sidebar() {
  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-sidebar px-3 py-3 lg:flex scrollbar-thin">
        <div className="flex h-8 items-center">
          <Brand />
        </div>
        <SidebarNav />
      </aside>
      <aside className="sticky top-0 hidden h-svh w-14 shrink-0 flex-col items-stretch gap-4 overflow-y-auto border-r bg-sidebar px-2 py-3 md:flex lg:hidden">
        <div className="flex h-8 items-center justify-center">
          <Brand collapsed />
        </div>
        <SidebarNav collapsed />
      </aside>
    </>
  );
}
