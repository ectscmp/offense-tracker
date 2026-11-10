import { endOfToday, startOfDaysAgo, startOfToday } from "./format";
import type { DateWindow } from "./types";

export type RangePreset = "today" | "7d" | "30d" | "month" | "custom";

export type RangeParams = {
  range?: string;
  from?: string;
  to?: string;
};

export type DateRange = DateWindow & {
  preset: RangePreset;
  /** `YYYY-MM-DD` values for the native date inputs. */
  start: string;
  end: string;
  label: string;
  shortLabel: string;
};

export const RANGE_PRESETS: Array<{ key: RangePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseDay(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function inputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function build(preset: RangePreset, from: Date, to: Date, shortLabel: string): DateRange {
  const span = `${dayLabel(from)} – ${dayLabel(to)}`;
  return {
    preset,
    from,
    to,
    start: inputValue(from),
    end: inputValue(to),
    label: preset === "today" ? `Today · ${dayLabel(from)}` : span,
    shortLabel,
  };
}

/**
 * Resolve the report/roster date controls into an inclusive local-time window.
 * Presets ignore `from`/`to`; a custom range falls back to the last 7 days when
 * the dates are missing or invalid.
 */
export function resolveDateRange(params: RangeParams): DateRange {
  switch (params.range) {
    case "today":
      return build("today", startOfToday(), endOfToday(), "today");
    case "30d":
      return build("30d", startOfDaysAgo(29), endOfToday(), "30d");
    case "month":
      return build(
        "month",
        new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1),
        endOfToday(),
        "month",
      );
    case "custom": {
      const parsedFrom = parseDay(params.from);
      const parsedTo = parseDay(params.to);
      let from = startOfDay(parsedFrom ?? startOfDaysAgo(6));
      let to = endOfDay(parsedTo ?? new Date());
      if (from.getTime() > to.getTime()) {
        [from, to] = [startOfDay(to), endOfDay(from)];
      }
      return build("custom", from, to, "range");
    }
    default:
      return build("7d", startOfDaysAgo(6), endOfToday(), "7d");
  }
}
