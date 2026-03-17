import api from "@/api/api";

const RANGE_TO_DAYS = { "7d": 7, "30d": 30, "90d": 90 };
const STATUS_ORDER = ["todo", "in_progress", "in_review", "done"];

const safeArray = (payload) => payload?.results || payload || [];

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const asDateKey = (value) => {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
};

function getRangeWindow(rangeKey) {
  const days = RANGE_TO_DAYS[rangeKey] || 7;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { days, start, end };
}

function dateBuckets(rangeKey) {
  const { days, start } = getRangeWindow(rangeKey);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      dateKey,
      label: days <= 7
        ? date.toLocaleDateString(undefined, { weekday: "short" })
        : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      fullDate: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    };
  });
}

function inRange(value, rangeKey) {
  const current = toDate(value);
  if (!current) return false;
  const { start, end } = getRangeWindow(rangeKey);
  return current >= start && current <= end;
}

function normalizeMembers(rows) {
  return safeArray(rows).map((membership) => {
    const user = membership?.user || {};
    return {
      id: String(user.id || membership.id),
      name: user.display_name || user.email || "Member",
    };
  });
}

function normalizeRecent(items) {
  return safeArray(items).map((item) => ({
    actor: {
      id: item?.actor?.id || null,
      name: item?.actor?.name || item?.actor?.display_name || "System",
    },
    action: item?.action || item?.event_type || "task_updated",
    task: item?.task || { id: item?.task_id || null, title: item?.title || "Task" },
    project: item?.project || null,
    created_at: item?.created_at,
  }));
}

function aggregateFromRawData({ tasks, members, projects, recent }, rangeKey) {
  const bucketRows = dateBuckets(rangeKey);
  const bucketMap = bucketRows.reduce((acc, row) => {
    acc[row.dateKey] = { ...row, created: 0, completed: 0 };
    return acc;
  }, {});

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = tasks.filter((task) => {
    if (!task?.due_date || task?.status === "done") return false;
    const due = toDate(task.due_date);
    return due ? due < today : false;
  }).length;

  const createdInRange = tasks.filter((task) => inRange(task?.created_at, rangeKey));
  const completedInRange = tasks.filter(
    (task) => task?.status === "done" && inRange(task?.updated_at || task?.created_at, rangeKey),
  );

  createdInRange.forEach((task) => {
    const key = asDateKey(task.created_at);
    if (bucketMap[key]) bucketMap[key].created += 1;
  });
  completedInRange.forEach((task) => {
    const key = asDateKey(task.updated_at || task.created_at);
    if (bucketMap[key]) bucketMap[key].completed += 1;
  });

  const statusRows = STATUS_ORDER.map((statusKey) => ({
    key: statusKey,
    label: statusKey.replaceAll("_", " "),
    value: createdInRange.filter((task) => task.status === statusKey).length,
  }));

  const memberRows = normalizeMembers(members);
  const completedByAssignee = completedInRange.reduce((acc, task) => {
    if (!task?.assignee) return acc;
    const assigneeId = String(task.assignee);
    acc[assigneeId] = (acc[assigneeId] || 0) + 1;
    return acc;
  }, {});

  const teamPerformance = memberRows
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      completed: Number(completedByAssignee[member.id] || 0),
    }))
    .filter((row) => row.completed > 0)
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 8);

  const comparison = bucketRows.map((bucket) => ({
    date: bucket.dateKey,
    label: bucketMap[bucket.dateKey].label,
    fullDate: bucketMap[bucket.dateKey].fullDate,
    created: bucketMap[bucket.dateKey].created,
    completed: bucketMap[bucket.dateKey].completed,
  }));

  const completedOverTime = comparison.map((row) => ({
    date: row.date,
    label: row.label,
    fullDate: row.fullDate,
    completed: row.completed,
  }));

  const totalTasks = createdInRange.length;
  const completedTasks = completedInRange.length;

  return {
    stats: {
      totalProjects: safeArray(projects).length,
      totalTasks,
      completedTasks,
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      overdueTasks: overdueCount,
    },
    statusData: statusRows,
    tasksCompletedOverTime: completedOverTime,
    teamPerformance,
    tasksComparison: comparison,
    recentActivity: normalizeRecent(recent).slice(0, 5),
    dataSource: "derived",
  };
}

async function requestAny(paths, config) {
  for (const path of paths) {
    try {
      const response = await api.get(path, config);
      return response.data;
    } catch {
      // Try next endpoint variation.
    }
  }
  return null;
}

