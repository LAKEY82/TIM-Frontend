import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage, isApiError } from "@/lib/api";

/** Retry only what can succeed on retry: network, 408, 429 and 5xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!isApiError(error)) return true;
  if (error.isNetworkError || error.isServerError || error.status === 408) return true;
  if (error.isRateLimited) return failureCount < 1;
  return false;
}

export function retryDelay(attempt: number, error: unknown): number {
  if (isApiError(error) && error.retryAfterSeconds) return error.retryAfterSeconds * 1000;
  return Math.min(1000 * 2 ** attempt, 8000);
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Mutations can opt out (e.g. forms that render server errors inline).
        if (mutation.meta?.silentError) return;
        toast.error(getErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silentError?: boolean };
  }
}
