import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const progressByStatus = {
  todo: 0,
  in_progress: 0,
  in_review: 0,
  done: 100
};

export default function TaskModal({ task, open, onOpenChange, onUpdated }) {
  const [form, setForm] = useState(task || {});
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setForm(task || {});
    if (task?.id) {
      api
        .get(`tasks/${task.id}/comments/`)
        .then((res) => setComments(res.data.results || res.data || []))
        .catch(() => setComments([]));
      api
        .get(`tasks/${task.id}/activity/`)
        .then((res) => setActivity(res.data.results || res.data || []))
        .catch(() => setActivity([]));

      if (task?.project) {
        api.get(`projects/${task.project}/members/`).then(res => setMembers(res.data)).catch(() => setMembers([]));
      }
    }
  }, [task]);

  const saveTask = async () => {
    try {
      const payload = {
        ...form,
        progress_percent: progressByStatus[form.status] ?? 0
      };
      const { data } = await api.patch(`tasks/${task.id}/`, payload);
      setForm(data || payload);
      toast.success("Task updated");
      onUpdated?.();
    } catch {
      toast.error("Unable to save task");
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`tasks/${task.id}/comments/`, { body: comment });
      setComments((prev) => [...prev, data]);
      setComment("");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>Review task details and collaborate with comments.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-3">
            <Input value={form.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" />
            <Input value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.priority || "medium"}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.status || "todo"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value,
                      progress_percent: progressByStatus[e.target.value] ?? 0
                    }))
                  }
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.assignee || ""}
                onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value || null }))}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.display_name} ({m.user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Progress (%) - Managed by status</label>
              <Input type="number" value={progressByStatus[form.status] ?? form.progress_percent ?? 0} disabled className="bg-muted" />
            </div>
            <Button onClick={saveTask}>Save Changes</Button>
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 pt-3">
            <div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
              {comments.length ? comments.map((c) => <p key={c.id} className="text-sm">{c.body}</p>) : <p className="text-sm text-muted-foreground">No comments yet.</p>}
            </div>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" />
            <Button onClick={postComment}>Post Comment</Button>
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 pt-3">
            <div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
              {activity.length ? (
                activity.map((row) => (
                  <div key={row.id} className="rounded-md border p-2">
                    <p className="text-sm font-medium">{row.event_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
