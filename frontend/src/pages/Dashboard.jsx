import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  Percent,
  Sparkles
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/EmptyState";
import { useTenant } from "@/context/TenantContext";

const colors = ["#6366f1", "#3b82f6", "#f59e0b", "#22c55e"];

function SkeletonDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="skeleton h-28" />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { tenant } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tenant) return;

    const toOverviewShape = (data) => {
      if (data?.projects) return data;
      const legacyStatus = data?.tasks_by_status || {};
      const legacyPriority = data?.tasks_by_priority || {};
      const totalProjects = data?.overview?.total_projects ?? data?.total_projects ?? 0;
      return {
        projects: {
          total: totalProjects,
          by_status: legacyStatus,
          by_priority: legacyPriority
        }
      };
    };
    const normalizeRecent = (items) =>
      (items || []).map((item) => ({
        actor: {
          id: item?.actor?.id || null,
          name: item?.actor?.name || item?.actor?.display_name || "System"
        },
        action: item?.action || item?.event_type || "TASK_UPDATED",
        task: item?.task || { id: item?.task_id || null, title: item?.title || "Task" },
        project: item?.project || null,
        comment: item?.comment || null,
        created_at: item?.created_at
      }));

    setLoading(true);
    Promise.all([api.get("dashboard/overview/"), api.get("dashboard/recent-activity/?limit=5")])
      .then(([overviewRes, recentRes]) => {
        setOverview(toOverviewShape(overviewRes.data || {}));
        setRecentItems(normalizeRecent(recentRes.data || []));
        setError("");
      })
      .catch(async () => {
        try {
          const [summaryRes, workspaceRes] = await Promise.all([
            api.get("workspace/dashboard/summary/"),
            api.get("workspace/dashboard/")
          ]);
          const legacyOverview = toOverviewShape({
            total_projects: summaryRes.data?.total_projects ?? 0,
            tasks_by_status: workspaceRes.data?.tasks_by_status || {},
            tasks_by_priority: workspaceRes.data?.tasks_by_priority || {}
          });
          setOverview(legacyOverview);
          setRecentItems(normalizeRecent(workspaceRes.data?.recent_activity || []));
          setError("");
        } catch {
          setOverview(null);
          setRecentItems([]);
          setError("Unable to load dashboard.");
        }
      })
      .finally(() => setLoading(false));
  }, [tenant]);

  const statusBreakdown = overview?.projects?.by_status || {};
  const priorityBreakdown = overview?.projects?.by_priority || {};
  const projectTotal = overview?.projects?.total ?? 0;
  const totalTasks = Object.values(statusBreakdown).reduce((sum, value) => sum + Number(value || 0), 0);
  const completedTasks = Number(statusBreakdown?.done || 0);
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tiles = useMemo(
    () => [
      {
        label: "Projects",
        value: projectTotal,
        icon: FolderKanban,
        hint: "Active workspace projects",
        href: "/projects"
      },
      {
        label: "Total Tasks",
        value: totalTasks,
        icon: ListChecks,
        hint: "Across all statuses",
        href: "/tasks"
      },
      {
        label: "Completed",
        value: completedTasks,
        icon: CheckCircle2,
        hint: "Delivered tasks"
      },
      {
        label: "Completion Rate",
        value: `${completionRate}%`,
        icon: Percent,
        hint: "Workspace velocity"
      }
    ],
    [projectTotal, totalTasks, completedTasks, completionRate]
  );

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(priorityBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 page-enter">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspace health, throughput, and momentum at a glance.</p>
        </div>
      </section>

      {loading ? <SkeletonDashboard /> : null}
      {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Card
                  key={tile.label}
                  className={`elevate-hover overflow-hidden ${tile.href ? "cursor-pointer" : ""}`}
                  onClick={() => tile.href && navigate(tile.href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">{tile.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-primary/25 to-primary-active/20 p-2.5 text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {statusData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.15)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                      <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No status data yet"
                    description="Create and move tasks between stages to see your pipeline analytics."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Priorities</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {priorityData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={4}>
                        {priorityData.map((entry, index) => (
                          <Cell key={entry.name} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="No priority split"
                    description="Set task priority values to visualize workload distribution."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(statusBreakdown).map(([label, value]) => {
                  const total = Object.values(statusBreakdown).reduce((sum, item) => sum + Number(item || 0), 0) || 1;
                  const pct = Math.round((Number(value || 0) / total) * 100);
                  return (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{label.replace("_", " ")}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60">
                        <div className="h-2 rounded-full bg-gradient-to-r from-primary-hover to-primary-active" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!Object.keys(statusBreakdown).length ? (
                  <p className="text-sm text-muted-foreground">Progress bars appear after your first task updates.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentItems.length ? (
                  <div className="space-y-3">
                    {recentItems.map((item, idx) => (
                      <div key={item.id || idx} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                        <p className="text-sm font-medium">
                          {item.actor?.name || "Someone"} {String(item.action || "").replaceAll("_", " ").toLowerCase()} {item.task?.title || item.project?.name || "an item"}
                        </p>
                        {item.comment ? <p className="mt-1 text-xs text-muted-foreground">{item.comment}</p> : null}
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock3}
                    title="No recent activity"
                    description="Team updates and task events will show here as your workspace becomes active."
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
