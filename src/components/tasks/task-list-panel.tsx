"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/forms/select-field";
import { DataPagination } from "@/components/shared/data-pagination";
import { TableSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFAULT_PAGE_SIZE, PRIORITY_META, TASK_STATUS_META } from "@/lib/constants";
import type { TaskFilters } from "@/lib/services/tasks";
import { PRIORITIES, TASK_STATUSES, type Priority, type TaskStatus } from "@/types/domain";
import { TaskTable, type TaskSortKey } from "./task-table";

interface TaskListPanelProps {
  /** Fixed filters that the user can't change (e.g. projectId, assigneeId: "me"). */
  baseFilters?: TaskFilters;
  initialStatus?: TaskStatus | null;
  initialOverdue?: boolean;
  /** Filter by project (the projects the user can see). */
  showProjectFilter?: boolean;
  showProject?: boolean;
  /** Which deadline the table shows and sorts by first. */
  deadline?: "dueDate" | "qaDueDate";
  emptyTitle?: string;
}

/** Task table with search, filters, server-side sorting and pagination. */
export function TaskListPanel({
  baseFilters = {},
  initialStatus = null,
  initialOverdue = false,
  showProjectFilter = true,
  showProject = false,
  deadline = "dueDate",
  emptyTitle = "No tasks match these filters.",
}: TaskListPanelProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | null>(initialStatus);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [overdue, setOverdue] = useState(initialOverdue);
  const [sort, setSort] = useState<{ sortBy: TaskSortKey; sortOrder: "asc" | "desc" }>({ sortBy: deadline, sortOrder: "asc" });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const projects = useProjects({ sortBy: "name", sortOrder: "asc", pageSize: 200 });

  // Bugs fold under their task, unless a filter is narrowing the list (then a matching bug
  // shouldn't disappear because its task was filtered out).
  const nestIssues = baseFilters.assigneeId === "me" && !debouncedSearch.trim() && !status && !priority && !overdue;

  const filters: TaskFilters = useMemo(
    () => ({
      ...baseFilters,
      nestIssues: nestIssues || undefined,
      search: debouncedSearch.trim() || undefined,
      status: status ?? undefined,
      priority: priority ?? undefined,
      projectId: projectId ?? baseFilters.projectId,
      overdue: overdue || undefined,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    [baseFilters, nestIssues, debouncedSearch, status, priority, projectId, overdue, sort, page],
  );
  const query = useTasks(filters);

  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };
  const hasFilters = Boolean(search || status || priority || projectId || overdue);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter tasks">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => reset(setSearch)(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="pl-8"
          />
        </div>
        <SelectField
          id="filter-status"
          aria-label="Filter by status"
          className="w-40"
          value={status}
          onChange={(v) => reset(setStatus)(v as TaskStatus | null)}
          noneLabel="All statuses"
          options={TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_META[s].label }))}
        />
        <SelectField
          id="filter-priority"
          aria-label="Filter by priority"
          className="w-36"
          value={priority}
          onChange={(v) => reset(setPriority)(v as Priority | null)}
          noneLabel="All priorities"
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
        />
        {showProjectFilter ? (
          <SelectField
            id="filter-project"
            aria-label="Filter by project"
            className="w-48"
            value={projectId}
            onChange={reset(setProjectId)}
            noneLabel="All projects"
            options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        ) : null}
        <div className="flex items-center gap-2 px-1">
          <Switch id="filter-overdue" checked={overdue} onCheckedChange={reset(setOverdue)} />
          <Label htmlFor="filter-overdue" className="font-normal">
            Overdue only
          </Label>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatus(null);
              setPriority(null);
              setProjectId(null);
              setOverdue(false);
              setPage(1);
            }}
          >
            <X /> Clear
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <TableSkeleton columns={7} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load tasks." onRetry={() => void query.refetch()} />
      ) : (
        <>
          <TaskTable
            tasks={query.data?.items ?? []}
            sort={sort}
            onSortChange={(s) => {
              setSort(s);
              setPage(1);
            }}
            showProject={showProject}
            deadline={deadline}
            emptyTitle={hasFilters ? "No tasks match these filters." : emptyTitle}
          />
          {query.data ? (
            <DataPagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              total={query.data.total}
              pageSize={query.data.pageSize}
              onPageChange={setPage}
              isFetching={query.isFetching}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
