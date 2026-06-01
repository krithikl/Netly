"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

type SelectFieldProps<T extends string = string> = {
  ariaLabel?: string;
  className?: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
};

export function SelectField<T extends string = string>({
  ariaLabel,
  className,
  onChange,
  options,
  value
}: SelectFieldProps<T>) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger aria-label={ariaLabel} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
