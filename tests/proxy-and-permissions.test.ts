// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { can, dashboardKindFor, hasPermission, homePathFor, permissionsFor } from "@/lib/permissions";
import { availableActions } from "@/lib/task-workflow";
import { proxy } from "@/proxy";
import type { Role } from "@/types/domain";

const u = (role: Role, permissions?: string[]) => ({ id: "me", role, permissions });

describe("proxy (optimistic route protection)", () => {
  it("redirects signed-out visitors to /login with next", () => {
    const res = proxy(new NextRequest("http://app.test/projects/p1?tab=board"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://app.test/login?next=%2Fprojects%2Fp1%3Ftab%3Dboard");
  });

  it("lets requests with the signed-in hint through", () => {
    const req = new NextRequest("http://app.test/dashboard", { headers: { cookie: "tv_signed_in=1" } });
    expect(proxy(req).headers.get("location")).toBeNull();
  });
});

describe("permissions (UI only)", () => {
  it("falls back to the role matrix", () => {
    expect(hasPermission(u("EMPLOYEE"), "users:manage")).toBe(false);
    expect(hasPermission(u("ADMIN"), "users:manage")).toBe(true);
    expect(can(u("PROJECT_MANAGER"), ["tasks:review", "daily_tasks:manage"])).toBe(true);
    expect(can(u("EMPLOYEE"), ["tasks:review", "timeline:read"], "any")).toBe(true);
  });

  it("prefers explicit backend permissions over the role matrix", () => {
    expect(permissionsFor(u("EMPLOYEE", ["tasks:review"])).has("tasks:review")).toBe(true);
    expect(hasPermission(u("ADMIN", ["tasks:review"]), "users:manage")).toBe(false);
  });

  it("picks role-based dashboards and landing pages", () => {
    expect(dashboardKindFor(u("CEO"))).toBe("company");
    expect(dashboardKindFor(u("MANAGING_DIRECTOR"))).toBe("operations");
    expect(dashboardKindFor(u("PROJECT_MANAGER"))).toBe("team");
    expect(dashboardKindFor(u("EMPLOYEE"))).toBe("employee");
    expect(homePathFor(u("EMPLOYEE"))).toBe("/my-day");
    expect(homePathFor(u("CEO"))).toBe("/dashboard");
  });
});

describe("task workflow actions", () => {
  const me = { id: "me", role: "EMPLOYEE" as const };
  const task = (status: Parameters<typeof availableActions>[0]["status"], assignee = "me", reviewer: string | null = "rev") => ({
    status,
    assignee: { id: assignee, name: "A" },
    reviewer: reviewer ? { id: reviewer, name: "R" } : null,
  });

  it("offers the assignee Start → Submit/Block (completing is the PM's), and Submit straight from To do", () => {
    expect(availableActions(task("TODO"), me)).toEqual(["start", "submit"]);
    expect(availableActions(task("IN_PROGRESS"), me)).toEqual(["submit", "block"]);
    expect(availableActions(task("BLOCKED"), me)).toEqual(["resume"]);
    expect(availableActions(task("CHANGES_REQUESTED"), me)).toEqual(["start", "submit"]);
  });

  it("offers review actions only to the reviewer", () => {
    expect(availableActions(task("IN_REVIEW"), me)).toEqual([]);
    expect(availableActions(task("IN_REVIEW", "someone", "me"), me)).toEqual(["approve", "request_changes"]);
  });

  it("offers nothing on someone else's task", () => {
    expect(availableActions(task("IN_PROGRESS", "other"), me)).toEqual([]);
  });

  it("never offers a manager 'Submit for review' on someone else's task", () => {
    const pm = { id: "pm", role: "PROJECT_MANAGER" as const };
    expect(availableActions(task("IN_PROGRESS", "dev"), pm)).toEqual(["complete", "block"]);
    expect(availableActions(task("TODO", "dev"), pm)).toEqual(["start"]);
  });
});
