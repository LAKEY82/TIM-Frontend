"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useQuickUpdateTask, useTask } from "@/hooks/queries/use-tasks";
import { getErrorMessage, isApiError } from "@/lib/api";
import { QA_ISSUE_KINDS, type ID, type Priority, type QaIssueKind, type Task } from "@/types/domain";
import { DueDateSelect, PrioritySelect } from "./inline-pickers";
import { QA_ISSUE_ICONS, QA_ISSUE_META } from "./qa-issue";

/** QA edits a bug they reported: the summary, type, priority, fix-by date and the report itself. */
export function BugEditDialog({ bugId, onOpenChange }: { bugId: ID | null; onOpenChange: (open: boolean) => void }) {
  const query = useTask(bugId ?? "");
  return (
    <Dialog open={Boolean(bugId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit bug</DialogTitle>
          <DialogDescription>Changes are visible to the developer straight away. A new fix-by date notifies them.</DialogDescription>
        </DialogHeader>
        {query.data && query.data.id === bugId ? (
          // Keyed so the form starts from the bug that was opened.
          <BugForm key={query.data.id} bug={query.data} onDone={() => onOpenChange(false)} />
        ) : query.isError ? (
          <FormError message={getErrorMessage(query.error)} />
        ) : (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BugForm({ bug, onDone }: { bug: Task; onDone: () => void }) {
  const update = useQuickUpdateTask();
  const [title, setTitle] = useState(bug.title);
  const [kind, setKind] = useState<QaIssueKind>(bug.qaIssue?.kind ?? "BUG");
  const [priority, setPriority] = useState<Priority>(bug.priority);
  const [dueDate, setDueDate] = useState<string | null>(bug.dueDate ?? null);
  const [steps, setSteps] = useState(bug.qaIssue?.steps ?? "");
  const [expected, setExpected] = useState(bug.qaIssue?.expected ?? "");
  const [actual, setActual] = useState(bug.qaIssue?.actual ?? "");
  const [environment, setEnvironment] = useState(bug.qaIssue?.environment ?? "");
  const [description, setDescription] = useState(bug.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (title.trim().length < 3) return setError("The summary needs at least 3 characters.");
    try {
      await update.mutateAsync({
        id: bug.id,
        input: {
          title: title.trim(),
          priority,
          dueDate,
          description: description.trim() || null,
          ...(bug.qaIssue
            ? { qaIssue: { kind, steps: steps.trim() || null, expected: expected.trim() || null, actual: actual.trim() || null, environment: environment.trim() || null } }
            : {}),
        },
        optimistic: { title: title.trim(), priority, dueDate, issueKind: kind },
      });
      toast.success("Bug updated.");
      onDone();
    } catch (e) {
      setError(isApiError(e) && Object.values(e.fieldErrors)[0] ? Object.values(e.fieldErrors)[0]! : getErrorMessage(e));
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <FormError message={error} />
      <div className="grid gap-1.5">
        <Label htmlFor="bug-title">Summary</Label>
        <Input id="bug-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {bug.qaIssue ? (
          <div className="grid gap-1.5">
            <Label htmlFor="bug-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as QaIssueKind)}>
              <SelectTrigger id="bug-kind" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QA_ISSUE_KINDS.map((k) => {
                  const Icon = QA_ISSUE_ICONS[k];
                  return (
                    <SelectItem key={k} value={k}>
                      <Icon className={QA_ISSUE_META[k].ink} /> {QA_ISSUE_META[k].label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Priority</span>
          <PrioritySelect value={priority} onChange={setPriority} />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Fix by</span>
          <div className="flex h-9 items-center">
            <DueDateSelect value={dueDate} onChange={setDueDate} status={bug.status} label="fix-by date" />
          </div>
        </div>
      </div>

      {bug.qaIssue ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="bug-steps">Steps to reproduce</Label>
            <Textarea id="bug-steps" rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={5000} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bug-expected">Expected result</Label>
              <Textarea id="bug-expected" rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={2000} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bug-actual">Actual result</Label>
              <Textarea id="bug-actual" rows={2} value={actual} onChange={(e) => setActual(e.target.value)} maxLength={2000} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bug-env">Environment</Label>
            <Input id="bug-env" value={environment} onChange={(e) => setEnvironment(e.target.value)} maxLength={300} placeholder="Browser · OS · device · build or URL" />
          </div>
        </>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="bug-notes">Notes</Label>
        <Textarea id="bug-notes" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
