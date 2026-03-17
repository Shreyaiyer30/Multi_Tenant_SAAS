export default function ChartEmptyState({ message = "No data available" }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/35 p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
