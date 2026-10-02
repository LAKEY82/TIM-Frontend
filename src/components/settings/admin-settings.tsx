"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataPagination } from "@/components/shared/data-pagination";
import { SectionCard } from "@/components/shared/section-card";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateUser,
  useDeleteDepartment,
  useDepartments,
  useSaveDepartment,
  useSetUserActive,
  useUpdateUser,
  useUserOptions,
  useUsers,
} from "@/hooks/queries/use-people";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/queries/use-misc";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { ROLE_LABELS } from "@/lib/permissions";
import { useCurrentUser } from "@/providers/auth-provider";
import { ROLES, type Department, type Role, type User, type UserStatus } from "@/types/domain";

// ---------------------------------------------------------------------------
// Users (admin). The API enforces who may create/edit/deactivate users.
// ---------------------------------------------------------------------------

const userSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(ROLES),
  departmentId: z.string().nullable(),
  jobTitle: z.string().max(120),
  password: z.string().refine((v) => v === "" || v.length >= 8, "Use at least 8 characters, or leave blank to send an invite."),
});
type UserValues = z.infer<typeof userSchema>;

function UserDialog({ user, open, onOpenChange }: { user?: User; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const departments = useDepartments();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "EMPLOYEE",
      departmentId: user?.departmentId ?? null,
      jobTitle: user?.jobTitle ?? "",
      password: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const input = { name: v.name.trim(), email: v.email.trim(), role: v.role, departmentId: v.departmentId, jobTitle: emptyToNull(v.jobTitle.trim()) };
    try {
      if (user) await update.mutateAsync({ id: user.id, input });
      else await create.mutateAsync({ ...input, password: v.password || undefined });
      onOpenChange(false);
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["name", "email", "role", "departmentId", "jobTitle", "password"]));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? `Edit ${user.name}` : "New user"}</DialogTitle>
          <DialogDescription>{user ? "Change details, role or department." : "Create an account for a team member."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="user-name" label="Full name" error={errors.name?.message} required>
            <Input id="user-name" autoFocus aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescribedBy("user-name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <FormField id="user-email" label="Email" error={errors.email?.message} required>
            <Input id="user-email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby={fieldDescribedBy("user-email", errors.email?.message)} {...form.register("email")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="user-role" label="Role" error={errors.role?.message}>
              <Controller control={form.control} name="role" render={({ field }) => <SelectField id="user-role" value={field.value} onChange={(v) => field.onChange((v ?? "EMPLOYEE") as Role)} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />} />
            </FormField>
            <FormField id="user-dept" label="Department">
              <Controller
                control={form.control}
                name="departmentId"
                render={({ field }) => <SelectField id="user-dept" value={field.value} onChange={field.onChange} noneLabel="No department" options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} />}
              />
            </FormField>
          </div>
          <FormField id="user-title" label="Job title">
            <Input id="user-title" {...form.register("jobTitle")} />
          </FormField>
          {!user ? (
            <FormField id="user-password" label="Temporary password" error={errors.password?.message} hint="Leave blank to let the backend send an invitation email.">
              <Input id="user-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={fieldDescribedBy("user-password", errors.password?.message, true)} {...form.register("password")} />
            </FormField>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {user ? "Save" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersSettings() {
  const me = useCurrentUser();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const debounced = useDebouncedValue(search, 300);
  const departments = useDepartments();
  const setActive = useSetUserActive();
  const updateUser = useUpdateUser();
  const query = useUsers({ search: debounced.trim() || undefined, role: role ?? undefined, departmentId: departmentId ?? undefined, status: status ?? undefined, page, pageSize: 20 });
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <SectionCard
      title="Users"
      description="Create accounts and manage roles, departments and access."
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> User
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2" role="search" aria-label="Filter users">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Search name or email…" aria-label="Search users" className="pl-8" />
        </div>
        <SelectField id="users-role" aria-label="Filter by role" className="w-44" value={role} onChange={(v) => resetPage(setRole)(v as Role | null)} noneLabel="All roles" options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <SelectField id="users-dept" aria-label="Filter by department" className="w-44" value={departmentId} onChange={resetPage(setDepartmentId)} noneLabel="All departments" options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <SelectField id="users-status" aria-label="Filter by status" className="w-36" value={status} onChange={(v) => resetPage(setStatus)(v as UserStatus | null)} noneLabel="Any status" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
      </div>

      {query.isLoading ? (
        <TableSkeleton columns={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load users." onRetry={() => void query.refetch()} />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="No users found." />
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/team/${u.id}`} className="flex items-center gap-2 font-medium hover:underline">
                        <UserAvatar user={u} size="sm" />
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="w-48">
                      <SelectField
                        id={`role-${u.id}`}
                        aria-label={`Role for ${u.name}`}
                        className="h-7"
                        value={u.role}
                        disabled={u.id === me.id || updateUser.isPending}
                        onChange={(v) => v && v !== u.role && updateUser.mutate({ id: u.id, input: { role: v as Role } })}
                        options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                      />
                    </TableCell>
                    <TableCell className="w-48">
                      <SelectField
                        id={`dept-${u.id}`}
                        aria-label={`Department for ${u.name}`}
                        className="h-7"
                        value={u.departmentId}
                        disabled={updateUser.isPending}
                        noneLabel="None"
                        onChange={(v) => v !== u.departmentId && updateUser.mutate({ id: u.id, input: { departmentId: v } })}
                        options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ACTIVE" ? "outline" : "secondary"}>{u.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(u)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.status === "ACTIVE" ? (
                            <DropdownMenuItem variant="destructive" disabled={u.id === me.id} onSelect={() => setDeactivating(u)}>
                              <UserX /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setActive.mutate({ id: u.id, active: true })}>
                              <UserCheck /> Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {query.data ? <DataPagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} pageSize={query.data.pageSize} onPageChange={setPage} isFetching={query.isFetching} /> : null}
        </>
      )}

      <UserDialog user={editing && editing !== "new" ? editing : undefined} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title={`Deactivate ${deactivating?.name ?? "user"}?`}
        description="They will no longer be able to sign in. Their tasks and history are kept."
        confirmLabel="Deactivate"
        destructive
        pending={setActive.isPending}
        onConfirm={() => deactivating && setActive.mutate({ id: deactivating.id, active: false }, { onSettled: () => setDeactivating(null) })}
      />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Departments (admin)
// ---------------------------------------------------------------------------

const deptSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  description: z.string().max(1000),
  headId: z.string().nullable(),
});
type DeptValues = z.infer<typeof deptSchema>;

function DepartmentDialog({ department, open, onOpenChange }: { department?: Department; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveDepartment();
  const users = useUserOptions({}, open);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DeptValues>({
    resolver: zodResolver(deptSchema),
    values: { name: department?.name ?? "", description: department?.description ?? "", headId: department?.head?.id ?? null },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync({ id: department?.id, input: { name: v.name.trim(), description: emptyToNull(v.description.trim()), headId: v.headId } });
      onOpenChange(false);
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["name", "description", "headId"]));
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{department ? "Edit department" : "New department"}</DialogTitle>
          <DialogDescription>Departments group people and workload.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="dept-name" label="Name" error={errors.name?.message} required>
            <Input id="dept-name" autoFocus aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescribedBy("dept-name", errors.name?.message)} {...form.register("name")} />
          </FormField>
          <FormField id="dept-head" label="Department head">
            <Controller control={form.control} name="headId" render={({ field }) => <SelectField id="dept-head" value={field.value} onChange={field.onChange} noneLabel="None" options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))} />} />
          </FormField>
          <FormField id="dept-desc" label="Description">
            <Textarea id="dept-desc" rows={3} {...form.register("description")} />
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

export function DepartmentsSettings() {
  const query = useDepartments();
  const remove = useDeleteDepartment();
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  return (
    <SectionCard
      title="Departments"
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Department
        </Button>
      }
    >
      {query.isLoading ? (
        <TableSkeleton columns={4} rows={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} title="Unable to load departments." onRetry={() => void query.refetch()} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Building2} title="No departments yet." />
      ) : (
        <div className="relative overflow-x-auto rounded-lg border">
          <Table className="min-w-[560px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/teams/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.head?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.memberCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DepartmentDialog department={editing && editing !== "new" ? editing : undefined} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "department"}?`}
        description="The server will refuse this if people or tasks still belong to the department."
        confirmLabel="Delete"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
      />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Company settings
// ---------------------------------------------------------------------------

const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().min(1, "Enter a timezone, e.g. Asia/Colombo."),
  workingHoursPerDay: z.coerce.number().min(1, "At least 1 hour.").max(24, "At most 24 hours."),
  weekStartsOn: z.enum(["0", "1"]),
});
type CompanyValues = z.input<typeof companySchema>;

export function CompanySettingsForm() {
  const query = useCompanySettings();
  const save = useUpdateCompanySettings();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CompanyValues, unknown, z.output<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    values: query.data
      ? { name: query.data.name, timezone: query.data.timezone, workingHoursPerDay: query.data.workingHoursPerDay, weekStartsOn: String(query.data.weekStartsOn) as "0" | "1" }
      : undefined,
  });
  const { errors, isSubmitting } = form.formState;

  if (query.isLoading) return <TableSkeleton rows={3} columns={2} />;
  if (query.isError) return <ErrorState error={query.error} title="Unable to load company settings." onRetry={() => void query.refetch()} />;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync({ name: v.name, timezone: v.timezone, workingHoursPerDay: v.workingHoursPerDay, weekStartsOn: v.weekStartsOn === "0" ? 0 : 1 });
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError, ["name", "timezone", "workingHoursPerDay", "weekStartsOn"]));
    }
  });

  return (
    <SectionCard title="Company" description="Organisation-wide defaults.">
      <form onSubmit={onSubmit} noValidate className="grid max-w-lg gap-4">
        <FormError message={formError} />
        <FormField id="co-name" label="Company name" error={errors.name?.message}>
          <Input id="co-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
        </FormField>
        <FormField id="co-tz" label="Timezone" error={errors.timezone?.message}>
          <Input id="co-tz" aria-invalid={Boolean(errors.timezone)} {...form.register("timezone")} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="co-hours" label="Working hours / day" error={errors.workingHoursPerDay?.message}>
            <Input id="co-hours" inputMode="decimal" aria-invalid={Boolean(errors.workingHoursPerDay)} {...form.register("workingHoursPerDay")} />
          </FormField>
          <FormField id="co-week" label="Week starts on">
            <Controller
              control={form.control}
              name="weekStartsOn"
              render={({ field }) => <SelectField id="co-week" value={field.value} onChange={(v) => field.onChange(v ?? "1")} options={[{ value: "1", label: "Monday" }, { value: "0", label: "Sunday" }]} />}
            />
          </FormField>
        </div>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
