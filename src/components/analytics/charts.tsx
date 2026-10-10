"use client";

/**
 * Recharts-based chart components. Every chart receives API data via props;
 * none of them contain values of their own. Heavy: import through
 * `lazy-charts.tsx` so Recharts is code-split out of the initial bundle.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PROJECT_STATUS_META, TASK_STATUS_META } from "@/lib/constants";
import { formatHours, formatShortDate } from "@/lib/format";
import type {
  ActivityPoint,
  CountByKey,
  DepartmentWorkload,
  ProjectProgressPoint,
  ProjectStatus,
  TaskStatus,
  WorkloadEntry,
} from "@/types/domain";
import { AXIS_TICK, ChartCard, ChartTooltip, GRID_STROKE, SERIES } from "./chart-kit";

interface BaseChartProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  height?: number;
}

const CURSOR = { fill: "var(--muted)", opacity: 0.6 };

// ---------------------------------------------------------------------------
// Horizontal count bars (status, priority, type, breakdowns)
// ---------------------------------------------------------------------------

export function CountBarChart({
  items,
  title = "Breakdown",
  valueLabel = "Count",
  ...rest
}: BaseChartProps & { items: { label: string; count: number }[]; valueLabel?: string }) {
  const rows = items.filter((i) => i.count > 0 || items.length <= 8);
  const height = rest.height ?? Math.max(160, rows.length * 34 + 24);
  return (
    <ChartCard
      title={title}
      description={rest.description}
      rows={rows}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={height}
      columns={[
        { key: "label", label: "Category", render: (r) => r.label },
        { key: "count", label: valueLabel, align: "right", render: (r) => r.count },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip cursor={CURSOR} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} />} />
          <Bar dataKey="count" name={valueLabel} fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TaskStatusChart({ data, ...rest }: BaseChartProps & { data: CountByKey<TaskStatus>[] }) {
  return (
    <CountBarChart
      title={rest.title ?? "Task status"}
      valueLabel="Tasks"
      items={data.map((d) => ({ label: TASK_STATUS_META[d.key].label, count: d.count }))}
      {...rest}
    />
  );
}

export function ProjectStatusChart({ data, ...rest }: BaseChartProps & { data: CountByKey<ProjectStatus>[] }) {
  return (
    <CountBarChart
      title={rest.title ?? "Project status"}
      valueLabel="Projects"
      items={data.map((d) => ({ label: PROJECT_STATUS_META[d.key].label, count: d.count }))}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Activity over time (created vs completed)
// ---------------------------------------------------------------------------

export function ActivityChart({ data, ...rest }: BaseChartProps & { data: ActivityPoint[] }) {
  return (
    <ChartCard
      title={rest.title ?? "Weekly task activity"}
      description={rest.description}
      rows={data}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={rest.height ?? 240}
      legend={[
        { label: "Created", color: SERIES[1] },
        { label: "Completed", color: SERIES[2] },
      ]}
      columns={[
        { key: "date", label: "Period", render: (r) => formatShortDate(r.date) },
        { key: "created", label: "Created", align: "right", render: (r) => r.created },
        { key: "completed", label: "Completed", align: "right", render: (r) => r.completed },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="date" tickFormatter={(v: string) => formatShortDate(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} labelFormatter={(l) => formatShortDate(String(l))} />}
          />
          <Line type="monotone" dataKey="created" name="Created" stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
          <Line type="monotone" dataKey="completed" name="Completed" stroke={SERIES[2]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Single-series trend (overdue, blocked, review cycle)
// ---------------------------------------------------------------------------

export function TrendChart({
  data,
  valueLabel,
  valueFormatter = (v: number) => String(v),
  ...rest
}: BaseChartProps & { data: { date: string; value: number }[]; valueLabel: string; valueFormatter?: (v: number) => string }) {
  return (
    <ChartCard
      title={rest.title ?? valueLabel}
      description={rest.description}
      rows={data}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={rest.height ?? 200}
      columns={[
        { key: "date", label: "Period", render: (r) => formatShortDate(r.date) },
        { key: "value", label: valueLabel, align: "right", render: (r) => valueFormatter(r.value) },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="date" tickFormatter={(v: string) => formatShortDate(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => valueFormatter(v)} />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={valueFormatter} labelFormatter={(l) => formatShortDate(String(l))} />}
          />
          <Line type="monotone" dataKey="value" name={valueLabel} stroke={SERIES[1]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Department workload (assigned / completed / overdue)
// ---------------------------------------------------------------------------

export function DepartmentWorkloadChart({ data, ...rest }: BaseChartProps & { data: DepartmentWorkload[] }) {
  return (
    <ChartCard
      title={rest.title ?? "Department workload"}
      description={rest.description ?? "Open tasks assigned, completed and overdue per department"}
      rows={data}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={rest.height ?? 260}
      legend={[
        { label: "Assigned", color: SERIES[1] },
        { label: "Completed", color: SERIES[2] },
        { label: "Overdue", color: SERIES[3] },
      ]}
      columns={[
        { key: "name", label: "Department", render: (r) => r.departmentName },
        { key: "assigned", label: "Assigned", align: "right", render: (r) => r.assigned },
        { key: "completed", label: "Completed", align: "right", render: (r) => r.completed },
        { key: "overdue", label: "Overdue", align: "right", render: (r) => r.overdue },
        { key: "hours", label: "Est. hours", align: "right", render: (r) => formatHours(r.estimatedHours) },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="departmentName" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} height={36} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip cursor={CURSOR} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} />} />
          <Bar dataKey="assigned" name="Assigned" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="completed" name="Completed" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="overdue" name="Overdue" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// People workload (factual counts; never a "performance score")
// ---------------------------------------------------------------------------

export function WorkloadChart({ data: entries, ...rest }: BaseChartProps & { data: WorkloadEntry[] }) {
  // QA are counted on the subtasks they test, so say so next to their name.
  const data = entries.map((e) => (e.role === "QA" ? { ...e, name: `${e.name} (QA)` } : e));
  const height = rest.height ?? Math.max(180, data.length * 40 + 30);
  return (
    <ChartCard
      title={rest.title ?? "Team workload"}
      description={rest.description ?? "Tasks assigned, completed and overdue per person"}
      rows={data}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={height}
      legend={[
        { label: "Assigned", color: SERIES[1] },
        { label: "Completed", color: SERIES[2] },
        { label: "Overdue", color: SERIES[3] },
      ]}
      columns={[
        { key: "name", label: "Person", render: (r) => r.name },
        { key: "assigned", label: "Assigned", align: "right", render: (r) => r.assigned },
        { key: "hours", label: "Estimated", align: "right", render: (r) => formatHours(r.estimatedHours) },
        { key: "completed", label: "Completed", align: "right", render: (r) => r.completed },
        { key: "overdue", label: "Overdue", align: "right", render: (r) => r.overdue },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={110} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip cursor={CURSOR} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} />} />
          <Bar dataKey="assigned" name="Assigned" fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={10} />
          <Bar dataKey="completed" name="Completed" fill={SERIES[2]} radius={[0, 4, 4, 0]} maxBarSize={10} />
          <Bar dataKey="overdue" name="Overdue" fill={SERIES[3]} radius={[0, 4, 4, 0]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Project progress (percent complete)
// ---------------------------------------------------------------------------

export function ProjectProgressChart({ data, ...rest }: BaseChartProps & { data: ProjectProgressPoint[] }) {
  const rows = [...data].sort((a, b) => b.progress - a.progress).slice(0, 14);
  const height = rest.height ?? Math.max(180, rows.length * 30 + 30);
  return (
    <ChartCard
      title={rest.title ?? "Project progress"}
      description={rest.description}
      rows={rows}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={height}
      columns={[
        { key: "name", label: "Project", render: (r) => r.name },
        { key: "progress", label: "Progress", align: "right", render: (r) => `${r.progress}%` },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip cursor={CURSOR} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={(v) => `${v}%`} />} />
          <Bar dataKey="progress" name="Progress" fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Estimated vs actual hours
// ---------------------------------------------------------------------------

export function HoursChart({
  data,
  ...rest
}: BaseChartProps & { data: { name: string; estimatedHours: number; actualHours: number }[] }) {
  const height = rest.height ?? Math.max(180, data.length * 40 + 30);
  return (
    <ChartCard
      title={rest.title ?? "Estimated vs actual hours"}
      description={rest.description}
      rows={data}
      isLoading={rest.isLoading}
      error={rest.error}
      onRetry={rest.onRetry}
      className={rest.className}
      height={height}
      legend={[
        { label: "Estimated", color: SERIES[1] },
        { label: "Actual", color: SERIES[2] },
      ]}
      columns={[
        { key: "name", label: "Person", render: (r) => r.name },
        { key: "est", label: "Estimated", align: "right", render: (r) => formatHours(r.estimatedHours) },
        { key: "act", label: "Actual", align: "right", render: (r) => formatHours(r.actualHours) },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}h`} />
          <YAxis type="category" dataKey="name" width={110} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip cursor={CURSOR} content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueFormatter={formatHours} />} />
          <Bar dataKey="estimatedHours" name="Estimated" fill={SERIES[1]} radius={[0, 4, 4, 0]} maxBarSize={12} />
          <Bar dataKey="actualHours" name="Actual" fill={SERIES[2]} radius={[0, 4, 4, 0]} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
