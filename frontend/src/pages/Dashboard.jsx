import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, ListChecks, FolderKanban, Percent } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/context/TenantContext";

const colors = ["#6473ff", "#3b82f6", "#f59e0b", "#22c55e"];

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { tenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get("workspace/dashboard/summary/"), api.get("workspace/dashboard/charts/")])
      .then(([summaryRes, chartsRes]) => {
        setOverview(summaryRes.data || {});
        setCharts(chartsRes.data || {});
        setError("");
      })
      .catch(() => {
        setOverview(null);
        setCharts(null);
        setError("Unable to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, [tenant]);

  const statusBreakdown = charts?.tasks_by_status || {};
  const priorityBreakdown = charts?.tasks_by_priority || {};
  const overviewData = overview || {};

  const tiles = (data) => [
    { label: "Projects", value: data.total_projects ?? 0, icon: FolderKanban },
    { label: "Total Tasks", value: data.total_tasks ?? 0, icon: ListChecks },
    { label: "Completed", value: data.completed_tasks ?? 0, icon: CheckCircle2 },
    { label: "Completion Rate", value: `${data.completion_rate ?? 0}%`, icon: Percent },
  ];

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(priorityBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {tiles(overviewData).map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">{tile.label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{tile.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tasks by Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}><Bar dataKey="value" fill="#6473ff" radius={6} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tasks by Priority</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" innerRadius={45} outerRadius={80}>
                  {priorityData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
