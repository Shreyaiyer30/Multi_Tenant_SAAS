import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Percent,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib";

const STATUS_ORDER = ["todo", "in_progress", "in_review", "done"];
const STATUS_COLORS = {
  todo: "#8b5cf6",
  in_progress: "#0ea5e9",
  in_review: "#f59e0b",
  done: "#10b981"
};

function SkeletonCard() {
  return <div className="skeleton h-[136px]" />;
}

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

function normalizeList(payload) {
  return payload?.results || payload || [];
}

function toOverviewShape(data) {
  if (data?.projects) return data;
  if (!data) return null;
  return {
    projects: {
      total: data?.overview?.total_projects ?? data?.total_projects ?? 0,
      by_status: data?.tasks_by_status || {},
      by_priority: data?.tasks_by_priority || {}
    }
  };
}

function normalizeRecent(items) {
  return (items || []).map((item) => ({
    actor: {
      id: item?.actor?.id || null,
      name: item?.actor?.name || item?.actor?.display_name || "System"
    },
    action: item?.action || item?.event_type || "TASK_UPDATED",
    task: item?.task || { id: item?.task_id || null, title: item?.title || "Task" },
    project: item?.project || null,
    created_at: item?.created_at
  }));
}

function AnimatedCounter({ value, suffix = "", className = "" }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const numericTarget = Number(value || 0);
    let frameId = 0;
    const start = performance.now();
    const duration = 650;

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numericTarget * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

function trendMeta(current, previous) {
  if (!previous && !current) return { direction: "flat", text: "No change" };
  if (!previous && current) return { direction: "up", text: "New activity" };
  const diffPct = Math.round(((current - previous) / previous) * 100);
  if (diffPct > 0) return { direction: "up", text: `+${diffPct}% vs last week` };
  if (diffPct < 0) return { direction: "down", text: `${diffPct}% vs last week` };
  return { direction: "flat", text: "No change" };
}

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        let nextOverview = null;
        let nextRecent = [];

        try {
          const [overviewRes, recentRes] = await Promise.all([
            api.get("dashboard/overview/"),
            api.get("dashboard/recent-activity/?limit=8")
          ]);
          nextOverview = toOverviewShape(overviewRes.data || {});
          nextRecent = normalizeRecent(recentRes.data || []);
        } catch {
          const [summaryRes, workspaceRes] = await Promise.all([
            api.get("workspace/dashboard/summary/"),
            api.get("workspace/dashboard/")
          ]);
          nextOverview = toOverviewShape({
            total_projects: summaryRes.data?.total_projects ?? 0,
            tasks_by_status: workspaceRes.data?.tasks_by_status || {},
            tasks_by_priority: workspaceRes.data?.tasks_by_priority || {}
          });
          nextRecent = normalizeRecent(workspaceRes.data?.recent_activity || []);
        }

        const [tasksRes, membersRes, projectsRes] = await Promise.allSettled([
          api.get("tasks/", { params: { ordering: "-updated_at" } }),
          api.get("members/"),
          api.get("projects/", { params: { ordering: "-created_at" } })
        ]);

        if (!active) return;

        setOverview(nextOverview);
        setRecentItems(nextRecent);
        setTasks(tasksRes.status === "fulfilled" ? normalizeList(tasksRes.value.data) : []);
        setMembers(membersRes.status === "fulfilled" ? normalizeList(membersRes.value.data) : []);
        setProjects(projectsRes.status === "fulfilled" ? normalizeList(projectsRes.value.data) : []);
      } catch {
        if (!active) return;
        setOverview(null);
        setRecentItems([]);
        setTasks([]);
        setMembers([]);
        setProjects([]);
        setError("Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [tenant]);

  const statusBreakdown = useMemo(() => {
    const source = overview?.projects?.by_status || {};
    return STATUS_ORDER.reduce((acc, key) => {
      acc[key] = Number(source[key] || 0);
      return acc;
    }, {});
  }, [overview]);

  const projectTotal = overview?.projects?.total ?? projects.length;
  const totalTasks = STATUS_ORDER.reduce((sum, key) => sum + Number(statusBreakdown[key] || 0), 0);
  const completedTasks = Number(statusBreakdown.done || 0);
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusData = STATUS_ORDER.map((key) => ({
    name: key.replace("_", " "),
    key,
    value: statusBreakdown[key]
  }));

  const trendSeries = useMemo(() => {
    const now = new Date();
    const labels = Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - idx));
      return {
        date: day,
        label: day.toLocaleDateString(undefined, { weekday: "short" })
      };
    });

    return labels.map(({ date, label }) => {
      const dayKey = date.toISOString().slice(0, 10);
      const completed = tasks.filter((task) => {
        if (task.status !== "done") return false;
        const updated = task.updated_at ? String(task.updated_at).slice(0, 10) : "";
        return updated === dayKey;
      }).length;
      return { label, completed };
    });
  }, [tasks]);

  const metricTrends = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const countInWindow = (items, getDate) => {
      const current = items.filter((item) => {
        const when = new Date(getDate(item));
        return when >= sevenDaysAgo && when <= now;
      }).length;
      const previous = items.filter((item) => {
        const when = new Date(getDate(item));
        return when >= fourteenDaysAgo && when < sevenDaysAgo;
      }).length;
      return { current, previous };
    };

    const projectTrend = countInWindow(projects, (item) => item.created_at);
    const taskTrend = countInWindow(tasks, (item) => item.created_at);
    const doneTasks = tasks.filter((task) => task.status === "done");
    const completedTrend = countInWindow(doneTasks, (item) => item.updated_at || item.created_at);

    const currentRate = taskTrend.current
      ? Math.round((completedTrend.current / taskTrend.current) * 100)
      : 0;
    const previousRate = taskTrend.previous
      ? Math.round((completedTrend.previous / taskTrend.previous) * 100)
      : 0;

    return {
      projects: trendMeta(projectTrend.current, projectTrend.previous),
      tasks: trendMeta(taskTrend.current, taskTrend.previous),
      completed: trendMeta(completedTrend.current, completedTrend.previous),
      rate: trendMeta(currentRate, previousRate)
    };
  }, [projects, tasks]);

  const workloadRows = useMemo(() => {
    if (!members.length) return [];
    const counts = tasks.reduce((acc, task) => {
      if (task.assignee) acc[task.assignee] = (acc[task.assignee] || 0) + 1;
      return acc;
    }, {});
    const max = Math.max(...Object.values(counts), 1);
    return members
      .map((member) => {
        const user = member.user || {};
        const assigned = counts[user.id] || 0;
        const percentage = Math.round((assigned / max) * 100);
        return {
          id: user.id || member.id,
          name: user.display_name || user.email || "Member",
          avatar: (user.display_name || user.email || "M").slice(0, 2).toUpperCase(),
          percentage
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [members, tasks]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => task.due_date && task.status !== "done")
      .map((task) => {
        const due = new Date(task.due_date);
        const diff = daysBetween(due, now);
        return { task, diff };
      })
      .filter((item) => item.diff >= 0 && item.diff <= 7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 6);
  }, [tasks]);

  const kpis = [
    {
      id: "projects",
      label: "Total Projects",
      value: projectTotal,
      icon: FolderKanban,
      trend: metricTrends.projects,
      onClick: () => navigate("/projects")
    },
    {
      id: "tasks",
      label: "Total Tasks",
      value: totalTasks,
      icon: ListChecks,
      trend: metricTrends.tasks,
      onClick: () => navigate("/tasks")
    },
    {
      id: "completed",
      label: "Completed Tasks",
      value: completedTasks,
      icon: CheckCircle2,
      trend: metricTrends.completed,
      onClick: () => navigate("/tasks")
    },
    {
      id: "rate",
      label: "Completion Rate",
      value: completionRate,
      suffix: "%",
      icon: Percent,
      trend: metricTrends.rate,
      onClick: () => navigate("/reports")
    }
  ];

  return (
    <div className="space-y-6 page-enter">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace intelligence across projects, tasks, and team delivery.
          </p>
        </div>
      </section>

      {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isUp = kpi.trend.direction === "up";
              const isDown = kpi.trend.direction === "down";
              return (
                <Card
                  key={kpi.id}
                  className="elevate-hover cursor-pointer rounded-xl border border-border/75"
                  onClick={kpi.onClick}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                        <AnimatedCounter
                          value={kpi.value}
                          suffix={kpi.suffix || ""}
                          className="mt-2 block text-3xl font-semibold tracking-tight"
                        />
                      </div>
                      <div className="rounded-xl bg-gradient-to-r from-primary/20 to-secondary/25 p-2.5 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
                        isUp && "bg-success/20 text-success",
                        isDown && "bg-danger/20 text-danger-foreground",
                        !isUp && !isDown && "bg-muted/70 text-muted-foreground"
                      )}
                    >
                      {isUp ? <TrendingUp className="h-3 w-3" /> : null}
                      {isDown ? <TrendingDown className="h-3 w-3" /> : null}
                      {kpi.trend.text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <div className="skeleton h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={4}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, String(name).replace("_", " ")]}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Productivity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <div className="skeleton h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    formatter={(value) => [`${value} completed`, "Tasks"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className="rounded-xl xl:col-span-5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="skeleton h-14" />
                ))}
              </div>
            ) : recentItems.length ? (
              recentItems.map((item, idx) => {
                const name = item.actor?.name || "System";
                const avatar = name.slice(0, 2).toUpperCase();
                const itemName = item.task?.title || item.project?.name || "item";
                return (
                  <div key={`${item.created_at}-${idx}`} className="flex gap-3 rounded-xl border border-border/70 bg-card/50 p-3">
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 text-xs font-semibold text-white">
                      {avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{name}</span>{" "}
                        <span className="text-muted-foreground">
                          {String(item.action || "").replaceAll("_", " ").toLowerCase()}
                        </span>{" "}
                        <span className="font-medium">{itemName}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{relativeLabel(item.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl xl:col-span-4">
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="skeleton h-12" />
                ))}
              </div>
            ) : workloadRows.length ? (
              workloadRows.map((row) => (
                <div key={row.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/25 text-[10px] font-semibold text-secondary">
                        {row.avatar}
                      </span>
                      <span className="truncate text-sm">{row.name}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{row.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/70">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                No member workload data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl xl:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="skeleton h-10" />
                ))}
              </div>
            ) : upcomingDeadlines.length ? (
              upcomingDeadlines.map(({ task, diff }) => {
                const today = diff === 0;
                const tomorrow = diff === 1;
                return (
                  <div key={task.id} className="rounded-xl border border-border/70 bg-card/45 p-2.5">
                    <p className="line-clamp-1 text-sm font-medium">{task.title}</p>
                    <p
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 text-xs",
                        today && "text-danger-foreground",
                        tomorrow && "text-amber-500",
                        !today && !tomorrow && "text-muted-foreground"
                      )}
                    >
                      {today ? "🔥 Today" : tomorrow ? "⚠ Tomorrow" : `📅 ${diff} days`}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                No deadlines this week.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
