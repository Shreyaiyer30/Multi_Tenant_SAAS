import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

const STATUS_COLORS = {
  todo: "#a78bfa",
  in_progress: "#22d3ee",
  in_review: "#f59e0b",
  done: "#34d399",
};

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "hsl(var(--card) / 0.96)",
};

export default function TasksByStatusDonut({ data = [], loading = false, onSegmentClick }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const hasData = total > 0;

  return (
    <Card className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Tasks by Status</CardTitle>
        <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {total} tasks
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="skeleton h-[290px]" />
        ) : hasData ? (
          <>
            <div className="h-[240px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    cornerRadius={8}
                    labelLine={false}
                    label={({ value }) => (value ? value : "")}
                    onClick={(entry) => onSegmentClick?.(entry)}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] || "#64748b"}
                        className="cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {data.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => onSegmentClick?.(entry)}
                  className="rounded-lg border border-border/70 bg-card/40 px-2.5 py-2 text-left transition-colors hover:bg-muted/30"
                >
                  <p className="text-[11px] capitalize text-muted-foreground">{entry.label}</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: STATUS_COLORS[entry.key] || "#64748b" }}>
                    {entry.value}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <ChartEmptyState message="No data available for tasks by status." />
        )}
      </CardContent>
    </Card>
  );
}
