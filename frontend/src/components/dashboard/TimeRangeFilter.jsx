export const TIME_RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-1.5">
      <span className="px-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Time
      </span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-9 rounded-lg border border-border/70 bg-background/70 px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring/60"
      >
        {TIME_RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
