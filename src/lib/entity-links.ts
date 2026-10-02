import type { EntityType } from "@/types/domain";

/** Canonical in-app URL for any entity, used by activity, notifications and search. */
export function entityHref(type: EntityType | null | undefined, id: string | null | undefined): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "PROJECT":
      return `/projects/${id}`;
    case "TASK":
      return `/tasks/${id}`;
    case "USER":
      return `/team/${id}`;
    case "CLIENT":
      return `/clients/${id}`;
    case "DEPARTMENT":
      return `/teams/${id}`;
    case "MILESTONE":
    case "COMMENT":
    default:
      return null;
  }
}
