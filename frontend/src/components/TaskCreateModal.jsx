import { useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialForm = {
  project: "",
  title: "",
  description: "",
  due_date: "",
  priority: "medium",
  status: "todo",
  assignee: ""
};

export default function TaskCreateModal({ open, onOpenChange, projects = [], onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  useEffect(() => {
    if (form.project) {
      api.get(`projects/${form.project}/members/`)
        .then(res => setProjectMembers(res.data))
        .catch(() => setProjectMembers([]));
    } else {
      setProjectMembers([]);
    }
  }, [form.project]);

  const memberOptions = useMemo(
    () => projectMembers.map((m) => ({ id: m.user?.id, label: m.user?.display_name || m.user?.email || "Member" })).filter((m) => Boolean(m.id)),
    [projectMembers]
  );

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        project: form.project || null,
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        assignee: form.assignee || null
      };
      await api.post("tasks/", payload);
      toast.success("Task created");
      setForm(initialForm);
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        const first = Object.values(detail)?.[0];
        const msg = Array.isArray(first) ? first[0] : String(first);
        toast.error(msg || "Failed to create task");
      } else {
        toast.error("Failed to create task");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Create a task in the selected workspace and assign it to a member.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Project</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.project}
              onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
              required
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />

          <Input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Due date</span>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Priority</span>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Assignee</span>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.assignee} onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))}>
                <option value="">Unassigned</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
