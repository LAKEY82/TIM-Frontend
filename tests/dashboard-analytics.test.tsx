import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanyDashboard } from "@/components/dashboard/company-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { normalizeCompanyAnalytics, normalizeDepartmentAnalytics } from "@/lib/services/analytics";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

// Recharts is exercised in the browser; here we only care that the dashboard
// wires API data into the page, so the code-split charts are stubbed.
vi.mock("@/components/analytics/lazy-charts", () => {
  const Stub = ({ title }: { title?: string }) => <div data-testid="chart">{title ?? "chart"}</div>;
  return {
    TaskStatusChart: Stub,
    ProjectStatusChart: Stub,
    CountBarChart: Stub,
    ActivityChart: Stub,
    TrendChart: Stub,
    DepartmentWorkloadChart: Stub,
    WorkloadChart: Stub,
    ProjectProgressChart: Stub,
    HoursChart: Stub,
  };
});

const companyPayload = {
  success: true,
  data: {
    summary: { activeProjects: 11, completedProjects: 3, atRiskProjects: 2, overdueTasks: 7, completedTasks: 120, inReviewTasks: 9 },
    projectStatus: [{ status: "ACTIVE", count: 11 }],
    taskStatus: { TODO: 10, IN_PROGRESS: 5 },
    departmentWorkload: [{ departmentId: "d1", departmentName: "Development", assigned: 30, completed: 12, overdue: 3 }],
    weeklyActivity: [{ date: "2026-09-14", created: 8, completed: 6 }],
    projectProgress: [{ projectId: "p1", name: "POS System", progress: 64 }],
    upcomingDeadlines: [{ id: "t1", type: "TASK", title: "Checkout API", dueDate: "2026-09-27", projectName: "KOC Ecommerce" }],
    projectsRequiringAttention: [{ project: { id: "p2", name: "Payroll", status: "AT_RISK", progress: 20 }, reasons: ["3 overdue tasks"] }],
    recentActivity: [
      {
        id: "a1",
        actor: { id: "u3", name: "Lakindu" },
        action: "assigned",
        entityType: "TASK",
        entityId: "t1",
        entityName: "Checkout API",
        target: { type: "USER", id: "u6", name: "Pabasara" },
        createdAt: "2026-09-25T08:00:00Z",
      },
    ],
  },
};

describe("CEO dashboard", () => {
  it("renders figures from /api/analytics/company", async () => {
    const { calls } = mockApi({ "GET /api/analytics/company": () => ({ body: companyPayload }) });
    renderWithProviders(<CompanyDashboard />, { user: userWithRole("CEO") });

    const figures = await screen.findByRole("region", { name: "Key figures" });
    expect(within(figures).getByRole("link", { name: /Active projects\s*11/ })).toHaveAttribute("href", "/projects?status=ACTIVE");
    expect(within(figures).getByText("120")).toBeInTheDocument();
    expect(within(figures).getByRole("link", { name: /At risk\s*2/ })).toBeInTheDocument();
    expect(screen.getByText("Checkout API", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("3 overdue tasks")).toBeInTheDocument();
    // "Lakindu assigned Checkout API to Pabasara."
    expect(screen.getByRole("link", { name: "Lakindu" })).toHaveAttribute("href", "/team/u3");
    expect(screen.getByRole("link", { name: "Pabasara" })).toHaveAttribute("href", "/team/u6");
    expect(calls.every((c) => c.path === "/api/analytics/company")).toBe(true);
  });

  it("shows an error with retry instead of a blank screen", async () => {
    mockApi({ "GET /api/analytics/company": () => ({ status: 500, body: {} }) });
    renderWithProviders(<CompanyDashboard />, { user: userWithRole("CEO") });
    expect(await screen.findByText("Unable to load company analytics.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });
});

describe("Employee dashboard", () => {
  it("greets the user and shows helpful empty states", async () => {
    mockApi({ "GET /api/tasks/my-day": () => ({ body: { today: [], overdue: [], upcoming: [], inReview: [], blocked: [] } }) });
    renderWithProviders(<EmployeeDashboard />, { user: userWithRole("EMPLOYEE", { name: "Pabasara Perera" }) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/, Pabasara$/);
    expect(await screen.findByText("No tasks assigned for today.")).toBeInTheDocument();
  });
});

describe("analytics normalization", () => {
  it("defaults missing sections to empty arrays instead of crashing", () => {
    const a = normalizeCompanyAnalytics({ summary: { activeProjects: "4" } });
    expect(a.summary.activeProjects).toBe(4);
    expect(a.summary.overdueTasks).toBe(0);
    expect(a.taskStatus).toEqual([]);
    expect(a.recentActivity).toEqual([]);
  });

  it("accepts keyed objects for counts and department-specific metrics", () => {
    const a = normalizeCompanyAnalytics(companyPayload.data);
    expect(a.taskStatus).toEqual([
      { key: "TODO", count: 10 },
      { key: "IN_PROGRESS", count: 5 },
    ]);
    const qa = normalizeDepartmentAnalytics("qa", { metrics: { openBugs: 4, resolvedBugs: 10 }, breakdowns: { severity: { HIGH: 2, LOW: 2 } } });
    expect(qa.metrics).toEqual([
      { key: "openBugs", label: "Open bugs", value: 4 },
      { key: "resolvedBugs", label: "Resolved bugs", value: 10 },
    ]);
    expect(qa.breakdowns[0]?.items).toEqual([
      { key: "HIGH", count: 2 },
      { key: "LOW", count: 2 },
    ]);
  });
});
