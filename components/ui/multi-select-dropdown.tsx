"use client";

import { type KeyboardEvent, type TouchEvent, type WheelEvent, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCloseOnPageScroll } from "@/hooks/useCloseOnPageScroll";
import { cn } from "@/lib/utils";

export type MultiSelectDropdownOption = {
  label: string;
  value: string;
};

type MultiSelectDropdownProps = {
  ariaLabel: string;
  contentClassName?: string;
  contentTestId?: string;
  getOptionIsActive?: (option: MultiSelectDropdownOption) => boolean;
  label: string;
  onToggle: (value: string) => void;
  options: MultiSelectDropdownOption[];
  selectedValues: string[];
  triggerClassName?: string;
  triggerTestId?: string;
};

// Shared popover multi-select for compact category/account selectors.
export function MultiSelectDropdown({
  ariaLabel,
  contentClassName,
  contentTestId,
  getOptionIsActive,
  label,
  onToggle,
  options,
  selectedValues,
  triggerClassName,
  triggerTestId
}: MultiSelectDropdownProps) {
  const selectedSet = new Set(selectedValues);
  const [open, setOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const optionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const touchScrollRef = useRef<{ scrollTop: number; y: number } | null>(null);
  const isOptionActive = getOptionIsActive || ((option: MultiSelectDropdownOption) => selectedSet.has(option.value));
  useCloseOnPageScroll(open, () => setOpen(false));

  const focusOption = (index: number) => {
    optionButtonRefs.current[index]?.focus();
  };
  const openFromTrigger = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    setOpen(true);
    window.setTimeout(() => focusOption(event.key === "ArrowUp" ? options.length - 1 : 0), 0);
  };
  const handleContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = optionButtonRefs.current.findIndex((button) => button === document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (activeIndex < 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption((activeIndex + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption((activeIndex - 1 + options.length) % options.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  };
  const scrollContentBy = (element: HTMLDivElement, deltaY: number) => {
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    if (maxScrollTop <= 0) {
      return element.scrollTop;
    }

    const nextScrollTop = Math.min(maxScrollTop, Math.max(0, element.scrollTop + deltaY));
    element.scrollTop = nextScrollTop;

    return nextScrollTop;
  };
  const handleContentWheel = (event: WheelEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const previousScrollTop = element.scrollTop;
    const nextScrollTop = scrollContentBy(element, event.deltaY);

    if (nextScrollTop !== previousScrollTop && event.cancelable) {
      event.preventDefault();
    }

    event.stopPropagation();
  };
  const handleContentTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      touchScrollRef.current = null;
      return;
    }

    touchScrollRef.current = {
      scrollTop: event.currentTarget.scrollTop,
      y: touch.clientY
    };
  };
  const handleContentTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    const touchScroll = touchScrollRef.current;

    if (!touch || !touchScroll) {
      return;
    }

    const element = event.currentTarget;
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    if (maxScrollTop <= 0) {
      return;
    }

    const nextScrollTop = Math.min(maxScrollTop, Math.max(0, touchScroll.scrollTop + touchScroll.y - touch.clientY));
    element.scrollTop = nextScrollTop;

    event.stopPropagation();
  };
  const clearContentTouchScroll = () => {
    touchScrollRef.current = null;
  };
  const focusTriggerWithoutScrolling = (event: Event) => {
    event.preventDefault();
    triggerButtonRef.current?.focus({ preventScroll: true });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={cn("category-multi-select-trigger transaction-select-trigger", triggerClassName)}
          data-testid={triggerTestId}
          onKeyDown={openFromTrigger}
          ref={triggerButtonRef}
          role="combobox"
          type="button"
        >
          <span>{label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("category-multi-select-content", contentClassName)}
        data-vaul-no-drag=""
        data-testid={contentTestId}
        onCloseAutoFocus={focusTriggerWithoutScrolling}
        onKeyDown={handleContentKeyDown}
        onTouchCancel={clearContentTouchScroll}
        onTouchEnd={clearContentTouchScroll}
        onTouchMove={handleContentTouchMove}
        onTouchStart={handleContentTouchStart}
        onWheel={handleContentWheel}
      >
        {options.map((option, index) => {
          const isActive = isOptionActive(option);

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "active" : undefined}
              key={option.value}
              onClick={() => onToggle(option.value)}
              ref={(element) => {
                optionButtonRefs.current[index] = element;
              }}
              type="button"
            >
              <span className="category-multi-select-check">
                {isActive && <Check aria-hidden="true" className="h-4 w-4" />}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
