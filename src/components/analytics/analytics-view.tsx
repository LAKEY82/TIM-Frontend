"use client";

import { subDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Eye, FolderCheck, FolderKanban } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { SelectField } from "@/components/forms/select-field";
import { ProjectAnalytics } from "@/components/projects/project-sections";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCardsSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { WorkloadList } from "@/components/teams/workload-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyAnalytics, useTaskAnalytics, useWorkload } from "@/hooks/queries/use-misc";
import { useDepartments } from "@/hooks/queries/use-people";
import { useProjects } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { PRIORITY_META, TASK_TYPE_LABELS } from "@/lib/constants";
import { formatHours, toISODate } from "@/lib/format";
import type { AnalyticsRange } from "@/lib/services/analytics";
import { DepartmentAnalyticsPanel } from "./department-analytics";
import {
  ActivityChart,
  CountBarChart,
  DepartmentWorkloadChart,
  ProjectProgressChart,
  ProjectStatusChart,
  TaskStatusChart,
  TrendChart,
  WorkloadChart,
} from "./lazy-charts";

const TABS = ["company", "projects", "departments", "team", "tasks"] as const;
type Tab = (typeof TABS)[number];
const RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 12 months" },
];

export function AnalyticsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canCompany = usePermission("analytics:company");
  const requested = params.get("tab");
  const tabs = TABS.filter((t) => t !== "company" || canCompany);
  const tab: Tab = (tabs as readonly string[]).includes(requested ?? "") ? (requested as Tab) : tabs[0] ?? "projects";
  const [days, setDays] = useState("90");
  const range: AnalyticsRange = useMemo(() => ({ from: toISODate(subDays(new Date(), Number(days))), to: toISODate(new Date()) }), [days]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Factual delivery and workload figures from live project data."
        actions={<SelectField id="analytics-range" aria-label="Date range" className="w-40" value={days} onChange={(v) => setDays(v ?? "90")} options={RANGES} />}
      />
      <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })} className="gap-5">
        <TabsList className="max-w-full relative overflow-x-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        {canCompany ? (
          <TabsContent value="company">
            <CompanyAnalyticsTab range={range} />
          </TabsContent>
        ) : null}
        <TabsContent value="projects">
          <ProjectsAnalyticsTab />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentsAnalyticsTab range={range} />
        </TabsContent>
        <TabsContent value="team">
          <TeamAnalyticsTab />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksAnalyticsTab range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyAnalyticsTab({ range }: { range: AnalyticsRange }) {
  const query = useCompanyAnalytics(range);
  const d = query.data;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load company analytics." onRetry={() => void query.refetch()} />;
  return (
    <div className="space-y-4">
      {query.isLoading || !d ? (
        <StatCardsSkeleton />
      ) : (
        <section aria-label="Company figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Active projects" value={d.summary.activeProjects} icon={FolderKanban} href="/projects?status=ACTIVE" />
          <StatCard label="Completed projects" value={d.summary.completedProjects} icon={FolderCheck} href="/projects?status=COMPLETED" />
          <StatCard label="At risk" value={d.summary.atRiskProjects} icon={AlertTriangle} href="/projects?status=AT_RISK" tone={d.summary.atRiskProjects ? "critical" : "default"} />
          <StatCard label="Overdue" value={d.summary.overdueTasks} icon={Clock} href="/tasks?scope=all&overdue=true" tone={d.summary.overdueTasks ? "warning" : "default"} />
          <StatCard label="Completed tasks" value={d.summary.completedTasks} icon={CheckCircle2} />
          <StatCard label="In review" value={d.summary.inReviewTasks} icon={Eye} href="/tasks?scope=all&status=IN_REVIEW" />
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <ProjectStatusChart data={d?.projectStatus ?? []} isLoading={query.isLoading} />
        <TaskStatusChart data={d?.taskStatus ?? []} isLoading={query.isLoading} />
        <ActivityChart data={d?.weeklyActivity ?? []} isLoading={query.isLoading} />
        <DepartmentWorkloadChart data={d?.departmentWorkload ?? []} isLoading={query.isLoading} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProjectProgressChart data={d?.projectProgress ?? []} isLoading={query.isLoading} />
        <TrendChart
          title="Review cycle"
          description="Average hours from submission to decision"
          valueLabel="Avg. hours"
          valueFormatter={formatHours}
          data={(d?.reviewCycle ?? []).map((r) => ({ date: r.date, value: r.averageHours }))}
          isLoading={query.isLoading}
        />
      </div>
    </div>
  );
}

function ProjectsAnalyticsTab() {
  const projects = useProjects({ pageSize: 200, sortBy: "name", sortOrder: "asc" });
  const [projectId, setProjectId] = useState<string | null>(null);
  const list = projects.data?.items ?? [];
  const selected = projectId ?? list[0]?.id ?? null;

  if (projects.isError) return <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />;
  return (
    <div className="space-y-4">
      <ProjectProgressChart
        title="Progress across projects"
        data={list.filter((p) => p.status !== "CANCELLED").map((p) => ({ projectId: p.id, name: p.name, progress: p.progress, status: p.status }))}
        isLoading={projects.isLoading}
      />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Project</span>
        <SelectField id="analytics-project" aria-label="Project" className="w-64" value={selected} onChange={setProjectId} options={list.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" />
      </div>
      {selected ? <ProjectAnalytics key={selected} projectId={selected} /> : !projects.isLoading ? <EmptyState title="No projects yet." /> : null}
    </div>
  );
}

function DepartmentsAnalyticsTab({ range }: { range: AnalyticsRange }) {
  const departments = useDepartments();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const selected = departmentId ?? departments.data?.[0]?.id ?? null;
  if (departments.isError) return <ErrorState error={departments.error} onRetry={() => void departments.refetch()} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Department</span>
        <SelectField
          id="analytics-department"
          aria-label="Department"
          className="w-56"
          value={selected}
          onChange={setDepartmentId}
          options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
          placeholder={departments.isLoading ? "Loading…" : "Select department"}
        />
      </div>
      {selected ? <DepartmentAnalyticsPanel key={selected} departmentId={selected} range={range} /> : !departments.isLoading ? <EmptyState title="No departments yet." /> : null}
    </div>
  );
}

function TeamAnalyticsTab() {
  const workload = useWorkload({});
  return (
    <div className="space-y-4">
      <WorkloadChart data={workload.data ?? []} isLoading={workload.isLoading} error={workload.error} onRetry={() => void workload.refetch()} />
      <SectionCard title="Workload by person" description="Assigned work, estimates and blockers. No performance scoring.">
        <WorkloadList items={workload.data} isLoading={workload.isLoading} error={workload.error} onRetry={() => void workload.refetch()} />
      </SectionCard>
    </div>
  );
}

function TasksAnalyticsTab({ range }: { range: AnalyticsRange }) {
  const query = useTaskAnalytics(range);
  const d = query.data;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load task analytics." onRetry={() => void query.refetch()} />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityChart title="Task completion" data={d?.completion ?? []} isLoading={query.isLoading} />
        <TaskStatusChart data={d?.taskStatus ?? []} isLoading={query.isLoading} />
        <TrendChart title="Overdue tasks" valueLabel="Overdue" data={(d?.overdueTrend ?? []).map((p) => ({ date: p.date, value: p.count }))} isLoading={query.isLoading} />
        <TrendChart title="Blocked tasks" valueLabel="Blocked" data={(d?.blockedTrend ?? []).map((p) => ({ date: p.date, value: p.count }))} isLoading={query.isLoading} />
        <CountBarChart title="By priority" valueLabel="Tasks" items={(d?.byPriority ?? []).map((p) => ({ label: PRIORITY_META[p.key].label, count: p.count }))} isLoading={query.isLoading} />
        <CountBarChart title="By type" valueLabel="Tasks" items={(d?.byType ?? []).map((p) => ({ label: TASK_TYPE_LABELS[p.key], count: p.count }))} isLoading={query.isLoading} />
      </div>
      <TrendChart
        title="Review cycle"
        description="Average hours from submission to review decision"
        valueLabel="Avg. hours"
        valueFormatter={formatHours}
        data={(d?.reviewCycle ?? []).map((r) => ({ date: r.date, value: r.averageHours }))}
        isLoading={query.isLoading}
      />
    </div>
  );
}
