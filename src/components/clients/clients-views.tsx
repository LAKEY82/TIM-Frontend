"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Globe, Loader2, Mail, Pencil, Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { ProjectCard } from "@/components/projects/project-card";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DataPagination } from "@/components/shared/data-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DetailSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useActivity, useClient, useClients, useSaveClient } from "@/hooks/queries/use-misc";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermission } from "@/hooks/use-permission";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { formatDate } from "@/lib/format";
import type { Client, ID } from "@/types/domain";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(150),
  contactName: z.string().max(150),
  email: z.string().trim().email("Enter a valid email.").or(z.literal("")),
  phone: z.string().max(40),
  website: z.string().trim().url("Enter a full URL, e.g. https://example.com").or(z.literal("")),
  industry: z.string().max(100),
  notes: z.string().max(5000),
});
type ClientValues = z.infer<typeof clientSchema>;

function ClientDialog({ client, open, onOpenChange }: { client?: Client; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    values: {
      name: client?.name ?? "",
      contactName: client?.contactName ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      website: client?.website ?? "",
      industry: client?.industry ?? "",
      notes: client?.notes ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync({
        id: client?.id,
        input: {
          name: v.name.trim(),
          contactName: emptyToNull(v.contactName),
          email: emptyToNull(v.email),
          phone: emptyToNull(v.phone),
          website: emptyToNull(v.website),
          industry: emptyToNull(v.industry),
          notes: emptyToNull(v.notes),
        },
      });
      onOpenChange(false);
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["name", "contactName", "email", "phone", "website", "industry", "notes"]));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>Client contact details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="client-name" label="Name" error={errors.name?.message} required>
            <Input id="client-name" autoFocus aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescribedBy("client-name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="client-contact" label="Contact person">
              <Input id="client-contact" {...form.register("contactName")} />
            </FormField>
            <FormField id="client-industry" label="Industry">
              <Input id="client-industry" {...form.register("industry")} />
            </FormField>
            <FormField id="client-email" label="Email" error={errors.email?.message}>
              <Input id="client-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
            </FormField>
            <FormField id="client-phone" label="Phone">
              <Input id="client-phone" type="tel" {...form.register("phone")} />
            </FormField>
          </div>
          <FormField id="client-website" label="Website" error={errors.website?.message}>
            <Input id="client-website" type="url" placeholder="https://" aria-invalid={Boolean(errors.website)} {...form.register("website")} />
          </FormField>
          <FormField id="client-notes" label="Notes">
            <Textarea id="client-notes" rows={3} {...form.register("notes")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsView() {
  const canManage = usePermission("clients:manage");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(search, 300);
  const query = useClients({ search: debounced.trim() || undefined, page });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> Client
            </Button>
          ) : null
        }
      />
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search clients…" aria-label="Search clients" className="pl-8" />
      </div>
      {query.isLoading ? (
        <TableSkeleton columns={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load clients." onRetry={() => void query.refetch()} />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Briefcase} title={debounced ? "No clients match your search." : "No clients yet."} />
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{[c.contactName, c.email].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.industry ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.activeProjectCount}/{c.projectCount} active
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {query.data ? (
            <DataPagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} pageSize={query.data.pageSize} onPageChange={setPage} isFetching={query.isFetching} />
          ) : null}
        </>
      )}
      {canManage ? <ClientDialog open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}

export function ClientDetailView({ clientId }: { clientId: ID }) {
  const query = useClient(clientId);
  const activity = useActivity({ clientId, limit: 15 });
  const canManage = usePermission("clients:manage");
  const [open, setOpen] = useState(false);
  useBreadcrumbLabel(clientId, query.data?.name);

  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !query.data) return <ErrorState error={query.error} title="Unable to load client." onRetry={() => void query.refetch()} />;
  const c = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.name}
        description={c.industry ?? undefined}
        actions={
          canManage ? (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil /> Edit
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Client information">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Contact person</dt>
              <dd>{c.contactName ?? "—"}</dd>
            </div>
            {c.email ? (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Email</dt>
                <dd><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></dd>
              </div>
            ) : null}
            {c.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Phone</dt>
                <dd><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></dd>
              </div>
            ) : null}
            {c.website ? (
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Website</dt>
                <dd><a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{c.website}</a></dd>
              </div>
            ) : null}
            {c.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{c.notes}</p> : null}
          </dl>
        </SectionCard>
        <SectionCard title="Retainers" className="lg:col-span-2">
          {c.retainers.length === 0 ? (
            <EmptyState title="No retainers." compact />
          ) : (
            <ul className="divide-y">
              {c.retainers.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.startDate)} → {r.endDate ? formatDate(r.endDate) : "ongoing"}
                    {r.hoursPerMonth ? ` · ${r.hoursPerMonth}h / month` : ""}
                  </span>
                  <Badge variant="outline">{r.status.replace(/_/g, " ").toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      <section className="space-y-3" aria-labelledby="client-projects">
        <h2 id="client-projects" className="text-sm font-semibold">Projects</h2>
        {c.projects.length === 0 ? (
          <EmptyState title="No projects for this client yet." compact />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{c.projects.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
        )}
      </section>
      <SectionCard title="Recent activity">
        <ActivityTimeline items={activity.data} isLoading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()} />
      </SectionCard>
      {canManage ? <ClientDialog client={c} open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}
