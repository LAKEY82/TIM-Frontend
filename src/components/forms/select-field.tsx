"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const NONE_VALUE = "__none__";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Adds a "None" option mapped to `null`. */
  noneLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  "aria-label"?: string;
}

/** Radix Select wrapper that supports an explicit empty value. */
export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  noneLabel,
  disabled,
  invalid,
  describedBy,
  className,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const current = value ? value : noneLabel ? NONE_VALUE : "";
  return (
    <Select value={current} onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
