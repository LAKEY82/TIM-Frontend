import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { getErrorMessage, isApiError } from "@/lib/api";

/**
 * Maps a server validation error (400/422) onto form fields. Returns a
 * top-level message for anything that couldn't be attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): string | null {
  if (isApiError(error) && Object.keys(error.fieldErrors).length > 0) {
    let unmatched = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      const match = knownFields.find((f) => f === field || f === field.replace(/Id$/, "") || `${f}Id` === field);
      if (match) setError(match, { type: "server", message });
      else unmatched = true;
    }
    return unmatched ? error.message : null;
  }
  return getErrorMessage(error);
}

/** Turns "" into null for optional API fields. */
export function emptyToNull<T extends string | null | undefined>(value: T): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

/** Safe in-app redirect target from a `?next=` param. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return null;
  return next;
}
