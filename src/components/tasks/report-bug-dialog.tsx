"use client";

import { useState } from "react";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/queries/use-projects";
import { useTasks } from "@/hooks/queries/use-tasks";
import { PROJECT_STATUS_META, TASK_STATUS_META } from "@/lib/constants";
import type { ID, TaskStatus, TaskSummary } from "@/types/domain";
import { QaBugsDialog } from "./qa-bugs-dialog";

/** Work QA can report bugs on: being tested now, or finished (even on a completed project). */
const REPORTABLE: readonly TaskStatus[] = ["IN_QA", "COMPLETED", "TESTED", "APPROVED"];
const FINISHED: readonly TaskStatus[] = ["COMPLETED", "TESTED", "APPROVED"];

/**
 * "Report bug" from My bugs: the QA picks one of the projects they test (any
 * status, completed ones included) and the task the bug is in, then describes it.
 */
export function ReportBugDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [projectId, setProjectId] = useState<ID | null>(null);
  const [taskId, setTaskId] = useState<ID | null>(null);
  const [reporting, setReporting] = useState<TaskSummary | null>(null);
  const projects = useProjects({ qaId: "me", sortBy: "name", sortOrder: "asc", pageSize: 200 });
  const tasks = useTasks({ projectId: projectId ?? undefined, status: REPORTABLE, sortBy: "title", sortOrder: "asc", pageSize: 500 }, { enabled: Boolean(projectId) });
  // Bugs themselves aren't where new bugs are reported.
  const candidates = (tasks.data?.items ?? []).filter((t) => !t.issueKind);
  const chosen = candidates.find((t) => t.id === taskId) ?? null;

  const close = () => {
    setProjectId(null);
    setTaskId(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a bug</DialogTitle>
            <DialogDescription>Choose where you found it. Finished work and completed projects can still get bug reports.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="report-project">Project</Label>
              <SelectField
                id="report-project"
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  setTaskId(null);
                }}
                placeholder={projects.isLoading ? "Loading…" : projects.data?.items.length ? "Select a project" : "You don't test any projects yet"}
                disabled={!projects.data?.items.length}
                options={(projects.data?.items ?? []).map((p) => ({
                  value: p.id,
                  label: p.status === "COMPLETED" || p.status === "CANCELLED" ? `${p.name} (${PROJECT_STATUS_META[p.status].label})` : p.name,
                }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-task">Found in</Label>
              <SelectField
                id="report-task"
                value={taskId}
                onChange={setTaskId}
                placeholder={!projectId ? "Choose a project first" : tasks.isLoading ? "Loading…" : candidates.length ? "Select a task" : "Nothing tested or finished yet"}
                disabled={!projectId || !candidates.length}
                options={candidates.map((t) => ({ value: t.id, label: `${t.title} · ${TASK_STATUS_META[t.status].label}` }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!chosen}
              onClick={() => {
                setReporting(chosen);
                close();
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {reporting ? (
        <QaBugsDialog
          taskId={reporting.id}
          taskTitle={reporting.title}
          stage={reporting.stage}
          finished={FINISHED.includes(reporting.status)}
          open
          onOpenChange={(next) => !next && setReporting(null)}
        />
      ) : null}
    </>
  );
}
