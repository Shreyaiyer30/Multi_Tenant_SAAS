import { useEffect, useMemo, useRef, useState } from "react";
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

const MENTION_PATTERN = /@(\w+)/g;

function normalizeMentionHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function usernameFromUser(user) {
  const email = String(user?.email || "");
  const local = email.split("@")[0] || "";
  return normalizeMentionHandle(local) || normalizeMentionHandle(user?.display_name) || "member";
}

function extractMentionContext(value, cursor) {
  const atIndex = value.lastIndexOf("@", cursor - 1);
  if (atIndex < 0) return null;
  const prefix = value.slice(0, atIndex);
  if (prefix && !/\s$/.test(prefix)) return null;
  const query = value.slice(atIndex + 1, cursor);
  if (!/^\w*$/.test(query)) return null;
  return { start: atIndex, end: cursor, query };
}

function renderCommentWithMentions(body) {
  const parts = String(body || "").split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (/^@\w+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="font-semibold text-sky-400">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function TaskModal({ task, open, onOpenChange, onUpdated, onDeleted }) {
  const [form, setForm] = useState(task || {});
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [comment, setComment] = useState("");
  const [mentionContext, setMentionContext] = useState(null);
  const [trackedMentionIds, setTrackedMentionIds] = useState([]);
  const commentInputRef = useRef(null);

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
      api
        .get("members/")
        .then((res) => setWorkspaceMembers(res.data.results || res.data || []))
        .catch(() => setWorkspaceMembers([]));
    }
  }, [task]);

  const mentionableMembers = useMemo(() => {
    return workspaceMembers
      .map((membership) => {
        const user = membership?.user || {};
        const displayName = user.display_name || user.email || "Member";
        const email = user.email || "";
        const username = usernameFromUser(user);
        return {
          id: String(user.id),
          displayName,
          email,
          username,
          search: `${displayName} ${email} ${username}`.toLowerCase()
        };
      })
      .filter((member) => member.id);
  }, [workspaceMembers]);

  const mentionOptions = useMemo(() => {
    if (!mentionContext) return [];
    const query = normalizeMentionHandle(mentionContext.query);
    return mentionableMembers
      .filter((member) => !query || member.search.includes(query))
      .slice(0, 6);
  }, [mentionContext, mentionableMembers]);

  const extractMentionIds = (text) => {
    MENTION_PATTERN.lastIndex = 0;
    const handleToMember = mentionableMembers.reduce((acc, member) => {
      if (!acc[member.username]) acc[member.username] = member;
      return acc;
    }, {});
    const seen = new Set();
    const ids = [];
    const matches = String(text || "").matchAll(MENTION_PATTERN);
    for (const match of matches) {
      const handle = normalizeMentionHandle(match[1]);
      const member = handleToMember[handle];
      if (!member || seen.has(member.id)) continue;
      seen.add(member.id);
      ids.push(member.id);
    }
    return ids;
  };

  const insertMention = (member) => {
    if (!mentionContext) return;
    const mentionToken = `@${member.username} `;
    const updated = `${comment.slice(0, mentionContext.start)}${mentionToken}${comment.slice(mentionContext.end)}`;
    const cursorPosition = mentionContext.start + mentionToken.length;
    setComment(updated);
    setTrackedMentionIds(extractMentionIds(updated));
    setMentionContext(null);
    requestAnimationFrame(() => {
      if (!commentInputRef.current) return;
      commentInputRef.current.focus();
      commentInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

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
      setTrackedMentionIds([]);
      setMentionContext(null);
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const deleteTask = async () => {
    if (!task?.id) return;
    if (!window.confirm("Delete this task? This action cannot be undone.")) return;
    try {
      await api.delete(`tasks/${task.id}/`);
      toast.success("Task deleted");
      onDeleted?.(task.id);
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete task");
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
            <div className="flex gap-2">
              <Button onClick={saveTask}>Save Changes</Button>
              <Button variant="destructive" onClick={deleteTask}>Delete Task</Button>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 pt-3">
            <div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
              {comments.length ? comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border/70 p-2">
                  <div className="mb-1 flex items-center gap-2">
                    <button type="button" className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
                      {c?.author?.display_name || "Member"}
                    </button>
                  </div>
                  <p className="text-sm">{renderCommentWithMentions(c.body)}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No comments yet.</p>}
            </div>
            <div className="relative">
              {mentionContext ? (
                <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-48 overflow-auto rounded-md border border-border/80 bg-card p-1 shadow-xl">
                  {mentionOptions.length ? (
                    mentionOptions.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertMention(member);
                        }}
                      >
                        <span className="font-medium">{member.displayName}</span>
                        <span className="text-xs text-muted-foreground">@{member.username}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No workspace member found.</p>
                  )}
                </div>
              ) : null}
              <textarea
                ref={commentInputRef}
                value={comment}
                onChange={(event) => {
                  const next = event.target.value;
                  setComment(next);
                  setTrackedMentionIds(extractMentionIds(next));
                  setMentionContext(extractMentionContext(next, event.target.selectionStart ?? next.length));
                }}
                onKeyDown={(event) => {
                  if (mentionContext && mentionOptions.length && (event.key === "Enter" || event.key === "Tab")) {
                    event.preventDefault();
                    insertMention(mentionOptions[0]);
                  }
                  if (event.key === "Escape") {
                    setMentionContext(null);
                  }
                }}
                onClick={(event) => {
                  const next = event.currentTarget.value;
                  setMentionContext(extractMentionContext(next, event.currentTarget.selectionStart ?? next.length));
                }}
                onBlur={() => setTimeout(() => setMentionContext(null), 120)}
                rows={3}
                placeholder="Add a comment and type @ to mention workspace members"
                className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm outline-none transition-all duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              />
            </div>
            {trackedMentionIds.length ? (
              <p className="text-xs text-muted-foreground">
                Mentioning {trackedMentionIds.length} member{trackedMentionIds.length > 1 ? "s" : ""}.
              </p>
            ) : null}
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
