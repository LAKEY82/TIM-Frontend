import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("Tasks assigned to you, plus work you QA test (it stays here with its bugs until it passes).")).toBeInTheDocument();
    const req = calls.find((c) => c.path === "/api/tasks")!;
    expect(req.search.get("includeQa")).toBe("true");
    expect(req.search.get("includeReviews")).toBeNull();
    expect(screen.queryByRole("radio", { name: "To review" })).not.toBeInTheDocument();
  });
});

describe("My tasks filters", () => {
  it("filters by project instead of by person", async () => {
    const { calls } = mockApi({
      "GET /api/tasks": () => ({ body: { data: [inReview], meta: { total: 1, page: 1, pageSize: 25 } } }),
      "GET /api/projects": () => ({ body: { data: [{ id: "p1", name: "Amora dev" }, { id: "p2", name: "KOC Ecommerce" }], meta: { total: 2 } } }),
    });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE") });
    expect(await screen.findByText("Login form")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Filter by assignee" })).toBeNull();

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by project" }));
    await userEvent.click(await screen.findByRole("option", { name: "KOC Ecommerce" }));
    await waitFor(() => expect(calls.filter((c) => c.path === "/api/tasks").at(-1)?.search.get("projectId")).toBe("p2"));
    // Still only my work, now within that project.
    expect(calls.filter((c) => c.path === "/api/tasks").at(-1)?.search.get("assigneeId")).toBe("me");
  });
});

describe("Bugs under a task", () => {
  it("expands a tested task to show the bugs QA reported on it", async () => {
    const tested = { ...inReview, id: "t5", title: "Login", status: "CHANGES_REQUESTED", issueCount: 2, openIssueCount: 1, qa: { id: "me", name: "New QA" } };
    const bugs = [
      { id: "b1", title: "Password accepts empty value", status: "TODO", priority: "HIGH", tags: [], issueKind: "DEFECT", assignee: { id: "dev", name: "Lakindu Perera" } },
      { id: "b2", title: "Button misaligned", status: "COMPLETED", priority: "LOW", tags: [], issueKind: "UI", assignee: { id: "dev", name: "Lakindu Perera" } },
    ];
    const { calls } = mockApi({
      "GET /api/tasks": (req) => ({ body: { data: req.search.get("issuesOf") ? bugs : [tested], meta: { total: 1, page: 1, pageSize: 25 } } }),
      "GET /api/projects": () => ({ body: { data: [], meta: { total: 0 } } }),
    });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE", { id: "me" }) });

    expect(await screen.findByText("1 of 2 bugs open")).toBeInTheDocument();
    expect(screen.queryByText("Password accepts empty value")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show bugs for Login" }));
    expect(await screen.findByRole("link", { name: "Password accepts empty value" })).toHaveAttribute("href", "/tasks/b1");
    expect(screen.getByRole("link", { name: "Button misaligned" })).toBeInTheDocument();
    expect(calls.find((c) => c.search.get("issuesOf"))?.search.get("issuesOf")).toBe("t5");
    // Expanding doesn't open the task.
    expect(screen.getByRole("button", { name: "Hide bugs for Login" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Bugs nested in the developer's list", () => {
  it("asks for bugs to be nested under their tasks, but lists them flat while filtering", async () => {
    const { calls } = mockApi({
      "GET /api/tasks": () => ({ body: { data: [inReview], meta: { total: 1, page: 1, pageSize: 25 } } }),
      "GET /api/projects": () => ({ body: { data: [], meta: { total: 0 } } }),
    });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE") });
    expect(await screen.findByText("Login form")).toBeInTheDocument();
    expect(calls.filter((c) => c.path === "/api/tasks").at(-1)?.search.get("nestIssues")).toBe("true");

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by status" }));
    await userEvent.click(await screen.findByRole("option", { name: "To do" }));
    await waitFor(() => expect(calls.filter((c) => c.path === "/api/tasks").at(-1)?.search.get("status")).toBe("TODO"));
    expect(calls.filter((c) => c.path === "/api/tasks").at(-1)?.search.get("nestIssues")).toBeNull();
  });
});

describe("Fixing bugs from the task list", () => {
  const login = { ...inReview, id: "t7", title: "Login", status: "IN_QA", issueCount: 2, openIssueCount: 2, assignee: { id: "dev", name: "Lakindu Perera" }, qa: { id: "qa", name: "New QA" } };
  const bug = (id: string, title: string, status: string) => ({
    id,
    title,
    type: "BUG",
    status,
    priority: "HIGH",
    tags: [],
    issueKind: "BUG",
    assignee: { id: "dev", name: "Lakindu Perera" },
    qa: { id: "qa", name: "New QA" },
  });

  it("the developer expands their task and sends a fixed bug for review", async () => {
    const bugs = [bug("b1", "this", "TODO"), bug("b2", "this 2", "IN_REVIEW")];
    const { calls } = mockApi({
      "GET /api/tasks": (req) => ({ body: { data: req.search.get("issuesOf") ? bugs : [login], meta: { total: 1, page: 1, pageSize: 25 } } }),
      "GET /api/projects": () => ({ body: { data: [], meta: { total: 0 } } }),
      "POST /api/tasks/b1/submit": () => ({ body: { data: { ...bugs[0], status: "IN_REVIEW" } } }),
    });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });

    // Only the task at first; its bugs appear when it's expanded.
    expect(await screen.findByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "this" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show bugs for Login" }));
    await screen.findByRole("link", { name: "this" });

    const send = screen.getAllByRole("button", { name: /Send for review/ });
    expect(send).toHaveLength(1); // "this 2" is already in review
    expect(screen.queryByRole("button", { name: /Mark fixed/ })).toBeNull();
    await userEvent.click(send[0]!);
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/api/tasks/b1/submit")).toBe(true));
  });

  it("the QA marks a bug in review fixed, or reopens it", async () => {
    const bugs = [bug("b1", "this", "IN_REVIEW"), bug("b2", "this 2", "TODO")];
    const { calls } = mockApi({
      "GET /api/tasks": (req) => ({ body: { data: req.search.get("issuesOf") ? bugs : [login], meta: { total: 1, page: 1, pageSize: 25 } } }),
      "GET /api/projects": () => ({ body: { data: [], meta: { total: 0 } } }),
      "POST /api/tasks/b1/approve": () => ({ body: { data: { ...bugs[0], status: "APPROVED" } } }),
    });
    renderWithProviders(<MyTasksView />, { user: userWithRole("EMPLOYEE", { id: "qa" }) });

    await userEvent.click(await screen.findByRole("button", { name: "Show bugs for Login" }));
    await screen.findByRole("link", { name: "this" });
    expect(screen.getAllByRole("button", { name: /Mark fixed/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Reopen/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send for review/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Mark fixed/ }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/api/tasks/b1/approve")).toBe(true));
  });
});
