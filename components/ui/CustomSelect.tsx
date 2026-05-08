"use client";

import clsx from "clsx";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

const customSelectOpenEvent = "moneyfit-custom-select-open";

export type CustomSelectOption<T extends string = string> = {
  label: string;
  value: T;
};

type CustomSelectProps<T extends string = string> = {
  ariaLabel?: string;
  className?: string;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  value: T;
};

export function CustomSelect<T extends string = string>({ ariaLabel, className, onChange, options, value }: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = getSelectedOption(options, value);
  const listboxId = `${selectId}-listbox`;
  const buttonClassName = clsx("custom-select-button", className);
  const menuClassName = clsx("custom-select-menu", isOpen && "open");
  const buttonAriaLabel = ariaLabel || selectedOption.label;
  const toggleOpen = () => setIsOpen((current) => !current);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleAnotherSelectOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== selectId) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    window.addEventListener(customSelectOpenEvent, handleAnotherSelectOpen);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      window.removeEventListener(customSelectOpenEvent, handleAnotherSelectOpen);
    };
  }, [selectId]);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent(customSelectOpenEvent, { detail: selectId }));
    }
  }, [isOpen, selectId]);

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }

    if (event.key === "Escape") {
      closeMenu();
    }
  };

  return (
    <div className="custom-select" ref={rootRef} onClick={(event) => event.stopPropagation()}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={buttonAriaLabel}
        aria-controls={listboxId}
        className={buttonClassName}
        onClick={toggleOpen}
        onKeyDown={handleButtonKeyDown}
        type="button"
      >
        <span>{selectedOption.label}</span>
        <span aria-hidden="true" className="custom-select-chevron">
          ▾
        </span>
      </button>
      {isOpen && (
        <div className={menuClassName} id={listboxId} role="listbox">
          {options.map((option) => (
            <CustomSelectItem
              isSelected={option.value === value}
              key={option.value}
              onChange={onChange}
              onClose={closeMenu}
              option={option}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomSelectItem<T extends string>({
  isSelected,
  onChange,
  onClose,
  option
}: {
  isSelected: boolean;
  onChange: (value: T) => void;
  onClose: () => void;
  option: CustomSelectOption<T>;
}) {
  const itemClassName = clsx("custom-select-option", isSelected && "selected");
  const chooseOption = () => {
    onChange(option.value);
    onClose();
  };

  return (
    <button aria-selected={isSelected} className={itemClassName} onClick={chooseOption} role="option" type="button">
      <span>{option.label}</span>
      {isSelected && <span aria-hidden="true">✓</span>}
    </button>
  );
}

function getSelectedOption<T extends string>(options: CustomSelectOption<T>[], value: T) {
  return options.find((option) => option.value === value) || { label: value, value };
}
