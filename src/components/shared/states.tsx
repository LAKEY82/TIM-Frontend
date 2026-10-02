"use client";

import { AlertTriangle, FileQuestion, Inbox, Lock, RefreshCw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getErrorMessage, isApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed text-center",
        compact ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-12",
        className,
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Renders the right panel for an API failure: 403 → permission denied,
 * 404 → not found, otherwise a retryable error.
 */
export function ErrorState({ error, title = "Unable to load data.", onRetry, className, compact }: ErrorStateProps) {
  if (isApiError(error) && error.isForbidden) return <ForbiddenState className={className} compact={compact} />;
  if (isApiError(error) && error.isNotFound) return <NotFoundState className={className} compact={compact} />;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <AlertTriangle className="size-5 text-destructive" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {error ? <p className="max-w-md text-sm text-muted-foreground">{getErrorMessage(error)}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function ForbiddenState({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <EmptyState
      icon={Lock}
      className={className}
      compact={compact}
      title="Permission denied"
      description="You don't have access to this. If you think this is a mistake, contact an administrator."
    />
  );
}

export function NotFoundState({
  className,
  compact,
  title = "Not found",
  description = "This item doesn't exist or may have been removed.",
}: {
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      className={className}
      compact={compact}
      title={title}
      description={description}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
