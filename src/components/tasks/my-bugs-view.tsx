"use client";

import { Bug, CheckCheck, FolderKanban, Loader2, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SelectField } from "@/components/forms/select-field";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTasks, useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PRIORITY_META } from "@/lib/constants";
import type { TaskFilters } from "@/lib/services/tasks";
import { PRIORITIES, TASK_STATUSES, type ID, type Priority, type TaskStatus, type TaskSummary } from "@/types/domain";
import { BugEditDialog } from "./bug-edit-dialog";
import { TaskDueDatePicker, TaskPriorityPicker } from "./inline-pickers";
import { QaIssueBadge } from "./qa-issue";
import { ReportBugDialog } from "./report-bug-dialog";
import { RequestChangesDialog } from "./request-changes-dialog";
import { TaskAssignee } from "./task-assignee";
import { TaskStatusBadge } from "./task-status-badge";

type View = "verify" | "open" | "fixed" | "all";

/** Matches the API's done statuses: a fixed bug is completed, tested or approved. */
const FIXED: readonly TaskStatus[] = ["COMPLETED", "TESTED", "APPROVED"];
const OPEN = TASK_STATUSES.filter((s) => !FIXED.includes(s));
/** The developer sent the fix back: the QA verifies it or reopens the bug. */
const TO_VERIFY: readonly TaskStatus[] = ["IN_REVIEW", "IN_QA"];
/** The API's largest page for tasks: the page groups every bug by project, so it loads them all at once. */
const ALL_BUGS = 500;

const STATUSES: Record<View, readonly TaskStatus[] | undefined> = { verify: TO_VERIFY, open: OPEN, fixed: FIXED, all: undefined };

const EMPTY: Record<View, string> = {
  verify: "No fixes waiting for you. Bugs appear here when the developer sends them for review.",
  open: "No open bugs. Everything you reported is fixed.",
  fixed: "No fixed bugs yet.",
  all: "You haven't reported any bugs yet.",
};

interface ProjectGroup {
  id: ID;
  name: string;
  bugs: TaskSummary[];
  toVerify: number;
}

/** Groups bugs by project (alphabetically), keeping the API's order (earliest fix-by date first) inside each. */
function groupByProject(bugs: TaskSummary[]): ProjectGroup[] {
  const groups = new Map<ID, ProjectGroup>();
  for (const bug of bugs) {
    const id = bug.project?.id ?? "none";
    const group = groups.get(id) ?? { id, name: bug.project?.name || "No project", bugs: [], toVerify: 0 };
    group.bugs.push(bug);
    if (TO_VERIFY.includes(bug.status)) group.toVerify += 1;
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * /my-bugs: every issue a QA tester reported or tests, grouped by project.
 * QA set each bug's priority and fix-by date, edit the report, and verify the
 * developer's fix (or reopen the bug) once it's sent for review.
 */
export function MyBugsView() {
  const [view, setView] = useState<View>("open");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority | null>(null);
  const [overdue, setOverdue] = useState(false);
  const [editing, setEditing] = useState<ID | null>(null);
  const [reopening, setReopening] = useState<TaskSummary | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: TaskFilters = useMemo(
    () => ({
      qaBugs: true,
      status: STATUSES[view],
      search: debouncedSearch.trim() || undefined,
      priority: priority ?? undefined,
      overdue: overdue || undefined,
      // Most urgent first; fixed bugs most recent first.
      sortBy: view === "fixed" ? "createdAt" : "dueDate",
      sortOrder: view === "fixed" ? "desc" : "asc",
      pageSize: ALL_BUGS,
    }),
    [view, debouncedSearch, priority, overdue],
  );
  const query = useTasks(filters);
  // The "To verify" count shows on its tab whichever view is open.
  const verifyCount = useTasks({ qaBugs: true, status: TO_VERIFY, pageSize: 1 }).data?.total ?? 0;
  const groups = useMemo(() => groupByProject(query.data?.items ?? []), [query.data]);
  const hasFilters = Boolean(search || priority || overdue);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My bugs"
        description="Issues you reported or test as QA, by project. Set when each must be fixed by, keep the report up to date, and verify fixes the developer sends back."
        actions={
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Which bugs">
              <ToggleGroupItem value="verify" aria-label={`To verify (${verifyCount})`}>
                To verify
                {verifyCount ? <Badge className="h-4 min-w-4 px-1 text-[10px] tabular-nums">{verifyCount}</Badge> : null}
              </ToggleGroupItem>
              <ToggleGroupItem value="open">Open</ToggleGroupItem>
              <ToggleGroupItem value="fixed">Fixed</ToggleGroupItem>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Plus /> Report bug
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter bugs">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bugs…" aria-label="Search bugs" className="pl-8" />
        </div>
        <SelectField
          id="bugs-priority"
          aria-label="Filter by priority"
          className="w-36"
          value={priority}
          onChange={(v) => setPriority(v as Priority | null)}
          noneLabel="All priorities"
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
        />
        <div className="flex items-center gap-2 px-1">
          <Switch id="bugs-overdue" checked={overdue} onCheckedChange={setOverdue} />
          <Label htmlFor="bugs-overdue" className="font-normal">
            Past fix-by date
          </Label>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setPriority(null);
              setOverdue(false);
            }}
          >
            <X /> Clear
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <TableSkeleton columns={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load your bugs." onRetry={() => void query.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Bug} title={hasFilters ? "No bugs match these filters." : EMPTY[view]} />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <ProjectBugs key={group.id} group={group} onEdit={setEditing} onReopen={setReopening} />
          ))}
          {query.data && query.data.total > query.data.items.length ? (
            <p className="text-sm text-muted-foreground">
              Showing the first {query.data.items.length} of {query.data.total} bugs. Use the filters to narrow them down.
            </p>
          ) : null}
        </div>
      )}

      <ReportBugDialog open={reportOpen} onOpenChange={setReportOpen} />
      <BugEditDialog bugId={editing} onOpenChange={(open) => !open && setEditing(null)} />
      {reopening ? (
        <RequestChangesDialog taskId={reopening.id} taskTitle={reopening.title} open onOpenChange={(open) => !open && setReopening(null)} />
      ) : null}
    </div>
  );
}

