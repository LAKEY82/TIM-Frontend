"use client";

import { Briefcase, FolderKanban, LayoutDashboard, ListChecks, Loader2, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/queries/use-misc";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/api";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/permissions";

const CommandSearchContext = createContext<{ open: () => void } | null>(null);

export function useCommandSearch() {
  const ctx = useContext(CommandSearchContext);
  if (!ctx) throw new Error("useCommandSearch must be used within CommandSearchProvider");
  return ctx;
}

/** Owns the palette state and the global Cmd/Ctrl+K shortcut. */
export function CommandSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  return (
    <CommandSearchContext.Provider value={value}>
      {children}
      <CommandSearchDialog open={open} onOpenChange={setOpen} />
    </CommandSearchContext.Provider>
  );
}

export function CommandSearchTrigger() {
  const { open } = useCommandSearch();
  return (
    <>
      <Button
        variant="outline"
        onClick={open}
        className="hidden h-8 w-64 justify-start gap-2 text-muted-foreground sm:flex"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left font-normal">Search…</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" onClick={open} className="sm:hidden" aria-label="Search">
        <Search />
      </Button>
    </>
  );
}

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Day", href: "/my-day", icon: Sun },
  { label: "My Tasks", href: "/tasks", icon: ListChecks },
  { label: "Projects", href: "/projects", icon: FolderKanban },
];

function CommandSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  // Results come from /api/search, which applies the caller's permissions server-side.
  const { data, isFetching, isError, error } = useSearch(debounced);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  const hasQuery = debounced.trim().length >= 2;
  const total = data ? data.projects.length + data.tasks.length + data.people.length + data.clients.length : 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search projects, tasks, people and clients" className="sm:max-w-xl">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search projects, tasks, people, clients…" value={query} onValueChange={setQuery} />
        <CommandList className="max-h-[60vh]">
          {!hasQuery ? (
            <CommandGroup heading="Go to">
              {QUICK_LINKS.map((link) => (
                <CommandItem key={link.href} value={link.href} onSelect={() => go(link.href)}>
                  <link.icon /> {link.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasQuery && isFetching && !data ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : null}
          {hasQuery && isError ? <p className="py-6 text-center text-sm text-destructive">{getErrorMessage(error)}</p> : null}
          {hasQuery && data && total === 0 && !isFetching ? <CommandEmpty>No results for “{debounced}”.</CommandEmpty> : null}

          {hasQuery && data && data.projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {data.projects.map((p) => (
                <CommandItem key={`p-${p.id}`} value={`project-${p.id}`} onSelect={() => go(`/projects/${p.id}`)}>
                  <FolderKanban />
                  <span className="truncate">{p.name}</span>
                  {p.clientName ? <span className="truncate text-xs text-muted-foreground">{p.clientName}</span> : null}
                  {p.status ? <CommandShortcut>{PROJECT_STATUS_META[p.status].label}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasQuery && data && data.tasks.length > 0 ? (
            <CommandGroup heading="Tasks">
              {data.tasks.map((t) => (
                <CommandItem key={`t-${t.id}`} value={`task-${t.id}`} onSelect={() => go(`/tasks/${t.id}`)}>
                  <ListChecks />
                  <span className="truncate">{t.title}</span>
                  {t.projectName ? <span className="truncate text-xs text-muted-foreground">{t.projectName}</span> : null}
                  {t.status ? (
                    <span className="ml-auto">
                      <TaskStatusBadge status={t.status} />
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasQuery && data && data.people.length > 0 ? (
            <CommandGroup heading="People">
              {data.people.map((u) => (
                <CommandItem key={`u-${u.id}`} value={`user-${u.id}`} onSelect={() => go(`/team/${u.id}`)}>
                  <UserAvatar user={u} size="xs" />
                  <span className="truncate">{u.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[u.role ? ROLE_LABELS[u.role] : null, u.departmentName].filter(Boolean).join(" · ")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasQuery && data && data.clients.length > 0 ? (
            <CommandGroup heading="Clients">
              {data.clients.map((c) => (
                <CommandItem key={`c-${c.id}`} value={`client-${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                  <Briefcase /> <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
