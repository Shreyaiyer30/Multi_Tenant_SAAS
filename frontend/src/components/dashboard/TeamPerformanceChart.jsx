import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "hsl(var(--card) / 0.96)",
};

export default function TeamPerformanceChart({ data = [], loading = false, onBarClick }) {
  const hasData = data.some((row) => Number(row.completed || 0) > 0);

  return (
    <Card className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70">
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {loading ? (
          <div className="skeleton h-full" />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 6, right: 18, left: 0, bottom: 6 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.14)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                dataKey="name"
                type="category"
                width={92}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                formatter={(value) => [`${value} completed`, "Tasks"]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="completed"
                radius={[0, 8, 8, 0]}
                fill="#60a5fa"
                className="cursor-pointer"
                onClick={(entry) => onBarClick?.(entry?.payload || entry)}
              >
                <LabelList dataKey="completed" position="right" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="No team performance data for this period." />
        )}
      </CardContent>
    </Card>
  );
}
