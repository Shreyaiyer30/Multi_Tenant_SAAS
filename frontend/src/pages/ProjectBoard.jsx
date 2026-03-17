import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Users, MessageSquare, Paperclip } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import TaskModal from "@/components/TaskModal";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import { useTenant } from "@/context/TenantContext";

const columnOrder = ["todo", "in_progress", "in_review", "done"];

const priorityConfig = {
  low: { color: 'var(--accent)', label: 'Low' },
  medium: { color: 'var(--accent4)', label: 'Med' },
  high: { color: 'var(--accent2)', label: 'High' },
  urgent: { color: 'var(--accent3)', label: 'Urgent' }
};

function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const assigneeLabel =
    task?.assignee_name || task?.assignee_details?.display_name || task?.assignee_email || "U";
  
  const priority = priorityConfig[task.priority] || priorityConfig.low;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer elevate-hover mb-3 ${
        isDragging ? "opacity-40 z-50 scale-105 shadow-2xl" : "bg-surface2"
      }`}
      style={{ ...style, borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priority.color }} />
           <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{priority.label}</span>
        </div>
        <GripVertical className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>

      <h4 className="font-syne font-bold text-text text-sm leading-snug mb-4 group-hover:text-accent transition-colors">
        {task.title}
      </h4>

      <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 text-[10px] text-muted">
              <MessageSquare className="w-3 h-3" />
              <span>{Math.floor(Math.random() * 5)}</span>
           </div>
           <div className="flex items-center gap-1 text-[10px] text-muted">
              <Paperclip className="w-3 h-3" />
              <span>{Math.floor(Math.random() * 3)}</span>
           </div>
        </div>
        
        <div className="flex -space-x-2">
           <div className="w-6 h-6 rounded-full border-2 border-surface2 bg-accent5 flex items-center justify-center text-[8px] font-bold text-white uppercase">
              {assigneeLabel[0]}
           </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const { id } = useParams();
  const [board, setBoard] = useState({
    todo: [], in_progress: [], in_review: [], done: []
  });
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
      setBoard({
        todo: columns.todo || [],
        in_progress: columns.in_progress || [],
        in_review: columns.in_review || [],
        done: columns.done || []
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

  const onDragEnd = async ({ active, over }) => {
    if (!over) return;
    const from = columnOrder.find(col => board[col].some(t => t.id === active.id));
    const to = columnOrder.includes(over.id) ? over.id : columnOrder.find(col => board[col].some(t => t.id === over.id));
    
    if (!from || !to || from === to) return;

    const task = board[from].find(t => t.id === active.id);
    setBoard(prev => ({
      ...prev,
      [from]: prev[from].filter(t => t.id !== active.id),
      [to]: [{ ...task, status: to }, ...prev[to]]
    }));

    try {
      await api.patch(`tasks/${active.id}/move/`, { status: to });
      toast.success("Flow Updated");
    } catch {
      toast.error("Reverting Flow");
      loadBoard();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-8 page-enter overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-3xl font-syne font-bold text-text tracking-tight truncate">{project.name || "Flow Stream"}</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-muted font-medium uppercase tracking-[0.2em]">Workspace / Projects / Stream</span>
             <span className="w-1 h-1 rounded-full bg-accent" />
             <span className="text-xs text-text font-bold font-dm-mono">{Object.values(board).flat().length} Active Flows</span>
          </div>
        </div>

        <button 
           onClick={() => setMembersOpen(true)}
           className="h-11 px-6 rounded-xl font-syne font-bold text-sm bg-surface2 border border-border text-text hover:border-accent transition-all flex items-center gap-2"
        >
          <Users className="w-4 h-4 text-accent" />
          <span>Members</span>
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
          {columnOrder.map((status, idx) => (
            <div 
               key={status} 
               className="min-h-full w-[320px] shrink-0 flex flex-col animate-fade-up"
               style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-center justify-between px-2 mb-6">
                 <div className="flex items-center gap-3">
                    <div className={`w-1 h-4 rounded-full ${
                       status === 'todo' ? 'bg-muted' : 
                       status === 'in_progress' ? 'bg-accent2' :
                       status === 'in_review' ? 'bg-accent5' : 'bg-accent'
                    }`} />
                    <h3 className="text-[11px] font-bold text-text uppercase tracking-[0.2em]">
                       {status.replace("_", " ")}
                    </h3>
                 </div>
                 <span className="bg-surface2 px-2 py-0.5 rounded border border-border text-[10px] font-bold text-muted">
                    {board[status].length}
                 </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]" id={status}>
                <SortableContext items={board[status].map(t => t.id)} strategy={rectSortingStrategy}>
                  {board[status].map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}
                  {board[status].length === 0 && (
                     <div className="h-32 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-muted border-border/40">
                        <span className="text-2xl mb-2 opacity-10">✨</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Drop Here</p>
                     </div>
                  )}
                </SortableContext>
              </div>
            </div>
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
