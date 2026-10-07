import { describe, expect, it } from "vitest";
import { parseTaskLines } from "@/components/projects/task-breakdown-dialog";
import { stageHint } from "@/components/projects/project-workflow";
import { availableActions, statusOptions } from "@/lib/task-workflow";

describe("breaking a project into tasks", () => {
  it("turns pasted bullet, numbered and checkbox lists into task names", () => {
    const pasted = ["- Login page UI", "* Login API", "• Password reset", "1. Write tests", "2) Deploy", "- [ ] Docs", "[x] Done item", "", "   ", "Plain line"].join("\n");
    expect(parseTaskLines(pasted)).toEqual(["Login page UI", "Login API", "Password reset", "Write tests", "Deploy", "Docs", "Done item", "Plain line"]);
  });

  it("offers status moves that match each person's role", () => {
    const task = { status: "TODO" as const, assignee: { id: "dev", name: "Dev" }, reviewer: { id: "pm", name: "PM" } };
    expect(statusOptions(task, { id: "dev", role: "EMPLOYEE" })).toEqual(["IN_PROGRESS", "IN_REVIEW"]);
    expect(statusOptions(task, { id: "someone", role: "EMPLOYEE" })).toEqual([]);
    // Managers can set any status (including sending it to QA) except "In review", which only the assigned developer can choose.
    expect(statusOptions(task, { id: "pm", role: "PROJECT_MANAGER" })).toEqual(["IN_PROGRESS", "BLOCKED", "COMPLETED", "IN_QA", "CHANGES_REQUESTED", "APPROVED"]);
    expect(statusOptions(task, { id: "dev", role: "ADMIN" })).toContain("IN_REVIEW");
    const inReview = { ...task, status: "IN_REVIEW" as const };
    expect(statusOptions(inReview, { id: "pm", role: "EMPLOYEE" })).toEqual(["APPROVED", "CHANGES_REQUESTED"]);
  });
});

describe("QA stage", () => {
  const inQa = { status: "IN_QA" as const, assignee: { id: "dev", name: "Dev" }, reviewer: { id: "pm", name: "PM" }, qa: { id: "qa", name: "QA" } };

  it("gives the project's QA Pass / Report bugs, and nobody else on the team", () => {
    expect(availableActions(inQa, { id: "qa", role: "EMPLOYEE" })).toEqual(["qa_pass", "qa_fail"]);
    expect(statusOptions(inQa, { id: "qa", role: "EMPLOYEE" })).toEqual(["APPROVED", "CHANGES_REQUESTED"]);
    expect(availableActions(inQa, { id: "dev", role: "EMPLOYEE" })).toEqual([]);
    expect(statusOptions(inQa, { id: "dev", role: "EMPLOYEE" })).toEqual([]);
    expect(availableActions(inQa, { id: "other", role: "EMPLOYEE" })).toEqual([]);
  });

  it("lets a manager stand in for QA and send any task to QA; developers can't skip review", () => {
    expect(statusOptions(inQa, { id: "pm", role: "PROJECT_MANAGER" })).toEqual(["APPROVED", "CHANGES_REQUESTED"]);
    const todo = { ...inQa, status: "TODO" as const };
    expect(statusOptions(todo, { id: "pm", role: "PROJECT_MANAGER" })).toContain("IN_QA");
    const inReview = { ...inQa, status: "IN_REVIEW" as const };
    expect(statusOptions(inReview, { id: "pm", role: "PROJECT_MANAGER" })).toContain("IN_QA");
    expect(statusOptions(todo, { id: "dev", role: "EMPLOYEE" })).not.toContain("IN_QA");
  });
});

describe("workflow stages", () => {
  const dev = { id: "dev", role: "EMPLOYEE" as const };
  const qaUser = { id: "qa", role: "EMPLOYEE" as const };

  it("locks a waiting stage for its assignee", () => {
    const waiting = { status: "WAITING" as const, stage: "FRONTEND" as const, assignee: { id: "dev", name: "Dev" }, reviewer: null, qa: null };
    expect(availableActions(waiting, dev)).toEqual([]);
    expect(statusOptions(waiting, dev)).toEqual([]);
  });

  it("lets the QA work the QA stage even though it is assigned to them", () => {
    const qaStage = { status: "IN_QA" as const, stage: "QA" as const, assignee: { id: "qa", name: "QA" }, reviewer: null, qa: { id: "qa", name: "QA" } };
    expect(availableActions(qaStage, qaUser)).toEqual(["qa_pass", "qa_fail"]);
    expect(statusOptions(qaStage, qaUser)).toEqual(["APPROVED", "CHANGES_REQUESTED"]);
  });

  it("explains where each stage stands", () => {
    const base = { id: "t", title: "x", priority: "MEDIUM" as const, tags: [] };
    const design = { ...base, stage: "DESIGN" as const, status: "IN_REVIEW" as const, reviewer: { id: "pm", name: "Pam PM" } };
    const frontend = { ...base, stage: "FRONTEND" as const, status: "WAITING" as const };
    const qa = { ...base, stage: "QA" as const, status: "WAITING" as const };
    const fixing = { ...base, stage: "BUG_FIXING" as const, status: "IN_PROGRESS" as const, assignee: { id: "dev", name: "Dev" }, subtaskCount: 3, completedSubtaskCount: 1 };
    const all = [design, frontend, qa, fixing];
    expect(stageHint(design, all)).toBe("Waiting for Pam PM to approve.");
    expect(stageHint(frontend, all)).toBe("Opens when Design is approved.");
    expect(stageHint(qa, all)).toBe("Waiting for the bug fixes to be approved, then retest.");
    expect(stageHint(fixing, all)).toBe("Dev is working on it. · 1/3 bugs fixed");
  });
});

describe("stage subtasks", () => {
  const dev = { id: "dev", role: "EMPLOYEE" as const };
  const pm = { id: "pm", role: "PROJECT_MANAGER" as const };

  it("developers send their work for review but only the project manager completes it", () => {
    const sub = { status: "IN_PROGRESS" as const, assignee: { id: "dev", name: "Dev" }, reviewer: null, qa: null, type: "FEATURE" as const };
    expect(statusOptions(sub, dev)).toEqual(["TODO", "BLOCKED", "IN_REVIEW"]);
    expect(availableActions(sub, dev)).not.toContain("complete");
    expect(statusOptions(sub, pm)).toContain("COMPLETED");
    // QA bug items are ticked off by the developer.
    const bug = { ...sub, type: "BUG" as const };
    expect(statusOptions(bug, dev)).toContain("COMPLETED");
    expect(availableActions(bug, dev)).toContain("complete");
  });

  it("a stage with subtasks moves on its own; the PM sends it to Testing and approves it once Tested", () => {
    const stage = { status: "COMPLETED" as const, stage: "FRONTEND" as const, subtaskCount: 2, assignee: { id: "dev", name: "Dev" }, reviewer: null, qa: { id: "qa", name: "QA" } };
    expect(statusOptions(stage, dev)).toEqual([]);
    expect(statusOptions(stage, pm)).toContain("IN_QA");
    expect(statusOptions({ ...stage, status: "IN_QA" as const }, { id: "qa", role: "EMPLOYEE" as const })).toEqual([]); // QA tests the subtasks
    expect(availableActions({ ...stage, status: "TESTED" as const }, pm)).toEqual(["approve"]);
    expect(statusOptions(stage, pm)).not.toContain("TESTED");
  });
});

