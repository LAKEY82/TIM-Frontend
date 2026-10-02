"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/shared/skeletons";

/**
 * Code-split chart entry points. Recharts is only downloaded when a chart is
 * actually rendered, keeping it out of the initial app bundle.
 */
const loading = () => <ChartSkeleton />;

export const TaskStatusChart = dynamic(() => import("./charts").then((m) => m.TaskStatusChart), { ssr: false, loading });
export const ProjectStatusChart = dynamic(() => import("./charts").then((m) => m.ProjectStatusChart), { ssr: false, loading });
export const CountBarChart = dynamic(() => import("./charts").then((m) => m.CountBarChart), { ssr: false, loading });
export const ActivityChart = dynamic(() => import("./charts").then((m) => m.ActivityChart), { ssr: false, loading });
export const TrendChart = dynamic(() => import("./charts").then((m) => m.TrendChart), { ssr: false, loading });
export const DepartmentWorkloadChart = dynamic(() => import("./charts").then((m) => m.DepartmentWorkloadChart), { ssr: false, loading });
export const WorkloadChart = dynamic(() => import("./charts").then((m) => m.WorkloadChart), { ssr: false, loading });
export const ProjectProgressChart = dynamic(() => import("./charts").then((m) => m.ProjectProgressChart), { ssr: false, loading });
export const HoursChart = dynamic(() => import("./charts").then((m) => m.HoursChart), { ssr: false, loading });
