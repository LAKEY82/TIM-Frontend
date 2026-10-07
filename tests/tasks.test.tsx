import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { moveFor } from "@/components/projects/project-board";
import { RequestChangesDialog } from "@/components/tasks/request-changes-dialog";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { emptyTaskForm, taskFormSchema, toTaskInput } from "@/components/tasks/task-form-schema";
import { TaskQuickActions } from "@/components/tasks/task-quick-actions";
import { TaskReviewBanner } from "@/components/tasks/task-review";
import { useUpdateTaskStatus } from "@/hooks/queries/use-tasks";
import { queryKeys } from "@/lib/query-keys";
import { makeQueryClient, mockApi, renderWithProviders, userWithRole } from "@/test/utils";
import type { Paginated, Task, TaskSummary } from "@/types/domain";

const summary = (overrides: Partial<TaskSummary> = {}): TaskSummary => ({
  id: "t1",
  title: "Checkout API",
  status: "TODO",
  priority: "HIGH",
  project: { id: "p1", name: "KOC Ecommerce" },
  assignee: { id: "me", name: "Pabasara" },
  reviewer: { id: "rev", name: "Lakindu" },
  dueDate: "2026-09-26",
  estimatedHours: 4,
  tags: [],
  ...overrides,
});

describe("task creation", () => {
  it("validates with Zod", () => {
    const bad = taskFormSchema.safeParse({ ...emptyTaskForm(), title: "ab", startDate: "2026-09-10", dueDate: "2026-09-01", assigneeId: "u1", reviewerId: "u1" });
    expect(bad.success).toBe(false);
    const messages = bad.success ? [] : bad.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Title must be at least 3 characters.",
        "Select a project.",
        "Due date can't be before the start date.",
        "The reviewer should be someone other than the assignee.",
      ]),
    );
  });

  it("maps form values to the API payload", () => {
    const input = toTaskInput({ ...emptyTaskForm({ projectId: "p1" }), title: "  Build cart  ", estimatedHours: "2.5", tags: "frontend, cart ,", dueDate: "2026-10-01" });
    expect(input).toMatchObject({ title: "Build cart", projectId: "p1", estimatedHours: 2.5, tags: ["frontend", "cart"], dueDate: "2026-10-01", startDate: null, description: null });
  });

  it("submits the modal to POST /api/tasks and shows server field errors", async () => {
    let attempt = 0;
    const { calls } = mockApi({
      "GET /api/projects": () => ({ body: { data: [{ id: "p1", name: "POS System", status: "ACTIVE" }], meta: { total: 1 } } }),
      "GET /api/users": () => ({ body: [] }),
      "GET /api/departments": () => ({ body: [] }),
      "GET /api/milestones": () => ({ body: [] }),
      "POST /api/tasks": () => {
        attempt += 1;
        return attempt === 1
          ? { status: 422, body: { message: "Validation failed", errors: [{ path: "title", message: "A task with this title already exists." }] } }
          : { status: 201, body: { data: { id: "t9", title: "Receipt printing", status: "TODO", priority: "MEDIUM" } } };
      },
    });
    renderWithProviders(<TaskCreateModal open onOpenChange={() => {}} defaults={{ projectId: "p1" }} />, { user: userWithRole("PROJECT_MANAGER") });

    await userEvent.type(screen.getByLabelText(/^Title/), "Receipt printing");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("A task with this title already exists.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(attempt).toBe(2));
    const post = calls.find((c) => c.method === "POST" && c.path === "/api/tasks");
    expect(post?.body).toMatchObject({ title: "Receipt printing", projectId: "p1", priority: "MEDIUM", type: "FEATURE" });
  }, 15000);
});

