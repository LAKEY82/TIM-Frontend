"use client";

import { ChevronDown, ChevronRight, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { FormError } from "@/components/forms/form-field";
import { PrioritySelect } from "@/components/tasks/inline-pickers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQaReport } from "@/hooks/queries/use-tasks";
import { getErrorMessage, isApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QA_ISSUE_KINDS, type ID, type Priority, type QaIssueKind, type WorkflowStage } from "@/types/domain";
import { QA_ISSUE_ICONS, QA_ISSUE_META } from "./qa-issue";

/** Screenshots, recordings and logs QA can attach (the API rejects anything else). */
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,video/mp4,application/pdf,text/plain";
const MAX_FILE_MB = 25;
const MAX_FILES = 8;

interface IssueRow {
  key: number;
  kind: QaIssueKind;
  title: string;
  priority: Priority;
  steps: string;
  expected: string;
  actual: string;
  environment: string;
  files: File[];
  open: boolean;
}

let nextKey = 1;
const newIssue = (environment = ""): IssueRow => ({
  key: nextKey++,
  kind: "BUG",
  title: "",
  priority: "HIGH",
  steps: "",
  expected: "",
  actual: "",
  environment,
  files: [],
  open: true,
});

/** "Chrome 129 · Windows" from the tester's own browser, as a starting point for the environment. */
export function describeBrowser(ua: string): string {
  const browser =
    /Edg\/(\d+)/.exec(ua)?.[1] !== undefined
      ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`
      : /Chrome\/(\d+)/.exec(ua)
        ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`
        : /Firefox\/(\d+)/.exec(ua)
          ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`
          : /Version\/(\d+).*Safari/.exec(ua)
            ? `Safari ${/Version\/(\d+).*Safari/.exec(ua)![1]}`
            : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ");
}

const browserEnvironment = () => (typeof navigator === "undefined" ? "" : describeBrowser(navigator.userAgent));

interface QaBugsDialogProps {
  taskId: ID;
  taskTitle: string;
  /** The workflow's QA stage sends issues to the Bug fixing stage. */
  stage?: WorkflowStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * QA reports what they found: bugs, defects, UI problems and so on, each with
 * a priority, steps to reproduce, expected vs actual result, environment and
 * screenshots. Each becomes a subtask for the developer, and the task goes
 * back to them.
 */
export function QaBugsDialog({ taskId, taskTitle, stage, open, onOpenChange }: QaBugsDialogProps) {
  const fail = useQaReport();
  // The environment starts from the tester's own browser.
  const [issues, setIssues] = useState<IssueRow[]>(() => [newIssue(browserEnvironment())]);
  const [error, setError] = useState<string | null>(null);

  const filled = issues.filter((b) => b.title.trim());
  const update = (key: number, patch: Partial<IssueRow>) => setIssues((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const fileCount = filled.reduce((n, b) => n + b.files.length, 0);

  const reset = () => {
    setIssues([newIssue(browserEnvironment())]);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!filled.length) return setError("Describe at least one issue.");
    const short = filled.find((b) => b.title.trim().length < 3);
    if (short) return setError("Each issue needs a summary of at least 3 characters.");
    try {
      await fail.mutateAsync({
        id: taskId,
        bugs: filled.map((b) => ({
          kind: b.kind,
          title: b.title.trim(),
          priority: b.priority,
          steps: b.steps.trim() || null,
          expected: b.expected.trim() || null,
          actual: b.actual.trim() || null,
          environment: b.environment.trim() || null,
          files: b.files,
        })),
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(isApiError(e) && Object.values(e.fieldErrors)[0] ? Object.values(e.fieldErrors)[0]! : getErrorMessage(e));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (fail.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Report issues</DialogTitle>
          <DialogDescription>
            Log what you found and keep testing <span className="font-medium text-foreground">{taskTitle}</span>: you can report more at any time. When
            you&apos;re done, choose <span className="font-medium text-foreground">QA complete</span> and everything you logged goes to{" "}
            {stage === "QA" ? "the Bug fixing stage" : "the developer"} together.
          </DialogDescription>
        </DialogHeader>

        <FormError message={error} />

        <ol className="space-y-3">
          {issues.map((issue, i) => (
            <IssueCard
              key={issue.key}
              issue={issue}
              index={i}
              onChange={(patch) => update(issue.key, patch)}
              onRemove={() => setIssues((list) => (list.length > 1 ? list.filter((b) => b.key !== issue.key) : [newIssue(issue.environment)]))}
              onError={setError}
            />
          ))}
        </ol>
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            // Testing usually happens in one environment: carry it over.
            onClick={() => setIssues((list) => [...list.map((b) => ({ ...b, open: false })), newIssue(list.at(-1)?.environment ?? "")])}
          >
            <Plus /> Add another issue
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={fail.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void submit()} disabled={fail.isPending || !filled.length}>
            {fail.isPending ? <Loader2 className="animate-spin" /> : null}
            {fail.isPending && fileCount ? "Uploading…" : `Log ${filled.length || ""} issue${filled.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueCard({
  issue,
  index,
  onChange,
  onRemove,
  onError,
}: {
  issue: IssueRow;
  index: number;
  onChange: (patch: Partial<IssueRow>) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const n = index + 1;
  const fileInput = useRef<HTMLInputElement>(null);
  const Icon = QA_ISSUE_ICONS[issue.kind];

  const addFiles = (list: FileList | File[]) => {
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) onError(`${tooBig.name} is larger than ${MAX_FILE_MB} MB.`);
    const ok = incoming.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    const room = MAX_FILES - issue.files.length;
    if (ok.length > room) onError(`Up to ${MAX_FILES} files per issue.`);
    if (ok.length && room > 0) onChange({ files: [...issue.files, ...ok.slice(0, room)] });
  };

  return (
    <li
      className="space-y-3 rounded-lg border p-3"
      // Paste screenshots straight from the clipboard.
      onPaste={(e) => {
        const images = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
        if (images.length) {
          e.preventDefault();
          addFiles(images.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `screenshot-${Date.now()}-${i + 1}.png`, { type: f.type }))));
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select value={issue.kind} onValueChange={(v) => onChange({ kind: v as QaIssueKind })}>
          <SelectTrigger size="sm" className="w-36" aria-label={`Issue ${n} type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QA_ISSUE_KINDS.map((k) => {
              const KIcon = QA_ISSUE_ICONS[k];
              return (
                <SelectItem key={k} value={k}>
                  <KIcon className={QA_ISSUE_META[k].ink} /> {QA_ISSUE_META[k].label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Input
          value={issue.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={index === 0 ? "e.g. Total ignores the coupon at checkout" : "What's wrong?"}
          aria-label={`Issue ${n} summary`}
          autoFocus={index === 0}
          className="min-w-48 flex-1"
        />
        <PrioritySelect value={issue.priority} onChange={(priority) => onChange({ priority })} />
        <Button type="button" variant="ghost" size="icon-sm" aria-label={issue.open ? `Collapse issue ${n}` : `Expand issue ${n}`} onClick={() => onChange({ open: !issue.open })}>
          {issue.open ? <ChevronDown /> : <ChevronRight />}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove issue ${n}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      {issue.open ? (
        <div className="grid gap-3 pl-0.5">
          <div className="grid gap-1.5">
            <Label htmlFor={`issue-${issue.key}-steps`} className="text-xs">
              Steps to reproduce
            </Label>
            <Textarea
              id={`issue-${issue.key}-steps`}
              rows={3}
              value={issue.steps}
              onChange={(e) => onChange({ steps: e.target.value })}
              placeholder={"1. Go to …\n2. Click …\n3. See the error"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`issue-${issue.key}-expected`} className="text-xs">
                Expected result
              </Label>
              <Textarea id={`issue-${issue.key}-expected`} rows={2} value={issue.expected} onChange={(e) => onChange({ expected: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`issue-${issue.key}-actual`} className="text-xs">
                Actual result
              </Label>
              <Textarea id={`issue-${issue.key}-actual`} rows={2} value={issue.actual} onChange={(e) => onChange({ actual: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`issue-${issue.key}-env`} className="text-xs">
              Environment
            </Label>
            <Input
              id={`issue-${issue.key}-env`}
              value={issue.environment}
              onChange={(e) => onChange({ environment: e.target.value })}
              placeholder="Browser · OS · device · build or URL"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={issue.files.length >= MAX_FILES}>
                <ImagePlus /> Attach screenshots
              </Button>
              <span className="text-xs text-muted-foreground">or paste an image here · images, video, PDF or logs up to {MAX_FILE_MB} MB</span>
            </div>
            {issue.files.length ? (
              <ul className="flex flex-wrap gap-2" aria-label={`Issue ${n} attachments`}>
                {issue.files.map((file, i) => (
                  <FileChip key={`${file.name}-${i}`} file={file} onRemove={() => onChange({ files: issue.files.filter((_, j) => j !== i) })} />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className={cn("size-3.5", QA_ISSUE_META[issue.kind].ink)} aria-hidden />
          {[issue.steps ? "Steps" : null, issue.expected || issue.actual ? "Expected / actual" : null, issue.files.length ? `${issue.files.length} file${issue.files.length === 1 ? "" : "s"}` : null]
            .filter(Boolean)
            .join(" · ") || "No details yet"}
        </p>
      )}
    </li>
  );
}

/** A local preview URL, or null where previews aren't available (the chip then shows the file type). */
function previewUrl(file: File): string | null {
  try {
    return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
  } catch {
    return null;
  }
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  return (
    <li className="group relative flex items-center gap-2 rounded-md border bg-muted/30 p-1 pr-7 text-xs">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview of a file that isn't uploaded yet
        <img
          alt={file.name}
          className="size-12 rounded bg-muted object-cover"
          // The preview URL lives exactly as long as the element (safe under Strict Mode's double mount).
          ref={(el) => {
            const url = el ? previewUrl(file) : null;
            if (!el || !url) return;
            el.src = url;
            return () => URL.revokeObjectURL(url);
          }}
        />
      ) : (
        <span className="flex size-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground uppercase">{file.name.split(".").pop()}</span>
      )}
      <span className="max-w-32">
        <span className="block truncate">{file.name}</span>
        <span className="text-muted-foreground">{formatBytes(file.size)}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${file.name}`}
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}
