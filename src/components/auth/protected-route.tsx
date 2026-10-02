"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useAuth } from "@/providers/auth-provider";

/**
 * Client-side gate for the authenticated area. `proxy.ts` performs an
 * optimistic redirect first; this component verifies the session with the API.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") return <FullPageLoader label={status === "loading" ? "Loading your workspace…" : "Redirecting to sign in…"} />;
  return <>{children}</>;
}
