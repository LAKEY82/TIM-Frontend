import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CommandSearchProvider } from "@/components/layout/command-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { emptyProjectForm, projectFormSchema, toProjectInput } from "@/components/projects/project-form-schema";
import { ProjectDialog } from "@/components/projects/project-create-modal";
import { ProjectQaPicker, ProjectStatusPicker } from "@/components/projects/project-inline-pickers";
import { ProjectWorkflow } from "@/components/projects/project-workflow";
import { ProjectDeleteDialog } from "@/components/projects/project-delete-dialog";
import { QaSetupSection, qaSetupReason } from "@/components/tasks/qa-setup-section";
import type { Project } from "@/types/domain";
import { routerMock } from "@/test/setup";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

beforeEach(() => {
  routerMock.push.mockReset();
});

describe("project creation", () => {
  it("requires a client for external projects and orders dates", () => {
    const r = projectFormSchema.safeParse({ ...emptyProjectForm(), name: "Maths Hub LMS", startDate: "2026-10-10", deadline: "2026-10-01" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining(["External projects need a client.", "Deadline can't be before the start date.", "Assign a QA person for this project."]),
    );
    expect(projectFormSchema.safeParse({ ...emptyProjectForm(), name: "Theiavora Web", type: "INTERNAL", qaId: "qa1" }).success).toBe(true);
  });

  it("drops the client for internal projects", () => {
    const input = toProjectInput({ ...emptyProjectForm(), name: "Payroll", type: "INTERNAL", clientId: "c1", estimatedHours: "120", memberIds: ["u1"] });
    expect(input).toMatchObject({ name: "Payroll", clientId: null, type: "INTERNAL", estimatedHours: 120, memberIds: ["u1"] });
  });

  it("posts to /api/projects and opens the new project", async () => {
    const { calls } = mockApi({
      "GET /api/users": () => ({ body: [{ id: "qa1", name: "Zoe QA", email: "zoe@x.test", role: "EMPLOYEE", status: "ACTIVE" }] }),
      "GET /api/clients": () => ({ body: { data: [], meta: { total: 0 } } }),
      "POST /api/projects": () => ({ status: 201, body: { data: { id: "p77", name: "Theiavora Web", status: "PLANNING" } } }),
    });
    renderWithProviders(<ProjectDialog open onOpenChange={() => {}} />, { user: userWithRole("PROJECT_MANAGER") });
    await userEvent.type(screen.getByLabelText(/^Name/), "Theiavora Web");
    await userEvent.click(screen.getByLabelText("Internal"));

    // A QA person is required.
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Assign a QA person for this project.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    await userEvent.click(screen.getByRole("combobox", { name: /^QA/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Zoe QA" }));
    // New projects are broken into workflow stages by default; they need at least one designer or developer.
    expect(screen.getByRole("switch", { name: "Break into workflow stages" })).toBeChecked();
    expect(await screen.findByText("Assign at least a designer or a developer.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox", { name: /^Frontend developer/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Zoe QA" }));
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/projects/p77"));
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ name: "Theiavora Web", type: "INTERNAL", clientId: null, qaId: "qa1", workflow: { frontendId: "qa1", designerId: null, backendId: null, bugFixerId: null } });
   }, 20000);
});

describe("notifications", () => {
  const notifications = {
    data: [
      { id: "n1", type: "REVIEW_REQUESTED", title: "Pabasara submitted Checkout API for review", read: false, entityType: "TASK", entityId: "t1", createdAt: "2026-09-25T08:00:00Z" },
      { id: "n2", type: "TASK_APPROVED", title: "Landing page approved", read: true, createdAt: "2026-09-24T08:00:00Z" },
    ],
    meta: { total: 2, page: 1, pageSize: 20 },
  };

  it("shows unread count, marks one read and navigates", async () => {
    const { calls } = mockApi({
      "GET /api/notifications/unread-count": () => ({ body: { count: 1 } }),
      "GET /api/notifications": () => ({ body: notifications }),
      "PATCH /api/notifications/n1/read": () => ({ status: 204 }),
    });
    renderWithProviders(<NotificationBell />, { user: userWithRole("PROJECT_MANAGER") });
    const bell = await screen.findByRole("button", { name: "Notifications, 1 unread" });
    await userEvent.click(bell);
    await userEvent.click(await screen.findByText("Pabasara submitted Checkout API for review"));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH" && c.path === "/api/notifications/n1/read")).toBe(true));
    expect(routerMock.push).toHaveBeenCalledWith("/tasks/t1");
  });

  it("marks all as read", async () => {
    let unread = 1;
    const { calls } = mockApi({
      "GET /api/notifications/unread-count": () => ({ body: unread }),
      "GET /api/notifications": () => ({ body: notifications }),
      "PATCH /api/notifications/read-all": () => {
        unread = 0;
        return { status: 204 };
      },
    });
    renderWithProviders(<NotificationBell />, { user: userWithRole("EMPLOYEE") });
    await userEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    await userEvent.click(await screen.findByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(calls.some((c) => c.path === "/api/notifications/read-all")).toBe(true));
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});

describe("global search", () => {
  it("opens with Ctrl+K and shows results from /api/search", async () => {
    const { calls } = mockApi({
      "GET /api/search": () => ({
        body: {
          projects: [{ id: "p1", name: "Maths Hub LMS", status: "ACTIVE" }],
          tasks: [{ id: "t1", title: "Maths quiz engine", status: "IN_PROGRESS", projectName: "Maths Hub LMS" }],
          people: [],
          clients: [],
        },
      }),
    });
    renderWithProviders(
      <CommandSearchProvider>
        <p>app</p>
      </CommandSearchProvider>,
      { user: userWithRole("EMPLOYEE") },
    );
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByPlaceholderText(/Search projects, tasks/);
    await userEvent.type(input, "maths");
    expect(await screen.findByText("Maths quiz engine")).toBeInTheDocument();
    expect(calls.at(-1)?.search.get("q")).toBe("maths");

    await userEvent.click(screen.getByRole("option", { name: /^Maths Hub LMS/ }));
    expect(routerMock.push).toHaveBeenCalledWith("/projects/p1");
  });
});

describe("project QA controls", () => {
  const project = { id: "p1", name: "Maths Hub LMS", status: "ACTIVE", priority: "MEDIUM", qa: null, members: [] } as unknown as Project;

  it("can move a project to QA testing before it has a QA; tasks wait for one", async () => {
    mockApi({});
    renderWithProviders(<ProjectStatusPicker project={project} />, { user: userWithRole("PROJECT_MANAGER") });
    await userEvent.click(screen.getByRole("button", { name: /Change status/ }));
    const item = await screen.findByRole("menuitem", { name: /QA testing/ });
    expect(item).not.toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("Tasks wait until a QA is assigned");
  });

  it("assigns a QA mid-project from the header", async () => {
    const { calls } = mockApi({
      "GET /api/projects/p1/members": () => ({ body: [] }),
      "GET /api/users": () => ({ body: [{ id: "qa1", name: "Zoe QA", email: "zoe@x.test", role: "EMPLOYEE", status: "ACTIVE" }] }),
      "PATCH /api/projects/p1": () => ({ body: { data: { ...project, qa: { id: "qa1", name: "Zoe QA" } } } }),
    });
    renderWithProviders(<ProjectQaPicker project={project} />, { user: userWithRole("PROJECT_MANAGER") });
    await userEvent.click(screen.getByRole("button", { name: "Assign QA" }));
    await userEvent.click(await screen.findByRole("option", { name: /Zoe QA/ }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ qaId: "qa1" }));
  });
});

describe("project workflow card", () => {
  const project = { id: "p1", name: "Maths Hub LMS", status: "ACTIVE", priority: "MEDIUM", qa: { id: "qa1", name: "Zoe QA" }, members: [], workflow: true } as unknown as Project;
  const stage = (id: string, stage: string, status: string, assignee: string | null) => ({
    id, title: `${stage} · Maths Hub LMS`, stage, status, priority: "MEDIUM", tags: ["workflow"], reviewer: null,
    assignee: assignee ? { id: assignee, name: assignee } : null, qa: stage === "QA" ? { id: "qa1", name: "Zoe QA" } : null,
  });

  it("shows every stage and lets the project manager approve the one in review", async () => {
    const { calls } = mockApi({
      "GET /api/projects/p1/workflow": () => ({
        body: { data: [stage("t1", "DESIGN", "IN_REVIEW", "Dana"), stage("t2", "FRONTEND", "WAITING", "Fred"), stage("t3", "BACKEND", "WAITING", "Bea"), stage("t4", "QA", "WAITING", "Zoe QA"), stage("t5", "BUG_FIXING", "WAITING", "Fred")] },
      }),
      "POST /api/tasks/t1/approve": () => ({ body: { data: stage("t1", "DESIGN", "APPROVED", "Dana") } }),
    });
    renderWithProviders(<ProjectWorkflow project={project} />, { user: userWithRole("PROJECT_MANAGER") });
    const list = await screen.findByRole("list", { name: "Workflow stages" });
    expect(list.querySelectorAll("li")).toHaveLength(5);
    expect(screen.getAllByText("Opens when Design is approved.")).toHaveLength(2);
    expect(screen.getByText("Opens if QA reports bugs.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/api/tasks/t1/approve")).toBe(true));
  });

  it("offers managers a workflow setup on projects without one", async () => {
    mockApi({ "GET /api/projects/p1/workflow": () => ({ body: { data: [] } }) });
    renderWithProviders(<ProjectWorkflow project={{ ...project, workflow: false }} />, { user: userWithRole("PROJECT_MANAGER") });
    expect(await screen.findByRole("button", { name: /Set up workflow/ })).toBeInTheDocument();
  });
});

describe("QA set-up for the project manager", () => {
  const inQa = { id: "t1", title: "Login", status: "IN_QA", priority: "MEDIUM", tags: [], project: { id: "p1", name: "Amora web" }, assignee: { id: "nq", name: "New QA" }, qa: { id: "nq", name: "New QA" }, qaDueDate: null };

  it("says what is missing", () => {
    expect(qaSetupReason({ ...inQa, qa: null } as never)).toBe("Choose a QA tester");
    expect(qaSetupReason(inQa as never)).toMatch(/can't test their own work/);
    expect(qaSetupReason({ ...inQa, qa: { id: "z", name: "Zoe" } } as never)).toBe("Set the QA due date");
  });

  it("lists tasks to set up and lets the PM pick a different tester", async () => {
    const { calls } = mockApi({
      "GET /api/tasks/my-day": () => ({ body: { data: { date: "2026-10-06", today: [], overdue: [], upcoming: [], inReview: [], blocked: [], qaQueue: [], qaSetup: [inQa] } } }),
      "GET /api/projects/p1/members": () => ({ body: [] }),
      "GET /api/users": () => ({ body: [{ id: "z", name: "Zoe Tester", email: "z@x.test", role: "EMPLOYEE", status: "ACTIVE" }] }),
      "PATCH /api/tasks/t1": () => ({ body: { data: { ...inQa, qa: { id: "z", name: "Zoe Tester" } } } }),
    });
    renderWithProviders(<QaSetupSection />, { user: userWithRole("PROJECT_MANAGER") });
    expect(await screen.findByRole("list", { name: "QA to set up" })).toBeInTheDocument();
    expect(screen.getByText(/can't test their own work/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /QA tester: New QA/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Zoe Tester/ }));
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ qaId: "z" }));
  });
});

describe("deleting a project", () => {
  it("needs the name typed, then deletes and returns to the project list", async () => {
    const { calls } = mockApi({ "DELETE /api/projects/p1": () => ({ status: 204 }) });
    const project = { id: "p1", name: "Amora dev", status: "ACTIVE", priority: "MEDIUM", members: [], taskCount: 10 } as unknown as Project;
    renderWithProviders(<ProjectDeleteDialog project={project} open onOpenChange={() => {}} />, { user: userWithRole("ADMIN") });
    expect(screen.getByText(/10 tasks/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Delete project" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/), "Amora de");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/to confirm/), "v");
    await userEvent.click(button);
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/projects"));
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/api/projects/p1")).toBe(true);
  });
});
