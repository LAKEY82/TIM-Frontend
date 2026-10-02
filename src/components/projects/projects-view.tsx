"use client";

import { CalendarDays, FolderKanban, GanttChart, Kanban, LayoutGrid, List, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/forms/select-field";
import { CalendarView, calendarRange, type CalendarMode } from "@/components/shared/calendar-view";
import { DataPagination } from "@/components/shared/data-pagination";
import { GanttTimeline, type TimelineZoom } from "@/components/shared/gantt-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMilestones, useProjects } from "@/hooks/queries/use-projects";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { milestoneEvents, projectDeadlineEvents, projectTimelineRows } from "@/lib/schedule";
import type { ProjectFilters } from "@/lib/services/projects";
import { PROJECT_STATUSES, type Project, type ProjectStatus, type SortDirection } from "@/types/domain";
import { ProjectCard } from "./project-card";
import { ProjectCreateButton } from "./project-create-modal";
import { ProjectStatusBadge } from "./project-status-badge";
import { ProjectTable } from "./project-table";

type View = "grid" | "list" | "kanban" | "calendar" | "timeline";
const VIEWS: { value: View; label: string; icon: typeof List }[] = [
  { value: "grid", label: "Cards", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "kanban", label: "Kanban", icon: Kanban },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
  { value: "timeline", label: "Timeline", icon: GanttChart },
];

function isProjectStatus(v: string | null): v is ProjectStatus {
  return v !== null && (PROJECT_STATUSES as readonly string[]).includes(v);
}

export function ProjectsView() {
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | null>(isProjectStatus(initialStatus) ? initialStatus : null);
  const [sort, setSort] = useState<{ sortBy: NonNullable<ProjectFilters["sortBy"]>; sortOrder: SortDirection }>({ sortBy: "deadline", sortOrder: "asc" });
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  // Board/calendar/timeline need the whole (filtered) set; list/grid paginate.
  const paged = view === "grid" || view === "list";
  const filters: ProjectFilters = {
    search: debounced.trim() || undefined,
    status: status ?? undefined,
    ...sort,
    page: paged ? page : 1,
    pageSize: paged ? 24 : 200,
  };
  const query = useProjects(filters);
  const projects = query.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Projects" description={query.data ? `${query.data.total} project${query.data.total === 1 ? "" : "s"}` : undefined} actions={<ProjectCreateButton />} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="pl-8"
          />
        </div>
        <SelectField
          id="project-status-filter"
          aria-label="Filter by status"
          className="w-40"
          value={status}
          onChange={(v) => {
            setStatus(v as ProjectStatus | null);
            setPage(1);
          }}
          noneLabel="All statuses"
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_META[s].label }))}
        />
        <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Project view" className="ml-auto">
          {VIEWS.map((v) => (
            <ToggleGroupItem key={v.value} value={v.value} aria-label={v.label} title={v.label}>
              <v.icon />
              <span className="hidden lg:inline">{v.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {query.isLoading ? (
        view === "list" ? <TableSkeleton columns={7} /> : <CardGridSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load projects." onRetry={() => void query.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={debounced || status ? "No projects match these filters." : "No projects yet."}
          description={debounced || status ? undefined : "Create the first project to start planning work."}
          action={debounced || status ? undefined : <ProjectCreateButton />}
        />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : view === "list" ? (
        <ProjectTable projects={projects} sortBy={sort.sortBy} sortOrder={sort.sortOrder} onSortChange={(sortBy, sortOrder) => setSort({ sortBy, sortOrder })} />
      ) : view === "kanban" ? (
        <ProjectStatusBoard projects={projects} />
      ) : view === "calendar" ? (
        <ProjectsCalendar projects={projects} />
      ) : (
        <ProjectsTimeline projects={projects} />
      )}

      {paged && query.data && !query.isError ? (
        <DataPagination
          page={query.data.page}
          totalPages={query.data.totalPages}
          total={query.data.total}
          pageSize={query.data.pageSize}
          onPageChange={setPage}
          isFetching={query.isFetching}
        />
      ) : null}
    </div>
  );
}

function ProjectStatusBoard({ projects }: { projects: Project[] }) {
  return (
    <div className="-mx-4 flex gap-3 relative overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      {PROJECT_STATUSES.map((status) => {
        const items = projects.filter((p) => p.status === status);
        return (
          <section key={status} aria-label={`${PROJECT_STATUS_META[status].label}, ${items.length} projects`} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/30 p-2">
            <header className="flex items-center justify-between px-1 py-1">
              <ProjectStatusBadge status={status} />
              <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
            </header>
            {items.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">No projects</p> : items.map((p) => <ProjectCard key={p.id} project={p} compact />)}
          </section>
        );
      })}
    </div>
  );
}

function ProjectsCalendar({ projects }: { projects: Project[] }) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const range = calendarRange(mode, cursor);
  const milestones = useMilestones({ from: range.from, to: range.to });
  const ids = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const events = useMemo(
    () => [...projectDeadlineEvents(projects), ...milestoneEvents((milestones.data ?? []).filter((m) => ids.has(m.projectId)))],
    [projects, milestones.data, ids],
  );
  return <CalendarView mode={mode} cursor={cursor} onModeChange={setMode} onCursorChange={setCursor} events={events} isFetching={milestones.isFetching} />;
}

function ProjectsTimeline({ projects }: { projects: Project[] }) {
  const [zoom, setZoom] = useState<TimelineZoom>("month");
  const milestones = useMilestones({});
  const rows = useMemo(
    () => projects.flatMap((p) => projectTimelineRows(p, (milestones.data ?? []).filter((m) => m.projectId === p.id), [])),
    [projects, milestones.data],
  );
  return <GanttTimeline rows={rows} zoom={zoom} onZoomChange={setZoom} />;
}