describe("task status updates", () => {
  it("Start calls PATCH /api/tasks/:id/status", async () => {
    const { calls } = mockApi({ "PATCH /api/tasks/t1/status": () => ({ body: { ...summary(), status: "IN_PROGRESS" } }) });
    renderWithProviders(<TaskQuickActions task={summary()} />, { user: userWithRole("EMPLOYEE", { id: "me" }) });
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ status: "IN_PROGRESS" });
  });

  it("Submit for review uses the review endpoint", async () => {
    const { calls } = mockApi({ "POST /api/tasks/t1/submit": () => ({ body: { ...summary(), status: "IN_REVIEW" } }) });
    renderWithProviders(<TaskQuickActions task={summary({ status: "IN_PROGRESS" })} />, { user: userWithRole("EMPLOYEE", { id: "me" }) });
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(calls.some((c) => c.path === "/api/tasks/t1/submit")).toBe(true));
  });
});

describe("Kanban movement", () => {
  it("maps columns to the right API action", () => {
    expect(moveFor("IN_PROGRESS")).toEqual({ kind: "status", status: "IN_PROGRESS" });
    expect(moveFor("IN_REVIEW")).toEqual({ kind: "submit" });
    expect(moveFor("APPROVED")).toEqual({ kind: "approve" });
    // In QA always uses the status endpoint: from review it approves and sends to QA; otherwise the PM sends it.
    expect(moveFor("IN_QA")).toEqual({ kind: "status", status: "IN_QA" });
    expect(moveFor("CHANGES_REQUESTED")).toEqual({ kind: "request_changes" });
  });

  function setup(status: number) {
    mockApi({ "PATCH /api/tasks/t1/status": () => (status === 200 ? { body: { ...summary(), status: "BLOCKED" } } : { status, body: { message: "Invalid transition" } }) });
    const queryClient = makeQueryClient();
    const listKey = queryKeys.tasks.list({ projectId: "p1" });
    const list: Paginated<TaskSummary> = { items: [summary()], page: 1, pageSize: 50, total: 1, totalPages: 1 };
    queryClient.setQueryData(listKey, list);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper });
    const statusInCache = () => queryClient.getQueryData<Paginated<TaskSummary>>(listKey)?.items[0]?.status;
    return { result, statusInCache };
  }

  it("moves the card optimistically", async () => {
    const { result, statusInCache } = setup(200);
    act(() => result.current.mutate({ id: "t1", status: "BLOCKED" }));
    await waitFor(() => expect(statusInCache()).toBe("BLOCKED"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back when the API rejects the move", async () => {
    const { result, statusInCache } = setup(422);
    act(() => result.current.mutate({ id: "t1", status: "BLOCKED" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(statusInCache()).toBe("TODO");
  });
});

describe("task review", () => {
  const reviewTask = (status: Task["status"]): Task => ({ ...summary({ status, assignee: { id: "emp", name: "Pabasara" }, reviewer: { id: "me", name: "Lakindu" } }), subtasks: [], attachments: [] });

  it("shows Approve / Request changes to the reviewer", async () => {
    mockApi({ "GET /api/tasks/t1/reviews": () => ({ body: [] }) });
    renderWithProviders(<TaskReviewBanner task={reviewTask("IN_REVIEW")} />, { user: userWithRole("PROJECT_MANAGER", { id: "me" }) });
    expect(screen.getByText("This task is waiting for your review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request changes/ })).toBeInTheDocument();
  });

  it("shows 'Waiting for review' to the assignee without review buttons", () => {
    mockApi({ "GET /api/tasks/t1/reviews": () => ({ body: [] }) });
    renderWithProviders(<TaskReviewBanner task={reviewTask("IN_REVIEW")} />, { user: userWithRole("EMPLOYEE", { id: "emp" }) });
    expect(screen.getByText("Waiting for review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
  });

  it("requires feedback and posts it to request-changes", async () => {
    const { calls } = mockApi({ "POST /api/tasks/t1/request-changes": () => ({ body: { ...summary(), status: "CHANGES_REQUESTED" } }) });
    renderWithProviders(<RequestChangesDialog taskId="t1" taskTitle="Checkout API" open onOpenChange={() => {}} />, { user: userWithRole("PROJECT_MANAGER") });
    await userEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(await screen.findByText(/at least 5 characters/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Reason \/ feedback/), "Validate coupons before totals.");
    await userEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => expect(calls.find((c) => c.path === "/api/tasks/t1/request-changes")?.body).toEqual({ feedback: "Validate coupons before totals." }));
  });
});
