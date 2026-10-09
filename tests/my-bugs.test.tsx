import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SidebarNav } from "@/components/layout/sidebar";
import { MyBugsView } from "@/components/tasks/my-bugs-view";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const bug = {
  id: "b1",
  title: "Coupon ignored at checkout",
  status: "TODO",
  priority: "HIGH",
  type: "BUG",
  issueKind: "DEFECT",
  project: { id: "p1", name: "Maths Hub LMS" },
  parent: { id: "t1", name: "Checkout" },
  parentId: "t1",
  assignee: { id: "d1", name: "Lakindu Perera" },
  qa: { id: "q1", name: "New QA" },
  dueDate: null,
  tags: ["bug"],
};

describe("My bugs", () => {
  it("shows only for users who test something as QA", () => {
    renderWithProviders(<SidebarNav />, { user: userWithRole("EMPLOYEE", { isQaTester: true }) });
    expect(screen.getByRole("link", { name: /My Bugs/ })).toHaveAttribute("href", "/my-bugs");
  });

  it("hides the page from people who don't test anything", () => {
    renderWithProviders(<SidebarNav />, { user: userWithRole("EMPLOYEE") });
    expect(screen.queryByRole("link", { name: /My Bugs/ })).toBeNull();
  });

  it("lists the QA's open bugs and sets a fix-by date inline", async () => {
    const { calls } = mockApi({
      "GET /api/tasks": () => ({ body: { data: [bug], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } } }),
      "PATCH /api/tasks/b1": (req) => ({ body: { data: { ...bug, ...(req.body as object) } } }),
    });
    renderWithProviders(<MyBugsView />, { user: userWithRole("EMPLOYEE", { id: "q1", isQaTester: true }) });

    expect(await screen.findByRole("link", { name: "Coupon ignored at checkout" })).toBeInTheDocument();
    expect(screen.getByText("Defect")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/tasks/t1");

    const list = calls.find((c) => c.path === "/api/tasks")!;
    expect(list.search.get("qaBugs")).toBe("true");
    // "Open" leaves out fixed bugs.
    expect(list.search.getAll("status")).not.toContain("APPROVED");

    await userEvent.click(screen.getByRole("button", { name: "Set due date" }));
    fireEvent.change(await screen.findByLabelText("Due date"), { target: { value: "2026-11-05" } });
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ dueDate: "2026-11-05" }));
  });

  it("reports a bug on finished work in a completed project", async () => {
    const { calls } = mockApi({
      "GET /api/tasks": (req) =>
        req.search.get("projectId")
          ? { body: { data: [{ ...bug, id: "t9", title: "Checkout", status: "APPROVED", issueKind: null, parent: null, parentId: null }], meta: { total: 1 } } }
          : { body: { data: [], meta: { total: 0 } } },
      "GET /api/projects": () => ({ body: { data: [{ id: "p1", name: "Maths Hub LMS", status: "COMPLETED" }], meta: { total: 1 } } }),
      "POST /api/tasks/t9/qa/issues": () => ({ body: { data: { id: "t9", title: "Checkout", status: "APPROVED", priority: "HIGH", tags: [], bugIds: ["b9"] } } }),
    });
    renderWithProviders(<MyBugsView />, { user: userWithRole("EMPLOYEE", { id: "q1", isQaTester: true }) });

    await userEvent.click(await screen.findByRole("button", { name: /Report bug/ }));
    await userEvent.click(screen.getByRole("combobox", { name: "Project" }));
    await userEvent.click(await screen.findByRole("option", { name: "Maths Hub LMS (Completed)" }));
    await userEvent.click(await screen.findByRole("combobox", { name: "Found in" }));
    await userEvent.click(await screen.findByRole("option", { name: /Checkout/ }));
    expect(calls.find((c) => c.path === "/api/projects")?.search.get("qaId")).toBe("me");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(/is already finished/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Issue 1 summary" }), "Receipt email missing");
    await userEvent.click(screen.getByRole("button", { name: /Log 1 issue/ }));
    await waitFor(() => expect(calls.find((c) => c.path === "/api/tasks/t9/qa/issues")?.body).toMatchObject({ bugs: [{ title: "Receipt email missing" }] }));
  }, 20000);

  it("groups bugs by project and lets the QA verify or reopen fixes sent for review", async () => {
    const inReview = { ...bug, id: "b2", title: "Header overlaps logo", status: "IN_REVIEW", issueKind: "UI" };
    const otherProject = { ...bug, id: "b3", title: "Slow search", project: { id: "p2", name: "Alpha Portal" }, parent: null, parentId: null };
    const { calls } = mockApi({
      "GET /api/tasks": () => ({ body: { data: [bug, inReview, otherProject], meta: { page: 1, pageSize: 500, total: 3, totalPages: 1 } } }),
      "PATCH /api/tasks/b2/status": () => ({ body: { data: { ...inReview, status: "APPROVED" } } }),
    });
    renderWithProviders(<MyBugsView />, { user: userWithRole("EMPLOYEE", { id: "q1", isQaTester: true }) });

    const lms = await screen.findByRole("region", { name: "Maths Hub LMS" });
    const alpha = screen.getByRole("region", { name: "Alpha Portal" });
    expect(within(lms).getAllByRole("row")).toHaveLength(3); // header + 2 bugs
    expect(within(lms).getByText("1 to verify")).toBeInTheDocument();
    expect(within(alpha).getByRole("link", { name: "Slow search" })).toBeInTheDocument();

    // Only the bug the developer sent for review can be verified or reopened.
    const reviewRow = within(lms).getByRole("link", { name: "Header overlaps logo" }).closest("tr")!;
    expect(within(lms).getAllByRole("button", { name: /Verify fix/ })).toHaveLength(1);
    expect(within(reviewRow).getByRole("button", { name: /Reopen/ })).toBeInTheDocument();

    await userEvent.click(within(reviewRow).getByRole("button", { name: /Verify fix/ }));
    await waitFor(() => expect(calls.find((c) => c.path === "/api/tasks/b2/status")?.body).toEqual({ status: "APPROVED" }));
  });
});
