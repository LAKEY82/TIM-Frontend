import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";
import { DONE_STATUSES } from "@/lib/constants";
import type { TaskStatus } from "@/types/domain";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : parseISO(value);
  return isValid(d) ? d : null;
}

export function formatDate(value: string | Date | null | undefined, pattern = "MMM d, yyyy"): string {
  const d = toDate(value);
  return d ? format(d, pattern) : "—";
}

export function formatShortDate(value: string | Date | null | undefined): string {
  return formatDate(value, "MMM d");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? formatDistanceToNowStrict(d, { addSuffix: true }) : "—";
}

/** `yyyy-MM-dd` for API query params and date inputs. */
export function toISODate(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later" | "done";

export function dueState(dueDate: string | null | undefined, status?: TaskStatus, now = new Date()): DueState {
  if (status && DONE_STATUSES.includes(status)) return "done";
  const d = toDate(dueDate);
  if (!d) return "none";
  const diff = differenceInCalendarDays(d, now);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return "later";
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
