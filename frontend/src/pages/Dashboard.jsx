import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TasksByStatusDonut from "@/components/dashboard/TasksByStatusDonut";
import TasksCompletedOverTimeChart from "@/components/dashboard/TasksCompletedOverTimeChart";
import TeamPerformanceChart from "@/components/dashboard/TeamPerformanceChart";
import TasksComparisonChart from "@/components/dashboard/TasksComparisonChart";
import TimeRangeFilter from "@/components/dashboard/TimeRangeFilter";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib";
import { DASHBOARD_DUMMY_DATA, getDashboardBundle } from "@/services/dashboardService";

function relativeLabel(isoDate) {
  if (!isoDate) return "Just now";
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonStatCard() {
  return <div className="skeleton h-[136px]" />;
}

function StatCard({ label, value, suffix = "", icon: Icon, onClick, tone = "default" }) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "elevate-hover cursor-pointer rounded-xl border border-border/75 bg-gradient-to-b from-card to-card/70",
        tone === "danger" && "border-danger/45 from-danger/10 to-card/80",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold tracking-tight",
                tone === "danger" && "text-danger-foreground",
              )}
            >
              {value}
              {suffix}
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-2.5",
              tone === "danger"
                ? "bg-danger/20 text-danger-foreground"
                : "bg-gradient-to-r from-primary/20 to-secondary/25 text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("7d");
  const [dashboard, setDashboard] = useState(() => DASHBOARD_DUMMY_DATA["7d"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getDashboardBundle(timeRange);
        if (!active) return;
        setDashboard(payload);
      } catch {
        if (!active) return;
        setError("Unable to load dashboard. Showing sample data.");
        setDashboard(DASHBOARD_DUMMY_DATA[timeRange] || DASHBOARD_DUMMY_DATA["7d"]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant, timeRange]);

  const stats = dashboard?.stats || {};
  const kpis = useMemo(
    () => [
      {
        id: "projects",
        label: "Total Projects",
        value: Number(stats.totalProjects || 0),
        icon: FolderKanban,
        onClick: () => navigate("/projects"),
      },
      {
        id: "tasks",
        label: "Total Tasks",
        value: Number(stats.totalTasks || 0),
        icon: ListChecks,
        onClick: () => navigate("/tasks"),
      },
      {
        id: "completed",
        label: "Completed Tasks",
        value: Number(stats.completedTasks || 0),
        icon: CheckCircle2,
        onClick: () => navigate("/tasks?status=done"),
      },
      {
        id: "rate",
        label: "Completion Rate",
        value: Number(stats.completionRate || 0),
        suffix: "%",
        icon: Percent,
        onClick: () => navigate("/tasks?status=done"),
      },
      {
        id: "overdue",
        label: "Overdue Tasks",
        value: Number(stats.overdueTasks || 0),
        icon: AlertTriangle,
        tone: Number(stats.overdueTasks || 0) > 0 ? "danger" : "default",
        onClick: () => navigate("/tasks?overdue=true"),
      },
    ],
    [navigate, stats],
  );

  const pushTaskFilters = (filters = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = String(value);
        }
        return acc;
      }, {}),
    ).toString();
    navigate(query ? `/tasks?${query}` : "/tasks");
  };

  return (
    <div className="space-y-6 page-enter">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track delivery velocity, task flow, and team output in one place.
          </p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </section>

      {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <SkeletonStatCard key={index} />)
          : kpis.map((kpi) => (
              <StatCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                suffix={kpi.suffix}
                icon={kpi.icon}
                tone={kpi.tone}
                onClick={kpi.onClick}
              />
            ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TasksByStatusDonut
          data={dashboard?.statusData || []}
          loading={loading}
          onSegmentClick={(entry) => {
            if (!entry?.key) return;
            pushTaskFilters({ status: entry.key });
          }}
        />

        <TasksCompletedOverTimeChart
          data={dashboard?.tasksCompletedOverTime || []}
          loading={loading}
          onPointClick={(point) => {
            if (!point?.date) return;
            pushTaskFilters({
              status: "done",
              updated_after: point.date,
              updated_before: point.date,
            });
          }}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TeamPerformanceChart
          data={dashboard?.teamPerformance || []}
          loading={loading}
          onBarClick={(row) => {
            if (!row?.memberId) return;
            pushTaskFilters({
              assignee: row.memberId,
              status: "done",
            });
          }}
        />

        <TasksComparisonChart
          data={dashboard?.tasksComparison || []}
          loading={loading}
          onSeriesPointClick={(series, point) => {
            if (!point?.date) return;
            if (series === "created") {
              pushTaskFilters({
                created_after: point.date,
                created_before: point.date,
              });
              return;
            }
            pushTaskFilters({
              status: "done",
              updated_after: point.date,
              updated_before: point.date,
            });
          }}
        />
      </section>

      <Card className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Activity</CardTitle>
          <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Latest 5
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-14" />
              ))}
            </div>
          ) : (dashboard?.recentActivity || []).length ? (
            (dashboard.recentActivity || []).slice(0, 5).map((item, index) => {
              const actorName = item?.actor?.name || "System";
              const avatar = actorName.slice(0, 2).toUpperCase();
              const target = item?.task?.title || item?.project?.name || "item";
              return (
                <div
                  key={`${item?.created_at || "now"}-${index}`}
                  className="flex gap-3 rounded-xl border border-border/70 bg-card/50 p-3"
                >
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-semibold text-white">
                    {avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{actorName}</span>{" "}
                      <span className="text-muted-foreground">
                        {String(item?.action || "").replaceAll("_", " ").toLowerCase()}
                      </span>{" "}
                      <span className="font-medium">{target}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{relativeLabel(item?.created_at)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-4">
              <p className="text-sm text-muted-foreground">No data available.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
