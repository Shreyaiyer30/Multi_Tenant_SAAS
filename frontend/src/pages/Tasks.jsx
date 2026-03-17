import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api/api";
import TaskModal from "@/components/TaskModal";
import TaskCreateModal from "@/components/TaskCreateModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
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

  const handleDeleteTask = async (taskId) => {
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

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Tasks</CardTitle>
        {canCreate ? <Button className="h-11 w-full sm:w-auto" onClick={() => setOpenCreate(true)}>Create Task</Button> : null}
      </CardHeader>
      <CardContent>
        <div className="sm:hidden space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="w-full rounded-xl border border-border/70 bg-card-elevated/45 p-3 text-left">
              <button className="w-full text-left" onClick={() => setSelectedTask(task)}>
                <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Status: <span className="text-foreground">{task.status}</span></p>
                  <p>Priority: <span className="text-foreground">{task.priority}</span></p>
                  <p className="col-span-2 truncate">Assignee: <span className="text-foreground">{assigneeNameById[task.assignee] || "Unassigned"}</span></p>
                </div>
              </button>
              <div className="mt-3">
                <Button variant="destructive" size="sm" className="h-9 w-full" onClick={() => handleDeleteTask(task.id)}>
                  Delete Task
                </Button>
              </div>
            </div>
          ))}
          {!tasks.length ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Status</TH>
                <TH>Priority</TH>
                <TH>Assignee</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {tasks.map((task) => (
                <TR key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <TD className="min-w-[220px]">{task.title}</TD>
                  <TD>{task.status}</TD>
                  <TD>{task.priority}</TD>
                  <TD>{assigneeNameById[task.assignee] || "Unassigned"}</TD>
                  <TD>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>
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
    </Card>
  );
}
