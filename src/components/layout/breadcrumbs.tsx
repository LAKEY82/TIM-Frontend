"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const STATIC_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "my-day": "My Day",
  "my-bugs": "My Bugs",
  meetings: "Meetings",
  tasks: "Tasks",
  "daily-tasks": "Daily Tasks",
  projects: "Projects",
  calendar: "Calendar",
  timeline: "Timeline",
  teams: "Teams",
  team: "Team",
  clients: "Clients",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Profile",
  company: "Company",
  appearance: "Appearance",
  users: "Users",
  departments: "Departments",
  overview: "Overview",
  board: "Board",
  milestones: "Milestones",
  members: "Members",
  files: "Files",
  links: "Links",
  activity: "Activity",
};

/** Segments that have no page of their own and shouldn't be links. */
const NON_LINK_SEGMENTS = new Set(["team", "settings"]);

type LabelMap = Record<string, string>;
const BreadcrumbContext = createContext<{ labels: LabelMap; setLabel: (segment: string, label: string | null) => void } | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({});
  // Stable setter: consumers' effects must not re-run just because labels changed.
  const setLabel = useCallback(
    (segment: string, label: string | null) =>
      setLabels((prev) => {
        if (label === null) {
          if (!(segment in prev)) return prev;
          const next = { ...prev };
          delete next[segment];
          return next;
        }
        return prev[segment] === label ? prev : { ...prev, [segment]: label };
      }),
    [],
  );
  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/** Lets a detail page replace an ID segment with a readable name. */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined) {
  const ctx = useContext(BreadcrumbContext);
  const setLabel = ctx?.setLabel;
  useEffect(() => {
    if (!setLabel || !segment || !label) return;
    setLabel(segment, label);
    return () => setLabel(segment, null);
  }, [setLabel, segment, label]);
}

export function useBreadcrumbs() {
  const pathname = usePathname();
  const ctx = useContext(BreadcrumbContext);
  const labels = ctx?.labels ?? {};
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, i) => ({
    href: `/${segments.slice(0, i + 1).join("/")}`,
    label: labels[segment] ?? STATIC_LABELS[segment] ?? "…",
    linkable: !NON_LINK_SEGMENTS.has(segment),
  }));
}

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length <= 1) return null;
  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {last || !crumb.linkable ? (
                  <BreadcrumbPage className="max-w-48 truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="max-w-48 truncate">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** The header title: the deepest readable breadcrumb. */
export function usePageTitle(): string {
  const crumbs = useBreadcrumbs();
  const last = crumbs[crumbs.length - 1];
  return last?.label ?? "Dashboard";
}
