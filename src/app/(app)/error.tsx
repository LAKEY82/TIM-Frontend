"use client";

import { ErrorState } from "@/components/shared/states";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} title="This page failed to load." onRetry={reset} />;
}
