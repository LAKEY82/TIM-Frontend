"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { isApiError, refreshSession, setAuthFailureHandler, tokenStore } from "@/lib/api";
import { clearAuthHint, setAuthHint } from "@/lib/auth-hint";
import { env } from "@/lib/env";
import { previewUser } from "@/lib/preview-user";
import { queryKeys } from "@/lib/query-keys";
import { authService, type LoginInput } from "@/lib/services/auth";
import type { User } from "@/types/domain";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Restores the session on first load. The access token lives only in memory,
 * so after a page load there is none yet: refresh first (httpOnly cookie)
 * instead of making a /auth/me call that is certain to 401.
 */
async function bootstrapSession(): Promise<User | null> {
  if (env.authDisabled) return previewUser();
  if (!tokenStore.get() && !(await refreshSession())) return null;
  try {
    return await authService.me();
  } catch (error) {
    if (!isApiError(error) || error.status !== 401) throw error;
  }
  const refreshed = await refreshSession();
  if (!refreshed) return null;
  try {
    return await authService.me();
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: bootstrapSession,
    staleTime: Infinity,
    retry: (count, error) => !isApiError(error) && count < 2,
    refetchOnWindowFocus: false,
  });

  const user = meQuery.data ?? null;
  const status: AuthStatus = meQuery.isPending
    ? "loading"
    : user
      ? "authenticated"
      : "unauthenticated";

  // Keep the non-sensitive navigation hint cookie in sync with reality.
  useEffect(() => {
    if (status === "authenticated") setAuthHint();
    if (status === "unauthenticated") clearAuthHint();
  }, [status]);

  // When a request's refresh fails mid-session, sign out and go to login.
  useEffect(() => {
    // Preview mode has no session to lose; let failed requests show their error state.
    if (env.authDisabled) return;
    setAuthFailureHandler(() => {
      clearAuthHint();
      queryClient.setQueryData(queryKeys.auth.me, null);
      const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    });
    return () => setAuthFailureHandler(null);
  }, [queryClient, router, pathname]);

  const login = useCallback(
    async (input: LoginInput) => {
      if (env.authDisabled) return previewUser();
      const signedIn = await authService.login(input);
      // Drop anything cached from a previous user before seeding the session.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
      queryClient.setQueryData(queryKeys.auth.me, signedIn);
      setAuthHint();
      return signedIn;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    if (env.authDisabled) return;
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, clear local state.
    } finally {
      clearAuthHint();
      queryClient.clear();
      queryClient.setQueryData(queryKeys.auth.me, null);
      router.replace("/login");
    }
  }, [queryClient, router]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refreshUser }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** For components rendered only inside the authenticated shell. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser called outside an authenticated route");
  return user;
}
