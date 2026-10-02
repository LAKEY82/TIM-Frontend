"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { StatCardsSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { useDepartmentAnalytics } from "@/hooks/queries/use-misc";
import type { AnalyticsRange } from "@/lib/services/analytics";
import type { ID } from "@/types/domain";
import { ActivityChart, CountBarChart, TaskStatusChart, WorkloadChart } from "./lazy-charts";

/**
 * Department analytics. Metric cards come from the API as a keyed list, so
 * each department shows its own figures (Development: bugs; QA: open/resolved
 * bugs and severity; Marketing: campaign/content tasks; Design: design tasks).
 */
export function DepartmentAnalyticsPanel({ departmentId, range = {} }: { departmentId: ID; range?: AnalyticsRange }) {
  const query = useDepartmentAnalytics(departmentId, range);
  const a = query.data;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load department analytics." onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      {query.isLoading || !a ? (
        <StatCardsSkeleton count={5} />
      ) : a.metrics.length > 0 ? (
        <section aria-label={`${a.departmentName} figures`} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {a.metrics.map((m) => (
            <StatCard key={m.key} label={m.label} value={m.value} />
          ))}
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskStatusChart data={a?.taskStatus ?? []} isLoading={query.isLoading} />
        <ActivityChart title="Task activity" data={a?.activity ?? []} isLoading={query.isLoading} />
      </div>
      {a && a.breakdowns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {a.breakdowns.map((b) => (
            <CountBarChart key={b.key} title={b.label} items={b.items.map((i) => ({ label: i.key, count: i.count }))} />
          ))}
        </div>
      ) : null}
      <WorkloadChart data={a?.workload ?? []} isLoading={query.isLoading} />
    </div>
  );
}
