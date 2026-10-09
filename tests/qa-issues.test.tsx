import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { describeBrowser, QaBugsDialog } from "@/components/tasks/qa-bugs-dialog";
import { QaIssueCard } from "@/components/tasks/qa-issue";
import { TaskQuickActions } from "@/components/tasks/task-quick-actions";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("QA issue reporting", () => {
  it("reads the tester's browser and OS for the environment", () => {
    expect(describeBrowser("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0")).toBe(
      "Edge 129 · Windows",
    );
    expect(describeBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")).toBe("Safari 17 · macOS");
  });

  it("sends a typed issue with steps, expected/actual and environment, then attaches its screenshot", async () => {
    const { calls } = mockApi({
      "POST /api/tasks/t1/qa/issues": () => ({
        body: { data: { id: "t1", title: "Login", status: "IN_QA", priority: "MEDIUM", tags: [], assignee: { id: "d", name: "Dev" }, bugIds: ["b1"] } },
      }),
      "POST /api/tasks/b1/attachments": () => ({ status: 201, body: { data: { id: "f1", fileName: "shot.png", url: "https://x/shot.png" } } }),
    });
    let open = true;
    renderWithProviders(<QaBugsDialog taskId="t1" taskTitle="Login" open onOpenChange={(o) => (open = o)} />, { user: userWithRole("EMPLOYEE") });

    await userEvent.click(screen.getByRole("combobox", { name: "Issue 1 type" }));
    await userEvent.click(await screen.findByRole("option", { name: /Defect/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Issue 1 summary" }), "Password accepts empty value");
    await userEvent.type(screen.getByLabelText("Steps to reproduce"), "Open login{enter}Leave password empty{enter}Press Sign in");
    await userEvent.type(screen.getByLabelText("Expected result"), "Validation error");
    await userEvent.type(screen.getByLabelText("Actual result"), "Signs in");
    const env = screen.getByLabelText("Environment");
    await userEvent.clear(env);
    await userEvent.type(env, "Chrome 129 · staging");
    const file = new File(["png"], "shot.png", { type: "image/png" });
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(screen.getByRole("list", { name: "Issue 1 attachments" })).toHaveTextContent("shot.png");

    await userEvent.click(screen.getByRole("button", { name: "Log 1 issue" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/api/tasks/b1/attachments")).toBe(true));
    expect(calls.find((c) => c.path === "/api/tasks/t1/qa/issues")?.body).toEqual({
      bugs: [
        {
          kind: "DEFECT",
          title: "Password accepts empty value",
          priority: "HIGH",
          steps: "Open login\nLeave password empty\nPress Sign in",
          expected: "Validation error",
          actual: "Signs in",
          environment: "Chrome 129 · staging",
          dueDate: null,
        },
      ],
    });
    await waitFor(() => expect(open).toBe(false));
  }, 20000);

  it("shows the QA report on the issue: numbered steps, expected vs actual, screenshots", () => {
    renderWithProviders(
      <QaIssueCard
        issue={{ kind: "UI", steps: "1. Open menu\n2. Resize", expected: "Menu stays", actual: "Menu overlaps", environment: "iOS", reportedBy: { id: "q", name: "Zoe QA" } }}
        attachments={[
          { id: "a", fileName: "menu.png", url: "https://x/menu.png", mimeType: "image/png", createdAt: "2026-10-07" },
          { id: "b", fileName: "log.txt", url: "https://x/log.txt", mimeType: "text/plain", createdAt: "2026-10-07" },
        ]}
      />,
    );
    expect(screen.getByText("UI/UX")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(expect.arrayContaining(["Open menu", "Resize"]));
    expect(screen.getByText("Menu overlaps")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "menu.png" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "log.txt" })).not.toBeInTheDocument();
  });
});

describe("QA complete", () => {
  it("is the QA's way to finish testing: it sends logged issues back or passes the task", async () => {
    const { calls } = mockApi({
      "POST /api/tasks/t1/qa/complete": () => ({
        body: { data: { id: "t1", title: "Login", status: "CHANGES_REQUESTED", priority: "MEDIUM", tags: [], assignee: { id: "d", name: "Dev" }, openIssues: 2 } },
      }),
    });
    const task = { id: "t1", title: "Login", status: "IN_QA" as const, priority: "MEDIUM" as const, tags: [], assignee: { id: "d", name: "Dev" }, qa: { id: "u1", name: "Zoe QA" } };
    const user = { ...userWithRole("EMPLOYEE"), id: "u1" };
    renderWithProviders(<TaskQuickActions task={task} />, { user });
    expect(screen.getByRole("button", { name: /Report issues/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /QA complete/ }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/api/tasks/t1/qa/complete")).toBe(true));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("QA complete: 2 issues sent to Dev."));
  });
});
