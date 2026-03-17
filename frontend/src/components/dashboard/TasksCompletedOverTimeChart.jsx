import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "hsl(var(--card) / 0.96)",
};

export default function TasksCompletedOverTimeChart({ data = [], loading = false, onPointClick }) {
  const hasData = data.some((row) => Number(row.completed || 0) > 0);

  return (
    <Card className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Tasks Completed Over Time</CardTitle>
        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
          {data.reduce((sum, row) => sum + Number(row.completed || 0), 0)} completed
        </span>
      </CardHeader>
      <CardContent className="h-[300px]">
        {loading ? (
          <div className="skeleton h-full" />
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              onClick={(state) => {
                const point = state?.activePayload?.[0]?.payload;
                if (point) onPointClick?.(point);
              }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                formatter={(value) => [`${value} completed`, "Tasks"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                contentStyle={TOOLTIP_STYLE}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 3.5, fill: "#34d399", className: "cursor-pointer" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="No data available for completed tasks in this period." />
        )}
      </CardContent>
    </Card>
  );
}
