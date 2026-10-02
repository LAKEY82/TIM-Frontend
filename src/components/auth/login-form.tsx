"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fieldDescribedBy, FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api";
import { applyServerErrors, safeNextPath } from "@/lib/forms";
import { homePathFor } from "@/lib/permissions";
import { useAuth } from "@/providers/auth-provider";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  // Already signed in (e.g. valid API session) → skip the form.
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(next ?? homePathFor(user));
  }, [status, user, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const signedIn = await login(values);
      router.replace(next ?? homePathFor(signedIn));
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        setFormError("Incorrect email or password.");
        return;
      }
      setFormError(applyServerErrors(error, form.setError, ["email", "password"]));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sign in</CardTitle>
        <CardDescription>Use your Theiavora work account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              aria-invalid={Boolean(errors.email)}
              aria-describedby={fieldDescribedBy("email", errors.email?.message)}
              {...form.register("email")}
            />
          </FormField>
          <FormField id="password" label="Password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={fieldDescribedBy("password", errors.password?.message)}
              {...form.register("password")}
            />
          </FormField>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
