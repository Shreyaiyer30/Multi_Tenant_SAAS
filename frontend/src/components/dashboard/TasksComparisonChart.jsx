import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

export default function TasksComparisonChart({ data = [], loading = false, onSeriesPointClick }) {
  const hasData = data.some((row) => Number(row.created || 0) > 0 || Number(row.completed || 0) > 0);

  return (
    <Card className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70">
      <CardHeader>
        <CardTitle>Tasks Created vs Completed</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {loading ? (
          <div className="skeleton h-full" />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                formatter={(value, name) => [value, String(name)]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <Line
                type="monotone"
                name="Tasks Created"
                dataKey="created"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#38bdf8", className: "cursor-pointer" }}
                activeDot={{ r: 6 }}
                onClick={(point) => {
                  if (point?.payload) onSeriesPointClick?.("created", point.payload);
                }}
              />
              <Line
                type="monotone"
                name="Tasks Completed"
                dataKey="completed"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#34d399", className: "cursor-pointer" }}
                activeDot={{ r: 6 }}
                onClick={(point) => {
                  if (point?.payload) onSeriesPointClick?.("completed", point.payload);
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="No comparison data for this period." />
        )}
      </CardContent>
    </Card>
  );
}
