"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { SectionCard } from "@/components/shared/section-card";
import { ListSkeleton } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/queries/use-misc";
import { useUpdateUser } from "@/hooks/queries/use-people";
import { NOTIFICATION_LABELS } from "@/lib/constants";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { ROLE_LABELS } from "@/lib/permissions";
import { authService } from "@/lib/services/auth";
import { useAuth, useCurrentUser } from "@/providers/auth-provider";
import { NOTIFICATION_TYPES, type NotificationPreferences, type NotificationType } from "@/types/domain";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  jobTitle: z.string().max(120),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Use at least 8 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/\d/, "Include a number."),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

export function ProfileSettings() {
  const me = useCurrentUser();
  const { refreshUser } = useAuth();
  const update = useUpdateUser();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profile = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: me.name, jobTitle: me.jobTitle ?? "" } });
  const password = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });

  const saveProfile = profile.handleSubmit(async (v) => {
    setProfileError(null);
    try {
      await update.mutateAsync({ id: me.id, input: { name: v.name.trim(), jobTitle: emptyToNull(v.jobTitle.trim()) } });
      await refreshUser();
    } catch (e) {
      setProfileError(applyServerErrors(e, profile.setError, ["name", "jobTitle"]));
    }
  });

  const savePassword = password.handleSubmit(async (v) => {
    setPasswordError(null);
    try {
      await authService.changePassword(v.currentPassword, v.newPassword);
      password.reset();
      toast.success("Password changed.");
    } catch (e) {
      setPasswordError(applyServerErrors(e, password.setError, ["currentPassword", "newPassword"]));
    }
  });

  const pe = profile.formState.errors;
  const we = password.formState.errors;

  return (
    <div className="space-y-4">
      <SectionCard title="Profile" description="How you appear to teammates.">
        <form onSubmit={saveProfile} noValidate className="grid max-w-lg gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={me} size="lg" />
            <div className="text-sm">
              <p className="font-medium">{me.email}</p>
              <p className="text-muted-foreground">
                {ROLE_LABELS[me.role]}
                {me.department ? ` · ${me.department.name}` : ""}
              </p>
            </div>
          </div>
          <FormError message={profileError} />
          <FormField id="profile-name" label="Full name" error={pe.name?.message} required>
            <Input id="profile-name" autoComplete="name" aria-invalid={Boolean(pe.name)} aria-describedby={fieldDescribedBy("profile-name", pe.name?.message)} {...profile.register("name")} />
          </FormField>
          <FormField id="profile-title" label="Job title">
            <Input id="profile-title" {...profile.register("jobTitle")} />
          </FormField>
          <p className="text-xs text-muted-foreground">Role and department are managed by an administrator.</p>
          <div>
            <Button type="submit" disabled={profile.formState.isSubmitting}>
              {profile.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Save profile
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Change password">
        <form onSubmit={savePassword} noValidate className="grid max-w-lg gap-4">
          <FormError message={passwordError} />
          <FormField id="pw-current" label="Current password" error={we.currentPassword?.message}>
            <Input id="pw-current" type="password" autoComplete="current-password" aria-invalid={Boolean(we.currentPassword)} {...password.register("currentPassword")} />
          </FormField>
          <FormField id="pw-new" label="New password" error={we.newPassword?.message}>
            <Input id="pw-new" type="password" autoComplete="new-password" aria-invalid={Boolean(we.newPassword)} {...password.register("newPassword")} />
          </FormField>
          <FormField id="pw-confirm" label="Confirm new password" error={we.confirm?.message}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(we.confirm)} {...password.register("confirm")} />
          </FormField>
          <div>
            <Button type="submit" disabled={password.formState.isSubmitting}>
              {password.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Change password
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------

export function NotificationSettings() {
  const query = useNotificationPreferences();
  const save = useUpdateNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const prefs = draft ?? query.data;

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError || !prefs) return <ErrorState error={query.error} title="Unable to load preferences." onRetry={() => void query.refetch()} />;

  const toggle = (channel: keyof NotificationPreferences, type: NotificationType, value: boolean) =>
    setDraft({ ...prefs, [channel]: { ...prefs[channel], [type]: value } });
  const isOn = (channel: keyof NotificationPreferences, type: NotificationType) => prefs[channel][type] ?? true;

  return (
    <SectionCard title="Notifications" description="Choose how you hear about activity.">
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="text-center">In app</TableHead>
              <TableHead className="text-center">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {NOTIFICATION_TYPES.map((type) => (
              <TableRow key={type}>
                <TableCell>{NOTIFICATION_LABELS[type]}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={isOn("inApp", type)} onCheckedChange={(v) => toggle("inApp", type, v)} aria-label={`${NOTIFICATION_LABELS[type]} in app`} />
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={isOn("email", type)} onCheckedChange={(v) => toggle("email", type, v)} aria-label={`${NOTIFICATION_LABELS[type]} by email`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => draft && save.mutate(draft, { onSuccess: () => setDraft(null) })} disabled={!draft || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : null}
          Save preferences
        </Button>
        {draft ? (
          <Button variant="outline" onClick={() => setDraft(null)} disabled={save.isPending}>
            Discard
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

const noopSubscribe = () => () => {};

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a hydration mismatch.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <SectionCard title="Appearance" description="Your theme preference is saved on this device.">
      <RadioGroup value={mounted ? (theme ?? "system") : undefined} onValueChange={setTheme} className="grid max-w-md gap-3 sm:grid-cols-3" aria-label="Theme">
        {options.map((o) => (
          <Label key={o.value} htmlFor={`theme-${o.value}`} className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <o.icon className="size-5" aria-hidden />
            {o.label}
            <RadioGroupItem value={o.value} id={`theme-${o.value}`} />
          </Label>
        ))}
      </RadioGroup>
    </SectionCard>
  );
}
