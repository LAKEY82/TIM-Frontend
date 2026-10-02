"use client";

import { useMemo, useState } from "react";
import { SelectField } from "@/components/forms/select-field";
import { CalendarView, calendarRange, type CalendarMode } from "@/components/shared/calendar-view";
import { GanttTimeline, type TimelineZoom } from "@/components/shared/gantt-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMilestones, useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { usePermission } from "@/hooks/use-permission";
import { milestoneEvents, projectDeadlineEvents, projectTimelineRows, taskEvents } from "@/lib/schedule";

/** /calendar: tasks, deadlines and milestones in month / week / day views. */
export function GlobalCalendar() {
  const canSeeAll = usePermission(["tasks:read_all", "tasks:assign"], "any");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const range = calendarRange(mode, cursor);

  const tasks = useTasks({ dueFrom: range.from, dueTo: range.to, assigneeId: scope === "mine" ? "me" : undefined, pageSize: 500 });
  const milestones = useMilestones({ from: range.from, to: range.to });
  const projects = useProjects({ pageSize: 200 });

  const events = useMemo(() => {
    const inRange = (d: string | null | undefined) => Boolean(d && d.slice(0, 10) >= range.from && d.slice(0, 10) <= range.to);
    return [
      ...projectDeadlineEvents((projects.data?.items ?? []).filter((p) => inRange(p.deadline))),
      ...milestoneEvents(milestones.data ?? []),
      ...taskEvents(tasks.data?.items ?? []),
    ];
  }, [projects.data, milestones.data, tasks.data, range.from, range.to]);

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" description="Tasks, deadlines and milestones." />
      {tasks.isError ? (
        <ErrorState error={tasks.error} title="Unable to load calendar." onRetry={() => void tasks.refetch()} />
      ) : tasks.isLoading ? (
        <ChartSkeleton />
      ) : (
        <CalendarView
          mode={mode}
          cursor={cursor}
          onModeChange={setMode}
          onCursorChange={setCursor}
          events={events}
          isFetching={tasks.isFetching || milestones.isFetching}
          toolbarExtra={
            canSeeAll ? (
              <ToggleGroup type="single" variant="outline" size="sm" value={scope} onValueChange={(v) => v && setScope(v as "mine" | "all")} aria-label="Whose tasks">
                <ToggleGroupItem value="mine">My tasks</ToggleGroupItem>
                <ToggleGroupItem value="all">All</ToggleGroupItem>
              </ToggleGroup>
            ) : null
          }
        />
      )}
    </div>
  );
}

/** /timeline: Gantt of projects → milestones (→ tasks for one selected project). */
export function GlobalTimeline() {
  const [zoom, setZoom] = useState<TimelineZoom>("month");
  const [projectId, setProjectId] = useState<string | null>(null);
  const projects = useProjects({ pageSize: 200, sortBy: "deadline", sortOrder: "asc" });
  const milestones = useMilestones(projectId ? { projectId } : {});
  const tasks = useTasks({ projectId: projectId ?? undefined, pageSize: 500, sortBy: "dueDate", sortOrder: "asc" }, { enabled: Boolean(projectId) });

  const rows = useMemo(() => {
    const list = (projects.data?.items ?? []).filter((p) => p.status !== "CANCELLED" && (!projectId || p.id === projectId));
    return list.flatMap((p) =>
      projectTimelineRows(
        p,
        (milestones.data ?? []).filter((m) => m.projectId === p.id),
        projectId ? (tasks.data?.items ?? []) : [],
      ),
    );
  }, [projects.data, milestones.data, tasks.data, projectId]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timeline"
        description="Projects, milestones and tasks over time."
        actions={
          <SelectField
            id="timeline-project"
            aria-label="Focus on a project"
            className="w-56"
            value={projectId}
            onChange={setProjectId}
            noneLabel="All projects"
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        }
      />
      {projects.isLoading ? (
        <ChartSkeleton />
      ) : projects.isError ? (
        <ErrorState error={projects.error} title="Unable to load timeline." onRetry={() => void projects.refetch()} />
      ) : (
        <GanttTimeline rows={rows} zoom={zoom} onZoomChange={setZoom} emptyLabel="No projects to show." />
      )}
    </div>
  );
}