async function fetchAdvancedApi(rangeKey) {
  const params = { range: rangeKey };
  const [stats, trend, team, comparison] = await Promise.all([
    requestAny(["dashboard/stats/", "dashboard/stats"], { params }),
    requestAny(["dashboard/tasks-trend/", "dashboard/tasks-trend"], { params }),
    requestAny(["dashboard/team-performance/", "dashboard/team-performance"], { params }),
    requestAny(["dashboard/tasks-comparison/", "dashboard/tasks-comparison"], { params }),
  ]);

  if (!stats || !trend || !team || !comparison) {
    return null;
  }

  const normalizedTrend = safeArray(trend).map((row) => ({
    date: row.date,
    label: row.label || row.date,
    fullDate: row.full_date || row.date,
    completed: Number(row.completed || 0),
  }));
  const normalizedComparison = safeArray(comparison).map((row) => ({
    date: row.date,
    label: row.label || row.date,
    fullDate: row.full_date || row.date,
    created: Number(row.created || 0),
    completed: Number(row.completed || 0),
  }));
  const normalizedStatus = safeArray(stats.by_status || stats.status || []).length
    ? safeArray(stats.by_status || stats.status).map((row) => ({
        key: row.key || row.status,
        label: (row.label || row.status || "").replaceAll("_", " "),
        value: Number(row.value || row.count || 0),
      }))
    : STATUS_ORDER.map((statusKey) => ({
        key: statusKey,
        label: statusKey.replaceAll("_", " "),
        value: Number(stats?.by_status?.[statusKey] || 0),
      }));

  return {
    stats: {
      totalProjects: Number(stats.total_projects || stats.totalProjects || 0),
      totalTasks: Number(stats.total_tasks || stats.totalTasks || 0),
      completedTasks: Number(stats.completed_tasks || stats.completedTasks || 0),
      completionRate: Number(stats.completion_rate || stats.completionRate || 0),
      overdueTasks: Number(stats.overdue_tasks || stats.overdueTasks || 0),
    },
    statusData: normalizedStatus,
    tasksCompletedOverTime: normalizedTrend,
    teamPerformance: safeArray(team).map((row) => ({
      memberId: String(row.member_id || row.user_id || row.id),
      name: row.name || row.member_name || "Member",
      completed: Number(row.completed || row.count || 0),
    })),
    tasksComparison: normalizedComparison,
    recentActivity: [],
    dataSource: "advanced_api",
  };
}

function dummyBundle(rangeKey) {
  const buckets = dateBuckets(rangeKey);
  const createdSeed = [5, 7, 4, 6, 8, 5, 9, 3, 6, 7];
  const completedSeed = [3, 6, 2, 5, 7, 4, 8, 2, 5, 6];

  const tasksComparison = buckets.map((bucket, index) => ({
    date: bucket.dateKey,
    label: bucket.label,
    fullDate: bucket.fullDate,
    created: createdSeed[index % createdSeed.length],
    completed: completedSeed[index % completedSeed.length],
  }));

  const tasksCompletedOverTime = tasksComparison.map((row) => ({
    date: row.date,
    label: row.label,
    fullDate: row.fullDate,
    completed: row.completed,
  }));

  const statusData = [
    { key: "todo", label: "todo", value: 12 },
    { key: "in_progress", label: "in progress", value: 9 },
    { key: "in_review", label: "in review", value: 5 },
    { key: "done", label: "done", value: 21 },
  ];
  const teamPerformance = [
    { memberId: "shreya", name: "Shreya", completed: 10 },
    { memberId: "sam", name: "Sam", completed: 7 },
    { memberId: "riya", name: "Riya", completed: 4 },
  ];
  const totalTasks = statusData.reduce((sum, row) => sum + row.value, 0);
  const completedTasks = statusData.find((row) => row.key === "done")?.value || 0;

  return {
    stats: {
      totalProjects: 8,
      totalTasks,
      completedTasks,
      completionRate: Math.round((completedTasks / totalTasks) * 100),
      overdueTasks: 3,
    },
    statusData,
    tasksCompletedOverTime,
    teamPerformance,
    tasksComparison,
    recentActivity: [
      { actor: { name: "Shreya" }, action: "task_completed", task: { title: "Finalize pricing page" }, created_at: new Date().toISOString() },
      { actor: { name: "Sam" }, action: "task_updated", task: { title: "Refactor auth middleware" }, created_at: new Date().toISOString() },
      { actor: { name: "Riya" }, action: "comment_added", task: { title: "Design QA fixes" }, created_at: new Date().toISOString() },
    ],
    dataSource: "dummy",
  };
}

export const DASHBOARD_DUMMY_DATA = {
  "7d": dummyBundle("7d"),
  "30d": dummyBundle("30d"),
  "90d": dummyBundle("90d"),
};

export async function getDashboardBundle(rangeKey = "7d") {
  const advanced = await fetchAdvancedApi(rangeKey);

  const [tasksResult, membersResult, projectsResult, recentResult] = await Promise.allSettled([
    api.get("tasks/", { params: { ordering: "-updated_at", limit: 300 } }),
    api.get("members/"),
    api.get("projects/", { params: { ordering: "-created_at", limit: 100 } }),
    requestAny(["dashboard/recent-activity/?limit=5", "dashboard/recent-activity?limit=5"]),
  ]);

  const tasks = tasksResult.status === "fulfilled" ? safeArray(tasksResult.value.data) : [];
  const members = membersResult.status === "fulfilled" ? safeArray(membersResult.value.data) : [];
  const projects = projectsResult.status === "fulfilled" ? safeArray(projectsResult.value.data) : [];
  const recent = recentResult.status === "fulfilled" ? safeArray(recentResult.value) : [];

  const derived = aggregateFromRawData({ tasks, members, projects, recent }, rangeKey);
  const dummy = DASHBOARD_DUMMY_DATA[rangeKey] || DASHBOARD_DUMMY_DATA["7d"];

  if (advanced) {
    return {
      ...derived,
      ...advanced,
      recentActivity: derived.recentActivity,
      dataSource: advanced.dataSource,
    };
  }

  const hasRealData =
    derived.stats.totalTasks > 0 ||
    derived.stats.totalProjects > 0 ||
    derived.teamPerformance.length > 0 ||
    derived.tasksComparison.some((row) => row.created || row.completed);

  return hasRealData ? derived : dummy;
}
