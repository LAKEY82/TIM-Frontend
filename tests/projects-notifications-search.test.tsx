import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CommandSearchProvider } from "@/components/layout/command-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { emptyProjectForm, projectFormSchema, toProjectInput } from "@/components/projects/project-form-schema";
import { ProjectDialog } from "@/components/projects/project-create-modal";
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
    expect(messages).toEqual(expect.arrayContaining(["External projects need a client.", "Deadline can't be before the start date."]));
    expect(projectFormSchema.safeParse({ ...emptyProjectForm(), name: "Theiavora Web", type: "INTERNAL" }).success).toBe(true);
  });

  it("drops the client for internal projects", () => {
    const input = toProjectInput({ ...emptyProjectForm(), name: "Payroll", type: "INTERNAL", clientId: "c1", estimatedHours: "120", memberIds: ["u1"] });
    expect(input).toMatchObject({ name: "Payroll", clientId: null, type: "INTERNAL", estimatedHours: 120, memberIds: ["u1"] });
  });

  it("posts to /api/projects and opens the new project", async () => {
    const { calls } = mockApi({
      "GET /api/users": () => ({ body: [] }),
      "GET /api/clients": () => ({ body: { data: [], meta: { total: 0 } } }),
      "POST /api/projects": () => ({ status: 201, body: { data: { id: "p77", name: "Theiavora Web", status: "PLANNING" } } }),
    });
    renderWithProviders(<ProjectDialog open onOpenChange={() => {}} />, { user: userWithRole("PROJECT_MANAGER") });
    await userEvent.type(screen.getByLabelText(/^Name/), "Theiavora Web");
    await userEvent.click(screen.getByLabelText("Internal"));
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/projects/p77"));
    expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ name: "Theiavora Web", type: "INTERNAL", clientId: null });
  });
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
