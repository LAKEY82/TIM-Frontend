"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ID, UserSummary } from "@/types/domain";

interface MultiUserSelectProps {
  id: string;
  users: UserSummary[];
  value: ID[];
  onChange: (value: ID[]) => void;
  placeholder?: string;
}

/** Keyboard-accessible multi-select for people (project members). */
export function MultiUserSelect({ id, users, value, onChange, placeholder = "Select people…" }: MultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = users.filter((u) => value.includes(u.id));
  const toggle = (userId: ID) => onChange(value.includes(userId) ? value.filter((v) => v !== userId) : [...value, userId]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search people…" />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                {users.map((u) => {
                  const checked = value.includes(u.id);
                  return (
                    <CommandItem key={u.id} value={`${u.name} ${u.id}`} onSelect={() => toggle(u.id)} aria-selected={checked}>
                      <UserAvatar user={u} size="xs" />
                      <span className="truncate">{u.name}</span>
                      <Check className={cn("ml-auto", checked ? "opacity-100" : "opacity-0")} aria-hidden />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label="Selected people">
          {selected.map((u) => (
            <li key={u.id}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {u.name}
                <button type="button" onClick={() => toggle(u.id)} className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`Remove ${u.name}`}>
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
