"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCan } from "@/hooks/use-permission";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; permission?: Permission }[] = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/company", label: "Company", permission: "settings:company" },
  { href: "/settings/users", label: "Users", permission: "users:manage" },
  { href: "/settings/departments", label: "Departments", permission: "departments:manage" },
];

export function SettingsNav() {
  const pathname = usePathname();
  const can = useCan();
  return (
    <nav aria-label="Settings" className="-mx-4 relative overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {ITEMS.filter((i) => !i.permission || can(i.permission)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-muted font-medium" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
