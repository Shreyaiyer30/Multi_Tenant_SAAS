import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageSquare, Paperclip, Users } from "lucide-react";
import api from "@/api/api";
import TaskModal from "@/components/TaskModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import { useTenant } from "@/context/TenantContext";

const columnOrder = ["todo", "in_progress", "in_review", "done"];

const priorityConfig = {
  low: { color: "var(--accent)", label: "Low" },
  medium: { color: "var(--accent4)", label: "Med" },
  high: { color: "var(--accent2)", label: "High" },
  urgent: { color: "var(--accent3)", label: "Urgent" },
};

function initialsFromName(value) {
  const text = String(value || "").trim();
  if (!text) return "--";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function metricFromId(id, modulo) {
  const text = String(id || "");
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    total += text.charCodeAt(index);
  }
  return total % modulo;
}

function TaskCard({ task, assigneeName, onClick }) {
  const priority = priorityConfig[task.priority] || priorityConfig.low;
  const isAssigned = Boolean(task?.assignee);
  const initials = initialsFromName(assigneeName);

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2.5 w-full rounded-xl border bg-surface2 p-2.5 text-left transition-colors hover:border-accent/35"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">{priority.label}</span>
      </div>

      <h4 className="mb-2 line-clamp-2 text-xs font-bold leading-snug text-text">{task.title || "Untitled task"}</h4>

      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <MessageSquare className="h-3 w-3" />
            <span>{metricFromId(task.id, 5)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <Paperclip className="h-3 w-3" />
            <span>{metricFromId(task.id, 3)}</span>
          </div>
        </div>

        <div
          className={`flex h-6 min-w-6 items-center justify-center rounded-full border px-1 text-[9px] font-bold uppercase ${
            isAssigned ? "bg-accent5 text-white" : "bg-surface text-muted"
          }`}
          style={{ borderColor: "var(--border)" }}
          title={isAssigned ? assigneeName : "Unassigned"}
        >
          {isAssigned ? initials : "--"}
        </div>
      </div>
    </button>
  );
}

export default function ProjectBoard() {
  const { id } = useParams();
  const [board, setBoard] = useState({
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  });
  const [project, setProject] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const { tenant } = useTenant();

  const loadBoard = () => {
    api.get(`projects/${id}/board/`).then((res) => {
      const data = res.data;
      setProject(data.project || {});
      const columns = data.columns || {};
      setBoard({
        todo: columns.todo || [],
        in_progress: columns.in_progress || [],
        in_review: columns.in_review || [],
        done: columns.done || [],
      });
    });
  };

  const loadWorkspaceMembers = () => {
    api.get("members/").then((res) => setWorkspaceMembers(res.data.results || res.data || []));
  };

  useEffect(() => {
    if (!tenant) return;
    loadBoard();
    loadWorkspaceMembers();
  }, [id, tenant]);

  const assigneeMap = useMemo(() => {
    const map = {};
    (workspaceMembers || []).forEach((membership) => {
      const user = membership?.user || {};
      if (!user?.id) return;
      map[String(user.id)] = user.display_name || user.email || "Member";
    });
    return map;
  }, [workspaceMembers]);

  return (
    <div className="page-enter flex h-full flex-col space-y-8 overflow-hidden p-6">
      <div className="shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-syne font-bold tracking-tight text-text">
            {project.name || "Flow Stream"}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Workspace / Projects / Stream</span>
            <span className="h-1 w-1 rounded-full bg-accent" />
            <span className="font-dm-mono text-xs font-bold text-text">{Object.values(board).flat().length} Active Flows</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface2 px-6 text-sm font-syne font-bold text-text transition-all hover:border-accent"
        >
          <Users className="h-4 w-4 text-accent" />
          <span>Members</span>
        </button>
      </div>

      <div className="custom-scrollbar flex flex-1 items-start gap-6 overflow-x-auto pb-4">
        {columnOrder.map((status, idx) => (
          <div
            key={status}
            className="animate-fade-up flex min-h-full w-[300px] shrink-0 flex-col"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="mb-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-1 rounded-full ${
                    status === "todo"
                      ? "bg-muted"
                      : status === "in_progress"
                        ? "bg-accent2"
                        : status === "in_review"
                          ? "bg-accent5"
                          : "bg-accent"
                  }`}
                />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-text">{status.replace("_", " ")}</h3>
              </div>
              <span className="rounded border border-border bg-surface2 px-2 py-0.5 text-[10px] font-bold text-muted">
                {board[status].length}
              </span>
            </div>

            <div className="custom-scrollbar min-h-[100px] flex-1 overflow-y-auto pr-2" id={status}>
              {board[status].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assigneeName={
                    assigneeMap[String(task?.assignee)] ||
                    task?.assignee_name ||
                    task?.assignee_details?.display_name ||
                    task?.assignee_email ||
                    ""
                  }
                  onClick={() => setSelectedTask(task)}
                />
              ))}
              {!board[status].length ? (
                <div className="flex h-20 items-center rounded-2xl border border-dashed border-border/50 bg-surface2/30 px-3 text-[11px] text-muted">
                  No tasks in this column
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <TaskModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdated={loadBoard}
      />

      <ProjectMembersModal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        project={project}
        workspaceMembers={workspaceMembers}
        onUpdated={loadBoard}
      />
    </div>
  );
}
