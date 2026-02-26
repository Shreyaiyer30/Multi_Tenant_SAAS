import { useEffect, useState } from "react";
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

  const currentWorkspace = (user?.workspaces || []).find((ws) => ws.slug === tenant);
  const canCreate = currentWorkspace?.role === "admin" || currentWorkspace?.role === "owner";

  const assigneeNameById = members.reduce((acc, membership) => {
    const userId = membership?.user?.id;
    if (userId) {
      acc[userId] = membership.user.display_name || membership.user.email;
    }
    return acc;
  }, {});

  const loadTasks = () => {
    api
      .get("tasks/")
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
  }, [tenant]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks</CardTitle>
        {canCreate ? <Button onClick={() => setOpenCreate(true)}>Create Task</Button> : null}
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Priority</TH>
              <TH>Assignee</TH>
            </TR>
          </THead>
          <TBody>
            {tasks.map((task) => (
              <TR key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                <TD>{task.title}</TD>
                <TD>{task.status}</TD>
                <TD>{task.priority}</TD>
                <TD>{assigneeNameById[task.assignee] || "Unassigned"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
      <TaskCreateModal open={openCreate} onOpenChange={setOpenCreate} onCreated={loadTasks} projects={projects} members={members} />
      <TaskModal task={selectedTask} open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)} onUpdated={loadTasks} />
    </Card>
  );
}
