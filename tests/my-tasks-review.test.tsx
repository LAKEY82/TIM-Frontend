import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MyTasksView } from "@/components/tasks/my-tasks-view";
import { navigationState } from "@/test/setup";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

const inReview = {
  id: "s1",
  title: "Login form",
  status: "IN_REVIEW",
  priority: "MEDIUM",
  tags: [],
  parentId: "t1",
  project: { id: "p1", name: "Amora dev" },
  assignee: { id: "dev", name: "Lakindu Perera" },
};

afterEach(() => {
  navigationState.searchParams = new URLSearchParams();
});

describe("My tasks for a project manager", () => {
  it("includes work developers sent for review alongside their own tasks", async () => {
    const { calls } = mockApi({ "GET /api/tasks": () => ({ body: { data: [inReview], meta: { total: 1, page: 1, pageSize: 25 } } }) });
    renderWithProviders(<MyTasksView />, { user: userWithRole("PROJECT_MANAGER") });
    expect(await screen.findByText("Login form")).toBeInTheDocument();
    expect(screen.getByText("Tasks assigned to you, plus work waiting for your review or QA testing.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "To review" })).toBeInTheDocument();
    const req = calls.find((c) => c.path === "/api/tasks")!;
    expect(req.search.get("assigneeId")).toBe("me");
    expect(req.search.get("includeReviews")).toBe("true");
  });

  it("has a To review tab with only the work waiting for review", async () => {
    navigationState.searchParams = new URLSearchParams("scope=review");
    const { calls } = mockApi({ "GET /api/tasks": () => ({ body: { data: [inReview], meta: { total: 1, page: 1, pageSize: 25 } } }) });
    renderWithProviders(<MyTasksView />, { user: userWithRole("PROJECT_MANAGER") });
    expect(await screen.findByRole("heading", { name: "To review" })).toBeInTheDocument();
    await waitFor(() => expect(calls.find((c) => c.path === "/api/tasks")?.search.get("awaitingReview")).toBe("true"));
  });

  it("for an employee (e.g. a QA), includes tasks waiting for their QA testing but not reviews", async () => {
    const inQa = { ...inReview, id: "s2", title: "Register", status: "IN_QA", qa: { id: "me", name: "New QA" } };
    const { calls } = mockApi({ "GET /api/tasks": () => ({ body: { data: [inQa], meta: { total: 1, page: 1, pageSize: 25 } } }) });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE") });
    expect(await screen.findByText("Register")).toBeInTheDocument();
    expect(screen.getByText("Tasks assigned to you, plus tasks waiting for your QA testing.")).toBeInTheDocument();
    const req = calls.find((c) => c.path === "/api/tasks")!;
    expect(req.search.get("includeQa")).toBe("true");
    expect(req.search.get("includeReviews")).toBeNull();
    expect(screen.queryByRole("radio", { name: "To review" })).not.toBeInTheDocument();
  });
});
