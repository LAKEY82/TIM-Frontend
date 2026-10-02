/**
 * Test helpers. Fixtures here exist only for tests; production code never
 * reads mock data.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryKeys } from "@/lib/query-keys";
import { AuthProvider } from "@/providers/auth-provider";
import type { Role, User } from "@/types/domain";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    name: "Test User",
    email: "test.user@example.test",
    role: "EMPLOYEE",
    status: "ACTIVE",
    departmentId: null,
    department: null,
    ...overrides,
  };
}

export function userWithRole(role: Role, overrides: Partial<User> = {}) {
  return makeUser({ role, ...overrides });
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 0 }, mutations: { retry: false } },
  });
}

interface ProviderOptions {
  /** Signed-in user; `null` means signed out. `undefined` → bootstrap from the API. */
  user?: User | null;
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, { user, queryClient = makeQueryClient(), ...options }: ProviderOptions & RenderOptions = {}) {
  if (user !== undefined) queryClient.setQueryData(queryKeys.auth.me, user);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>{children}</AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

// ---------------------------------------------------------------------------
// fetch router
// ---------------------------------------------------------------------------

export interface RecordedRequest {
  method: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
  headers: Headers;
}

type Handler = (req: RecordedRequest) => { status?: number; body?: unknown; headers?: Record<string, string> } | undefined;

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * Installs a fetch mock routed by "METHOD /path" (exact) with optional "*"
 * fallback. Returns the list of recorded requests.
 */
export function mockApi(routes: Record<string, Handler>) {
  const calls: RecordedRequest[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    let body: unknown = undefined;
    if (typeof init?.body === "string") body = JSON.parse(init.body);
    const req: RecordedRequest = { method, path: url.pathname, search: url.searchParams, body, headers: new Headers(init?.headers) };
    calls.push(req);
    const handler = routes[`${method} ${url.pathname}`] ?? routes["*"];
    const result = handler?.(req);
    if (!result) return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 404);
    return jsonResponse(result.body, result.status ?? 200, result.headers);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}
