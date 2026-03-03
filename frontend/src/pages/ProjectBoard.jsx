import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TaskModal from "@/components/TaskModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import { useTenant } from "@/context/TenantContext";
import EmptyState from "@/components/EmptyState";

const columnOrder = ["todo", "in_progress", "in_review", "done"];

const priorityStyles = {
  low: "bg-success/20 text-success-foreground border-success/35",
  medium: "bg-primary/18 text-primary-foreground border-primary/30",
  high: "bg-primary-hover/20 text-primary-foreground border-primary-hover/35",
  urgent: "bg-danger/20 text-danger-foreground border-danger/35"
};

function TaskAvatar({ label }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-[10px] font-semibold text-muted-foreground">
      {(label || "U").slice(0, 2).toUpperCase()}
    </span>
  );
}

function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const assigneeLabel =
    task?.assignee_name || task?.assignee_details?.display_name || task?.assignee_email || "Unassigned";

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-full rounded-xl border border-border/70 bg-card/80 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-card hover:shadow-lg ${isDragging ? "opacity-80 shadow-xl" : ""}`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium tracking-tight">{task.title}</p>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityStyles[task.priority] || "bg-muted/40 text-muted-foreground border-border/60"}`}
        >
          {task.priority || "none"}
        </span>
        <div className="flex items-center -space-x-2">
          <TaskAvatar label={assigneeLabel} />
        </div>
      </div>
    </button>
  );
}

export default function ProjectBoard() {
  const { id } = useParams();
  const [board, setBoard] = useState({});
  const [project, setProject] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const { tenant } = useTenant();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadBoard = () => {
    api.get(`projects/${id}/board/`).then((res) => {
      const data = res.data;
      setProject(data.project || {});
      const columns = data.columns || {};
      const normalized = {
        todo: columns.todo || [],
        in_progress: columns.in_progress || [],
        in_review: columns.in_review || [],
        done: columns.done || []
      };
      setBoard(normalized);
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

  const allTasks = useMemo(() => columnOrder.flatMap((col) => board[col] || []), [board]);
  const totalTasks = allTasks.length;

  const findColumnByTaskId = (taskId) =>
    columnOrder.find((col) => (board[col] || []).some((task) => task.id === taskId));

  const onDragEnd = async ({ active, over }) => {
    if (!over) return;
    const from = findColumnByTaskId(active.id);
    const to = columnOrder.includes(over.id) ? over.id : findColumnByTaskId(over.id);
    if (!from || !to || from === to) return;

    const movedTask = allTasks.find((task) => task.id === active.id);
    setBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((task) => task.id !== active.id),
      [to]: [{ ...movedTask, status: to }, ...(prev[to] || [])]
    }));

    try {
      await api.patch(`tasks/${active.id}/move/`, { status: to });
      toast.success("Task moved");
    } catch {
      toast.error("Move failed");
      loadBoard();
    }
  };

  return (
    <div className="space-y-5 page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name || "Project Board"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kanban flow with smooth drag interactions and team context.</p>
        </div>

        <Button variant="secondary" size="sm" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => setMembersOpen(true)}>
          <Users className="h-4 w-4" />
          Members
        </Button>
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={Users}
          title="No tasks on this board"
          description="Create tasks in this project and they will appear in columns for drag-and-drop management."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4">
            {columnOrder.map((status) => (
              <Card key={status} className="h-[calc(100vh-240px)] min-h-[420px] w-[300px] shrink-0 overflow-hidden sm:w-[320px]">
                <CardHeader className="sticky top-0 z-10 border-b border-border/70 bg-card/95 backdrop-blur">
                  <CardTitle className="flex items-center justify-between text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    <span>{status.replace("_", " ")}</span>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs text-foreground">{(board[status] || []).length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-72px)] overflow-y-auto">
                  <SortableContext items={(board[status] || []).map((task) => task.id)} strategy={rectSortingStrategy}>
                    <div className="space-y-2.5 min-h-24" id={status}>
                      {(board[status] || []).map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            ))}
          </div>
        </DndContext>
      )}

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
