"use client";

import { Bug, Gauge, Lightbulb, MessageSquareWarning, Palette, Paperclip, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isImageFile } from "@/components/shared/attachment-list";
import type { Attachment, QaIssue, QaIssueKind } from "@/types/domain";

export const QA_ISSUE_META: Record<QaIssueKind, { label: string; badge: string; ink: string }> = {
  BUG: { label: "Bug", badge: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300", ink: "text-red-600 dark:text-red-400" },
  DEFECT: { label: "Defect", badge: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300", ink: "text-orange-600 dark:text-orange-400" },
  ISSUE: { label: "Issue", badge: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300", ink: "text-amber-600 dark:text-amber-400" },
  UI: { label: "UI/UX", badge: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300", ink: "text-violet-600 dark:text-violet-400" },
  PERFORMANCE: { label: "Performance", badge: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300", ink: "text-sky-600 dark:text-sky-400" },
  SECURITY: { label: "Security", badge: "border-rose-600/30 bg-rose-600/10 text-rose-800 dark:text-rose-300", ink: "text-rose-700 dark:text-rose-400" },
  IMPROVEMENT: { label: "Improvement", badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", ink: "text-emerald-600 dark:text-emerald-400" },
};

export const QA_ISSUE_ICONS: Record<QaIssueKind, LucideIcon> = {
  BUG: Bug,
  DEFECT: TriangleAlert,
  ISSUE: MessageSquareWarning,
  UI: Palette,
  PERFORMANCE: Gauge,
  SECURITY: ShieldAlert,
  IMPROVEMENT: Lightbulb,
};

export function QaIssueBadge({ kind, className }: { kind: QaIssueKind; className?: string }) {
  const Icon = QA_ISSUE_ICONS[kind];
  return (
    <Badge variant="outline" className={cn("gap-1", QA_ISSUE_META[kind].badge, className)}>
      <Icon className="size-3" aria-hidden />
      {QA_ISSUE_META[kind].label}
    </Badge>
  );
}

/** The QA report on an issue subtask: what to do to see it, and what should happen instead. */
export function QaIssueCard({ issue, attachments = [] }: { issue: QaIssue; attachments?: Attachment[] }) {
  const images = attachments.filter(isImageFile);
  const files = attachments.filter((a) => !isImageFile(a));
  const steps = (issue.steps ?? "")
    .split("\n")
    .map((s) => s.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);
  return (
    <SectionCard
      title="QA report"
      action={
        <div className="flex items-center gap-2">
          <QaIssueBadge kind={issue.kind} />
          {issue.reportedBy ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserAvatar user={issue.reportedBy} size="xs" /> {issue.reportedBy.name}
            </span>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Steps to reproduce</h3>
          {steps.length ? (
            <ol className="list-decimal space-y-0.5 pl-5">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">Not provided.</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
            <h3 className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Expected</h3>
            <p className="whitespace-pre-wrap">{issue.expected || <span className="text-muted-foreground">Not provided.</span>}</p>
          </div>
          <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
            <h3 className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Actual</h3>
            <p className="whitespace-pre-wrap">{issue.actual || <span className="text-muted-foreground">Not provided.</span>}</p>
          </div>
        </div>
        {images.length ? (
          <div>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Screenshots</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((img) => (
                <li key={img.id}>
                  <a href={img.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border hover:ring-2 hover:ring-ring">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on external storage */}
                    <img src={img.url} alt={img.fileName} className="aspect-video w-full object-cover" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {files.length ? (
          <div>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Files</h3>
            <ul className="flex flex-wrap gap-2">
              {files.map((f) => (
                <li key={f.id}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <Paperclip className="size-3.5 text-muted-foreground" aria-hidden />
                    {f.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {issue.environment ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Environment:</span> {issue.environment}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
