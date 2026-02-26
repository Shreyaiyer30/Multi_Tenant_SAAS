import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TaskModal from "@/components/TaskModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import { useTenant } from "@/context/TenantContext";

const columnOrder = ["todo", "in_progress", "in_review", "done"];

function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, data: { task } });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border bg-card p-3"
      onClick={onClick}
    >
      <p className="font-medium">{task.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{task.priority}</p>
    </div>
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
    loadBoard();
    loadWorkspaceMembers();
  }, [id, tenant]);

  const allTasks = useMemo(() => columnOrder.flatMap((col) => board[col] || []), [board]);

  const findColumnByTaskId = (taskId) => columnOrder.find((col) => (board[col] || []).some((t) => t.id === taskId));

  const onDragEnd = async ({ active, over }) => {
    if (!over) return;
    const from = findColumnByTaskId(active.id);
    const to = columnOrder.includes(over.id) ? over.id : findColumnByTaskId(over.id);
    if (!from || !to || from === to) return;

    const movedTask = allTasks.find((t) => t.id === active.id);
    setBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t.id !== active.id),
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project.name || "Project Board"}</h1>
        <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
          <Users className="mr-2 h-4 w-4" />
          Members
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid gap-4 lg:grid-cols-4">
          {columnOrder.map((status) => (
            <Card key={status} id={status}>
              <CardHeader>
                <CardTitle className="capitalize">{status.replace("_", " ")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SortableContext items={(board[status] || []).map((task) => task.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-2 min-h-24" id={status}>
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
