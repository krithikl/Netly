"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("rdp-netly", className)}
      classNames={{
        button_next: "calendar-nav-button",
        button_previous: "calendar-nav-button",
        caption_label: "calendar-caption-label",
        chevron: "calendar-chevron",
        day: "calendar-day",
        day_button: "calendar-day-button",
        dropdown: "calendar-dropdown",
        dropdown_root: "calendar-dropdown-root",
        dropdowns: "calendar-dropdowns",
        month: "calendar-month",
        month_caption: "calendar-month-caption",
        month_grid: "calendar-month-grid",
        months: "calendar-months",
        nav: "calendar-nav",
        range_end: "calendar-range-end",
        range_middle: "calendar-range-middle",
        range_start: "calendar-range-start",
        root: "calendar-root",
        selected: "calendar-selected",
        today: "calendar-today",
        week: "calendar-week",
        weekday: "calendar-weekday",
        weekdays: "calendar-weekdays",
        ...classNames
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
