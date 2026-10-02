"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ID, UserSummary } from "@/types/domain";

/** "@Pabasara" style handle derived from a display name. */
export function mentionHandle(name: string): string {
  return `@${name.replace(/\s+/g, "")}`;
}

/** Resolves the users whose handle appears in the text. */
export function extractMentionIds(text: string, users: UserSummary[]): ID[] {
  const ids = new Set<ID>();
  for (const user of users) {
    const handle = mentionHandle(user.name);
    const pattern = new RegExp(`${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i");
    if (pattern.test(text)) ids.add(user.id);
  }
  return [...ids];
}

interface MentionTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  users: UserSummary[];
  placeholder?: string;
  rows?: number;
  onSubmitShortcut?: () => void;
  "aria-label"?: string;
  disabled?: boolean;
}

/** Textarea with an accessible @mention suggestion list. */
export function MentionTextarea({
  id,
  value,
  onChange,
  users,
  placeholder,
  rows = 3,
  onSubmitShortcut,
  disabled,
  "aria-label": ariaLabel,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [query, setQuery] = useState<{ text: string; start: number } | null>(null);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.text.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().replace(/\s+/g, "").includes(q)).slice(0, 6);
  }, [query, users]);

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = /(^|\s)@([\w.]*)$/.exec(before);
    if (match) {
      setQuery({ text: match[2] ?? "", start: caret - (match[2]?.length ?? 0) - 1 });
      setActive(0);
    } else {
      setQuery(null);
    }
  };

  const insert = (user: UserSummary) => {
    if (!query) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const handle = `${mentionHandle(user.name)} `;
    const next = value.slice(0, query.start) + handle + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = query.start + handle.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const choice = suggestions[active];
        if (choice) insert(choice);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setQuery(null);
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmitShortcut?.();
    }
  };

  const open = suggestions.length > 0;

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((user, index) => (
            <li
              key={user.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                index === active && "bg-accent text-accent-foreground",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(user);
              }}
            >
              <UserAvatar user={user} size="xs" />
              <span className="truncate">{user.name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{mentionHandle(user.name)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
