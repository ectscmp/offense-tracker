import { RANGE_PRESETS, type DateRange } from "@/lib/date-range";

/**
 * Preset and custom date controls shared by Reports and Roster.
 *
 * Everything is a plain GET form, so the selected range lives in the URL and
 * server components can read it from `searchParams`.
 */
export function DateRangeControls({
  range,
  hidden = {},
}: {
  range: DateRange;
  hidden?: Record<string, string | undefined>;
}) {
  const hiddenEntries = Object.entries(hidden).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <section aria-label="Date range" className="mt-3 lg:max-w-xl">
      <form method="get" className="space-y-2">
        {hiddenEntries.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="submit"
              name="range"
              value={preset.key}
              aria-pressed={range.preset === preset.key}
              className={`h-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
                range.preset === preset.key
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-surface text-muted hover:border-line-strong"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <details
          open={range.preset === "custom"}
          className="rounded-xl border border-line bg-surface"
        >
          <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-bold text-muted">
            Custom dates
            <span className="ml-1.5 font-semibold text-muted-2">{range.label}</span>
          </summary>
          <div className="flex flex-wrap items-end gap-2 border-t border-line p-3">
            <label className="min-w-[9rem] flex-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              From
              <input
                type="date"
                name="from"
                defaultValue={range.start}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm font-semibold text-foreground outline-none focus:border-brand"
              />
            </label>
            <label className="min-w-[9rem] flex-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              To
              <input
                type="date"
                name="to"
                defaultValue={range.end}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-sm font-semibold text-foreground outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              name="range"
              value="custom"
              className="h-10 rounded-xl bg-brand px-4 text-xs font-bold text-white"
            >
              Apply
            </button>
          </div>
        </details>
      </form>
    </section>
  );
}
