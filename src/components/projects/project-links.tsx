"use client";

import { Copy, ExternalLink, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddProjectLink, useProjectLinks, useRemoveProjectLink } from "@/hooks/queries/use-projects";
import { usePermission } from "@/hooks/use-permission";
import { getErrorMessage, isApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import type { ID, ProjectLink, ProjectLinkKind } from "@/types/domain";
import { LinkLogo, linkKindFromUrl } from "./link-logo";

const GROUPS: { kind: ProjectLinkKind; title: string; description: string }[] = [
  { kind: "FIGMA", title: "Design", description: "Figma files and prototypes" },
  { kind: "GITHUB", title: "Code", description: "GitHub repositories, pull requests and issues" },
  { kind: "OTHER", title: "Other links", description: "Docs, drives, staging sites and anything else" },
];

/** "github.com/theiavora/tim-backend" — the link without its protocol, for a quick read. */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/**
 * /projects/[id]/links: the project's Figma designs, GitHub code and other links,
 * grouped and shown with their logos. Anyone on the project can add one.
 */
export function ProjectLinks({ projectId }: { projectId: ID }) {
  const query = useProjectLinks(projectId);
  const [removing, setRemoving] = useState<ProjectLink | null>(null);
  const remove = useRemoveProjectLink(projectId);
  const links = query.data ?? [];

  return (
    <div className="space-y-6">
      <AddLinkForm projectId={projectId} />

      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load links." onRetry={() => void query.refetch()} />
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No links yet."
          description="Add the project's Figma designs, GitHub repository and other useful links above."
        />
      ) : (
        GROUPS.map((group) => {
          const items = links.filter((l) => l.kind === group.kind);
          if (!items.length) return null;
          return (
            <section key={group.kind} aria-labelledby={`links-${group.kind}`} className="space-y-3">
              <div className="flex items-center gap-2">
                <LinkLogo kind={group.kind} className="size-4" />
                <h2 id={`links-${group.kind}`} className="text-sm font-semibold">
                  {group.title}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} · {group.description}
                </span>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((link) => (
                  <LinkCard key={link.id} link={link} onRemove={() => setRemoving(link)} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this link?"
        description={removing ? `“${removing.title}” will be removed from the project.` : undefined}
        confirmLabel="Remove link"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      />
    </div>
  );
}

function AddLinkForm({ projectId }: { projectId: ID }) {
  const add = useAddProjectLink(projectId);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const kind = linkKindFromUrl(url.trim());

  const submit = async () => {
    setError(null);
    if (!kind) return setError("Paste the full link, starting with https://");
    try {
      await add.mutateAsync({ url: url.trim(), title: title.trim() || undefined });
      setUrl("");
      setTitle("");
    } catch (e) {
      setError(isApiError(e) && Object.values(e.fieldErrors)[0] ? Object.values(e.fieldErrors)[0]! : getErrorMessage(e));
    }
  };

  return (
    <SectionCard title="Add a link" description="Figma and GitHub links are recognised automatically.">
      <form
        className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="link-url">Link</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
              <LinkLogo kind={kind ?? "OTHER"} className="size-4" />
            </span>
            <Input
              id="link-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.figma.com/design/… or https://github.com/…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="link-title">
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Checkout designs" />
        </div>
        <Button type="submit" disabled={!url.trim() || add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add link
        </Button>
      </form>
      <div className="mt-3">
        <FormError message={error} />
      </div>
    </SectionCard>
  );
}

function LinkCard({ link, onRemove }: { link: ProjectLink; onRemove: () => void }) {
  const { user } = useAuth();
  const canManageProject = usePermission("projects:update");
  // Whoever added it, or the project manager (the API decides for sure).
  const canRemove = Boolean(user && (link.addedBy?.id === user.id || canManageProject));

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60"
        aria-label={`Open ${link.title}`}
        tabIndex={-1}
      >
        <LinkLogo kind={link.kind} className="size-6" />
      </a>
      <div className="min-w-0 flex-1">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:underline">
          {link.title}
        </a>
        <p className="truncate text-xs text-muted-foreground" title={link.url}>
          {shortUrl(link.url)}
        </p>
        {link.addedBy ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Added by {link.addedBy.name}
            {link.createdAt ? ` · ${formatRelative(link.createdAt)}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${link.title} in a new tab`}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy link to ${link.title}`}
          onClick={() => void navigator.clipboard?.writeText(link.url).then(() => toast.success("Link copied."))}
        >
          <Copy />
        </Button>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${link.title}`} onClick={onRemove}>
            <Trash2 />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
