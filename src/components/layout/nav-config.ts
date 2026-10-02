import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Settings,
  Sun,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Any of these permissions shows the item. Omit for everyone. */
  permissions?: readonly Permission[];
  /** Extra path prefixes that should mark the item active. */
  match?: readonly string[];
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Day", href: "/my-day", icon: Sun },
      { label: "My Tasks", href: "/tasks", icon: ListChecks, exact: true },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Timeline", href: "/timeline", icon: GanttChart, permissions: ["timeline:read"] },
      { label: "Teams", href: "/teams", icon: UsersRound, permissions: ["teams:read"], match: ["/team/"] },
      { label: "Clients", href: "/clients", icon: Briefcase, permissions: ["clients:read"] },
      { label: "Analytics", href: "/analytics", icon: BarChart3, permissions: ["analytics:read"], exact: true },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Daily Tasks", href: "/daily-tasks", icon: ClipboardList, permissions: ["daily_tasks:manage"] },
      { label: "Company Analytics", href: "/analytics?tab=company", icon: PieChart, permissions: ["analytics:company"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", href: "/settings/users", icon: Users, permissions: ["users:manage"] },
      { label: "Departments", href: "/settings/departments", icon: Building2, permissions: ["departments:manage"] },
      { label: "Settings", href: "/settings/profile", icon: Settings, match: ["/settings/profile", "/settings/company", "/settings/notifications", "/settings/appearance"] },
    ],
  },
];

/** Mobile bottom bar: the four most-used destinations for day-to-day work. */
export const MOBILE_NAV: NavItem[] = [
  { label: "My Day", href: "/my-day", icon: Sun },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Alerts", href: "/notifications", icon: Bell },
  { label: "Projects", href: "/projects", icon: FolderKanban },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const base = item.href.split("?")[0];
  if (item.href.includes("?")) return false; // query-param shortcuts never claim the active state
  if (item.exact ? pathname === base : pathname === base || pathname.startsWith(`${base}/`)) return true;
  return item.match?.some((m) => pathname.startsWith(m)) ?? false;
}
