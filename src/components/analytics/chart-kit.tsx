"use client";

import { Table2, BarChart3 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Chart tokens (see globals.css). Series colors follow the validated
 * categorical order and are assigned by entity, never by rank.
 */
export const SERIES = {
  1: "var(--series-1)",
  2: "var(--series-2)",
  3: "var(--series-3)",
  4: "var(--series-4)",
} as const;

export const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 11 } as const;
export const GRID_STROKE = "var(--chart-grid)";

export interface ChartTableColumn<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
}

interface ChartCardProps<Row> {
  title: string;
  description?: string;
  rows: Row[];
  columns: ChartTableColumn<Row>[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyLabel?: string;
  height?: number;
  className?: string;
  /** Legend shown above the plot for multi-series charts. */
  legend?: { label: string; color: string }[];
  children: ReactNode;
}

/**
 * Card wrapper for every chart: title, legend, loading/empty/error states,
 * and a "table view" toggle so the data is never available only as color.
 */
export function ChartCard<Row>({
  title,
  description,
  rows,
  columns,
  isLoading,
  error,
  onRetry,
  emptyLabel = "No data yet.",
  height = 240,
  className,
  legend,
  children,
}: ChartCardProps<Row>) {
  const [asTable, setAsTable] = useState(false);

  if (isLoading) return <ChartSkeleton className={className} />;

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {rows.length > 0 && !error ? (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              aria-label={asTable ? `Show ${title} as chart` : `Show ${title} as table`}
              title={asTable ? "Show chart" : "Show table"}
            >
              {asTable ? <BarChart3 /> : <Table2 />}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">
        {error ? (
          <ErrorState error={error} title={`Unable to load ${title.toLowerCase()}.`} onRetry={onRetry} compact />
        ) : rows.length === 0 ? (
          <EmptyState icon={BarChart3} title={emptyLabel} compact />
        ) : asTable ? (
          <div className="max-h-80 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={c.align === "right" ? "text-right tabular-nums" : undefined}>
                        {c.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <figure aria-label={title}>
            {legend && legend.length > 1 ? (
              <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {legend.map((l) => (
                  <li key={l.label} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ background: l.color }} aria-hidden />
                    {l.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div style={{ height }} className="w-full">
              {children}
            </div>
          </figure>
        )}
      </CardContent>
    </Card>
  );
}

/** Tooltip in text tokens; the color swatch carries identity. */
interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  dataKey?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: unknown;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: unknown) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
  labelFormatter = (l) => (l === undefined || l === null ? "" : String(l)),
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-32 rounded-md border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md">
      {labelFormatter(label) ? <p className="mb-1 font-medium">{labelFormatter(label)}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center gap-2">
            <span className="size-2 rounded-sm" style={{ background: item.color ?? item.fill }} aria-hidden />
            <span className="text-muted-foreground">{String(item.name ?? "")}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{typeof item.value === "number" ? valueFormatter(item.value) : String(item.value ?? "")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
