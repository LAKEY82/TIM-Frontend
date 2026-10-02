import type { CalendarEvent } from "@/components/shared/calendar-view";
import type { TimelineRow } from "@/components/shared/gantt-timeline";
import { DONE_STATUSES, MILESTONE_STATUS_META, PROJECT_STATUS_META, TASK_STATUS_META } from "@/lib/constants";
import type { Milestone, Project, TaskSummary } from "@/types/domain";

export function taskEvents(tasks: TaskSummary[]): CalendarEvent[] {
  return tasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.dueDate ?? "",
      kind: "TASK" as const,
      href: `/tasks/${t.id}`,
      subtitle: [t.project?.name, t.assignee?.name].filter(Boolean).join(" · ") || null,
      dotClass: TASK_STATUS_META[t.status].dot,
      done: DONE_STATUSES.includes(t.status),
    }));
}

export function milestoneEvents(milestones: Milestone[]): CalendarEvent[] {
  return milestones
    .filter((m) => m.dueDate)
    .map((m) => ({
      id: m.id,
      title: m.name,
      date: m.dueDate ?? "",
      kind: "MILESTONE" as const,
      href: `/projects/${m.projectId}/milestones`,
      subtitle: m.projectName ?? null,
      dotClass: MILESTONE_STATUS_META[m.status].dot,
      done: m.status === "COMPLETED",
    }));
}

export function projectDeadlineEvents(projects: Project[]): CalendarEvent[] {
  return projects
    .filter((p) => p.deadline)
    .map((p) => ({
      id: p.id,
      title: `${p.name} deadline`,
      date: p.deadline ?? "",
      kind: "PROJECT" as const,
      href: `/projects/${p.id}`,
      subtitle: p.client?.name ?? null,
      dotClass: PROJECT_STATUS_META[p.status].dot,
      done: p.status === "COMPLETED",
    }));
}

/** Project → its milestones → their tasks (tasks without a milestone last). */
export function projectTimelineRows(project: Project | null, milestones: Milestone[], tasks: TaskSummary[], depthOffset = 0): TimelineRow[] {
  const rows: TimelineRow[] = [];
  if (project) {
    rows.push({
      id: project.id,
      label: project.name,
      sublabel: project.client?.name ?? null,
      kind: "PROJECT",
      start: project.startDate,
      end: project.deadline,
      href: `/projects/${project.id}`,
      depth: depthOffset,
      barClass: "bg-[color:var(--series-1)]",
      progress: project.progress,
    });
  }
  const taskRow = (t: TaskSummary, depth: number): TimelineRow => ({
    id: t.id,
    label: t.title,
    sublabel: t.assignee?.name ?? null,
    kind: "TASK",
    start: t.startDate ?? t.dueDate,
    end: t.dueDate,
    href: `/tasks/${t.id}`,
    depth,
    barClass: TASK_STATUS_META[t.status].dot,
  });
  for (const m of milestones) {
    rows.push({
      id: m.id,
      label: m.name,
      sublabel: MILESTONE_STATUS_META[m.status].label,
      kind: "MILESTONE",
      start: m.startDate ?? m.dueDate,
      end: m.dueDate,
      href: `/projects/${m.projectId}/milestones`,
      depth: depthOffset + 1,
      barClass: "bg-[color:var(--series-2)]",
      progress: m.progress,
    });
    for (const t of tasks.filter((x) => x.milestone?.id === m.id)) rows.push(taskRow(t, depthOffset + 2));
  }
  const milestoneIds = new Set(milestones.map((m) => m.id));
  for (const t of tasks.filter((x) => !x.milestone || !milestoneIds.has(x.milestone.id))) rows.push(taskRow(t, depthOffset + 1));
  return rows;
}
