"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/forms";
import { authService } from "@/lib/services/auth";

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
});
type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await authService.forgotPassword(email);
      setSentTo(email);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["email"]));
    }
  });

  if (sentTo) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="mx-auto size-8 text-primary" aria-hidden />
          <CardTitle className="text-lg">Check your email</CardTitle>
          <CardDescription>
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, you&apos;ll receive a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Forgot password</CardTitle>
        <CardDescription>Enter your work email and we&apos;ll send you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(errors.email)}
              aria-describedby={fieldDescribedBy("email", errors.email?.message)}
              {...form.register("email")}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Send reset link
          </Button>
          <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
            Back to sign in
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });
type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) return;
    setFormError(null);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      toast.success("Password updated.");
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["password"]));
    }
  });

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invalid reset link</CardTitle>
          <CardDescription>This link is missing its token or has expired. Request a new one.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request new link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mx-auto size-8 text-primary" aria-hidden />
          <CardTitle className="text-lg">Password updated</CardTitle>
          <CardDescription>You can now sign in with your new password.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Set a new password</CardTitle>
        <CardDescription>Choose a password with at least 8 characters, including a letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="password" label="New password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={fieldDescribedBy("password", errors.password?.message)}
              {...form.register("password")}
            />
          </FormField>
          <FormField id="confirm" label="Confirm password" error={errors.confirm?.message}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={fieldDescribedBy("confirm", errors.confirm?.message)}
              {...form.register("confirm")}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
