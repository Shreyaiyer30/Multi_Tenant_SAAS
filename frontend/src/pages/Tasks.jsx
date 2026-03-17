import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api/api";
import TaskModal from "@/components/TaskModal";
import TaskCreateModal from "@/components/TaskCreateModal";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const location = useLocation();

  const currentWorkspace = (user?.workspaces || []).find((ws) => ws.slug === tenant);
  const canCreate = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

  const taskFilters = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return Object.fromEntries(search.entries());
  }, [location.search]);

  const assigneeNameById = members.reduce((acc, membership) => {
    const userId = membership?.user?.id;
    if (userId) {
      acc[userId] = membership.user.display_name || membership.user.email;
    }
    return acc;
  }, {});

  const loadTasks = () => {
    const params = { ordering: "-updated_at", ...taskFilters };
    api
      .get("tasks/", { params })
      .then((res) => setTasks(res.data.results || res.data || []))
      .catch(() => setTasks([]));
  };

  const loadMembers = () => {
    api
      .get("members/")
      .then((res) => setMembers(res.data.results || res.data || []))
      .catch(() => setMembers([]));
  };

  const loadProjects = () => {
    api
      .get("projects/")
      .then((res) => setProjects(res.data.results || res.data || []))
      .catch(() => setProjects([]));
  };

  useEffect(() => {
    loadMembers();
    loadProjects();
    loadTasks();
  }, [tenant, location.search]);

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this task? This action cannot be undone.")) return;
    try {
      await api.delete(`tasks/${taskId}/`);
      toast.success("Task deleted");
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch {
      toast.error("Unable to delete task");
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return 'var(--accent3)';
    if (p === 'medium') return 'var(--accent4)';
    return 'var(--accent)';
  };

  return (
    <div className="p-6 space-y-8 page-enter h-full flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-syne font-bold text-text tracking-tight">Tasks</h1>
          <p className="text-xs text-muted font-medium uppercase tracking-[0.2em] mt-1">Workspace / Task Management / Tasks</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setOpenCreate(true)}
            className="h-11 px-6 rounded-xl font-syne font-bold text-sm bg-accent text-background hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,229,192,0.3)] active:scale-95"
          >
            + Create New Task
          </button>
        )}
      </div>

      <div 
        className="flex-1 rounded-3xl border overflow-hidden flex flex-col animate-fade-up"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-syne font-bold text-text">Workspace Backlog</h3>
          <div className="flex gap-2">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface2 border border-border">
                <span className="text-xs font-bold text-muted uppercase tracking-tighter">Sort:</span>
                <span className="text-xs font-bold text-text">Latest</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="rounded-2xl border p-4 hover:border-accent/40 transition-all cursor-pointer group"
                style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }} />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{task.priority}</span>
                   </div>
                   <button onClick={(e) => handleDeleteTask(e, task.id)} className="text-muted hover:text-accent3 transition-colors">🗑️</button>
                </div>
                <p className="font-syne font-bold text-text mb-4 leading-tight group-hover:text-accent transition-colors">{task.title}</p>
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent2 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                        {assigneeNameById[task.assignee]?.[0] || 'U'}
                      </div>
                      <span className="text-xs text-muted truncate max-w-[80px]">{assigneeNameById[task.assignee] || "Unassigned"}</span>
                   </div>
                   <span className="px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-tighter text-muted" style={{ borderColor: 'var(--border)' }}>
                     {task.status.replaceAll('_', ' ')}
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <table className="hidden sm:table w-full border-separate border-spacing-y-2">
             <thead>
                <tr className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                   <th className="text-left px-4 pb-4">Task Name</th>
                   <th className="text-left px-4 pb-4">Status</th>
                   <th className="text-left px-4 pb-4">Priority</th>
                   <th className="text-left px-4 pb-4">Assignee</th>
                   <th className="text-right px-4 pb-4"></th>
                </tr>
             </thead>
             <tbody>
                {tasks.map((task, idx) => (
                   <tr 
                     key={task.id} 
                     onClick={() => setSelectedTask(task)}
                     className="group cursor-pointer hover:scale-[1.01] transition-all"
                   >
                      <td className="px-4 py-4 rounded-l-2xl border-y border-l transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                         <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }} />
                            <span className="font-syne font-bold font-medium text-text group-hover:text-accent transition-colors">{task.title}</span>
                         </div>
                      </td>
                      <td className="px-4 py-4 border-y transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                         <span className="px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-tighter text-muted group-hover:text-text transition-colors" style={{ borderColor: 'var(--border)' }}>
                           {task.status.replaceAll('_', ' ')}
                         </span>
                      </td>
                      <td className="px-4 py-4 border-y transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                         <span className="text-xs font-dm-mono text-muted capitalize">{task.priority}</span>
                      </td>
                      <td className="px-4 py-4 border-y transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent5 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                               {assigneeNameById[task.assignee]?.[0] || 'U'}
                            </div>
                            <span className="text-xs text-muted">{assigneeNameById[task.assignee] || "Unassigned"}</span>
                         </div>
                      </td>
                      <td className="px-4 py-4 rounded-r-2xl border-y border-r text-right transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                         <button 
                           onClick={(e) => handleDeleteTask(e, task.id)}
                           className="p-2 opacity-0 group-hover:opacity-100 hover:text-accent3 transition-all"
                         >
                           🗑️
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>

          {tasks.length === 0 && (
             <div className="py-20 flex flex-col items-center justify-center text-muted">
                <span className="text-6xl mb-4 opacity-10">📋</span>
                <p className="font-syne font-bold text-lg">No Results Found</p>
                <p className="text-xs">Adjust your filters or create a new task to get started.</p>
             </div>
          )}
        </div>
      </div>

      <TaskCreateModal open={openCreate} onOpenChange={setOpenCreate} onCreated={loadTasks} projects={projects} />
      <TaskModal
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdated={loadTasks}
        onDeleted={(taskId) => {
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