function ProjectBugs({ group, onEdit, onReopen }: { group: ProjectGroup; onEdit: (id: ID) => void; onReopen: (bug: TaskSummary) => void }) {
  const headingId = `bugs-project-${group.id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <FolderKanban className="size-4 text-muted-foreground" aria-hidden />
        <h2 id={headingId} className="text-sm font-semibold">
          {group.id === "none" ? (
            group.name
          ) : (
            <Link href={`/projects/${group.id}`} className="hover:underline">
              {group.name}
            </Link>
          )}
        </h2>
        <span className="text-xs text-muted-foreground">
          {group.bugs.length} bug{group.bugs.length === 1 ? "" : "s"}
        </span>
        {group.toVerify ? (
          <Badge variant="outline" className="border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {group.toVerify} to verify
          </Badge>
        ) : null}
      </div>
      <div className="relative overflow-x-auto rounded-lg border">
        <Table className="min-w-[880px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[34%]">Bug</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fix by</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.bugs.map((bug) => (
              <BugRow key={bug.id} bug={bug} onEdit={() => onEdit(bug.id)} onReopen={() => onReopen(bug)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function BugRow({ bug, onEdit, onReopen }: { bug: TaskSummary; onEdit: () => void; onReopen: () => void }) {
  const status = useUpdateTaskStatus();
  const toVerify = TO_VERIFY.includes(bug.status);
  return (
    <TableRow className={toVerify ? "bg-violet-500/5" : undefined}>
      <TableCell className="max-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {bug.issueKind ? <QaIssueBadge kind={bug.issueKind} className="shrink-0" /> : null}
          <Link href={`/tasks/${bug.id}`} className="truncate font-medium hover:underline">
            {bug.title}
          </Link>
        </div>
        {bug.parent ? (
          <p className="truncate text-xs text-muted-foreground">
            Found in{" "}
            <Link href={`/tasks/${bug.parent.id}`} className="hover:underline">
              {bug.parent.name}
            </Link>
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <TaskAssignee user={bug.assignee} emptyLabel="Unassigned" className="max-w-40" />
      </TableCell>
      <TableCell>
        <TaskPriorityPicker task={bug} />
      </TableCell>
      <TableCell>
        <TaskStatusBadge status={bug.status} />
      </TableCell>
      <TableCell>
        <TaskDueDatePicker task={bug} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {toVerify ? (
            <>
              {/* Reopening needs written feedback; from QA testing, the bug's own page has the QA actions. */}
              {bug.status === "IN_REVIEW" ? (
                <Button type="button" variant="outline" size="sm" onClick={onReopen} disabled={status.isPending}>
                  <RotateCcw /> Reopen
                </Button>
              ) : null}
              <Button type="button" size="sm" onClick={() => status.mutate({ id: bug.id, status: "APPROVED" })} disabled={status.isPending}>
                {status.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                Verify fix
              </Button>
            </>
          ) : null}
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${bug.title}`} onClick={onEdit}>
            <Pencil />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
