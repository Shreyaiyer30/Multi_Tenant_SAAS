import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { 
  X, 
  MessageSquare, 
  Activity, 
  Info, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Hash,
  Send,
  User,
  ExternalLink
} from "lucide-react";

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
        <span key={`${part}-${index}`} className="font-bold text-accent">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

const getPriorityColor = (p) => {
  if (p === 'urgent') return 'var(--accent3)';
  if (p === 'high') return 'var(--accent2)';
  if (p === 'medium') return 'var(--accent4)';
  return 'var(--accent)';
};

export default function TaskModal({ task, open, onOpenChange, onUpdated, onDeleted }) {
  const [form, setForm] = useState(task || {});
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [comment, setComment] = useState("");
  const [mentionContext, setMentionContext] = useState(null);
  const [trackedMentionIds, setTrackedMentionIds] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
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
      toast.success("Stream Sync Complete");
      onUpdated?.();
    } catch {
      toast.error("Resource Write Failure");
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
      toast.error("Transmission Error");
    }
  };

  const deleteTask = async () => {
    if (!task?.id) return;
    if (!window.confirm("Terminate this task stream permanently?")) return;
    try {
      await api.delete(`tasks/${task.id}/`);
      toast.success("Task Terminated");
      onDeleted?.(task.id);
      onOpenChange(false);
    } catch {
      toast.error("Decommissioning Failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/80">
      <div 
        className="w-full max-w-4xl h-[85vh] rounded-[2.5rem] border shadow-2xl animate-fade-up relative overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="p-8 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-surface2 border border-border flex items-center justify-center text-accent">
                <Hash size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-syne font-bold text-text tracking-tight uppercase leading-none">Flow Analyzer</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Flow Id /</span>
                   <span className="text-[10px] font-dm-mono text-accent font-bold">TASK-{task.id}</span>
                </div>
             </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface2 text-muted hover:text-white transition-all border border-border"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Tabs Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r p-6 flex flex-col gap-2" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(18, 29, 46, 0.3)' }}>
             {[
               { id: 'details', label: 'Configuration', icon: Info },
               { id: 'comments', label: 'Discussions', icon: MessageSquare, badge: comments.length },
               { id: 'activity', label: 'Event Log', icon: Activity, badge: activity.length },
             ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all border group",
                    activeTab === tab.id 
                      ? "bg-accent/10 border-accent/40 text-accent shadow-[0_4px_20px_rgba(0,229,192,0.1)]" 
                      : "bg-transparent border-transparent text-muted hover:bg-surface2 hover:text-text"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{tab.label}</span>
                  </div>
                  {tab.badge > 0 && (
                    <span className="text-[9px] font-black bg-surface px-1.5 py-0.5 rounded border border-border group-hover:border-accent/40 transition-colors">
                      {tab.badge}
                    </span>
                  )}
                </button>
             ))}
             
             <div className="mt-auto pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                <button 
                  onClick={deleteTask}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent3/10 text-accent3 border border-accent3/20 hover:bg-accent3 hover:text-background transition-all"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Terminate Flow</span>
                </button>
             </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
             {activeTab === 'details' && (
                <div className="space-y-8 animate-fade-up">
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Stream Identifier</label>
                         <input 
                            className="w-full h-14 bg-surface2 rounded-2xl border border-border px-5 text-lg font-syne font-bold text-text focus:border-accent focus:outline-none transition-all"
                            value={form.title || ""} 
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Objective Data</label>
                         <textarea 
                            rows={3}
                            className="w-full bg-surface2 rounded-2xl border border-border px-5 py-4 text-sm font-medium text-text focus:border-accent focus:outline-none transition-all resize-none"
                            value={form.description || ""} 
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                            placeholder="Add mission-critical details..."
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 pt-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Priority Scale</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['low', 'medium', 'high', 'urgent'].map(p => (
                               <button 
                                 key={p}
                                 onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                                 className={cn(
                                   "h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                   form.priority === p 
                                    ? "bg-accent text-background shadow-lg" 
                                    : "bg-surface2 border-border text-muted hover:border-accent/40"
                                 )}
                                 style={{ 
                                   backgroundColor: form.priority === p ? getPriorityColor(p) : undefined,
                                   boxShadow: form.priority === p ? `0 4px 15px ${getPriorityColor(p)}30` : undefined
                                 }}
                               >
                                 {p}
                               </button>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Operational Status</label>
                         <select
                            className="w-full h-10 bg-surface2 rounded-xl border border-border px-4 text-[10px] font-black uppercase tracking-widest text-text focus:border-accent focus:outline-none appearance-none cursor-pointer"
                            value={form.status || "todo"}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                status: e.target.value,
                                progress_percent: progressByStatus[e.target.value] ?? 0
                              }))
                            }
                         >
                            <option value="todo">Pending Arrival</option>
                            <option value="in_progress">Active Streaming</option>
                            <option value="in_review">Verification Phase</option>
                            <option value="done">Completed Flow</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2 pt-4">
                      <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Operator Assigned</label>
                      <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={() => setForm(p => ({ ...p, assignee: null }))}
                            className={cn(
                               "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                               !form.assignee ? "bg-accent/10 border-accent text-accent" : "bg-surface2 border-border text-muted"
                            )}
                         >
                            <User size={12} />
                            Unassigned
                         </button>
                         {members.map(m => (
                            <button 
                               key={m.user.id}
                               onClick={() => setForm(p => ({ ...p, assignee: m.user.id }))}
                               className={cn(
                                  "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                  form.assignee === m.user.id ? "bg-accent/10 border-accent text-accent" : "bg-surface2 border-border text-muted hover:border-accent/30"
                               )}
                            >
                               <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent2 to-accent5 flex items-center justify-center text-[8px] text-white">
                                  {m.user.display_name?.[0]}
                               </div>
                               {m.user.display_name}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="pt-8 flex gap-4">
                      <button 
                        onClick={saveTask}
                        className="flex-1 h-14 bg-accent text-background rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
                      >
                         <ExternalLink size={18} />
                         Synchronize State
                      </button>
                   </div>
                </div>
             )}

             {activeTab === 'comments' && (
                <div className="h-full flex flex-col animate-fade-up">
                   <div className="flex-1 space-y-6 mb-8 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
                      {comments.length ? comments.map((c, i) => (
                        <div key={c.id} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent2 to-accent5 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-lg">
                              {c?.author?.display_name?.[0] || 'A'}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1.5">
                                 <span className="font-syne font-bold text-text text-sm transition-colors group-hover:text-accent">{c?.author?.display_name || "Agent"}</span>
                                 <div className="flex items-center gap-1 opacity-30">
                                    <Clock size={10} className="text-muted" />
                                    <span className="text-[9px] font-black text-muted uppercase tracking-widest">Just Now</span>
                                 </div>
                              </div>
                              <div className="bg-surface2/50 border border-border p-4 rounded-2xl rounded-tl-none text-sm text-text leading-relaxed">
                                 {renderCommentWithMentions(c.body)}
                              </div>
                           </div>
                        </div>
                      )) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted opacity-30">
                           <MessageSquare size={48} className="mb-4" />
                           <p className="text-sm font-syne font-bold tracking-widest uppercase">No Active Discussions</p>
                        </div>
                      )}
                   </div>

                   <div className="relative pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                      {mentionContext && (
                        <div className="absolute bottom-full left-0 right-0 z-50 mb-4 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-fade-up">
                           <div className="px-4 py-2 border-b border-border bg-surface2 text-[9px] font-black text-muted uppercase tracking-widest">Available Nodes</div>
                           {mentionOptions.map(member => (
                              <button
                                key={member.id}
                                onMouseDown={e => { e.preventDefault(); insertMention(member); }}
                                className="w-full flex items-center justify-between p-3 hover:bg-accent/10 hover:text-accent transition-all text-xs font-bold text-muted group"
                              >
                                 <span>{member.displayName}</span>
                                 <span className="text-[10px] opacity-40 group-hover:opacity-100 font-dm-mono">@{member.username}</span>
                              </button>
                           ))}
                        </div>
                      )}
                      
                      <div className="relative">
                         <textarea
                            ref={commentInputRef}
                            value={comment}
                            onChange={(e) => {
                              const next = e.target.value;
                              setComment(next);
                              setTrackedMentionIds(extractMentionIds(next));
                              setMentionContext(extractMentionContext(next, e.target.selectionStart ?? next.length));
                            }}
                            rows={3}
                            placeholder="Type @ to broadcast to workspace entities..."
                            className="w-full bg-surface2 rounded-[2rem] border border-border px-8 py-6 text-sm text-text focus:border-accent focus:outline-none transition-all resize-none shadow-inner"
                         />
                         <button 
                           onClick={postComment}
                           disabled={!comment.trim()}
                           className="absolute right-4 bottom-4 w-12 h-12 rounded-2xl bg-accent text-background flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg disabled:opacity-50 disabled:scale-100"
                         >
                            <Send size={20} />
                         </button>
                      </div>
                      {trackedMentionIds.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 px-4">
                           <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                           <span className="text-[9px] font-black text-accent uppercase tracking-widest">
                             {trackedMentionIds.length} Entity Tagged for Broadcast
                           </span>
                        </div>
                      )}
                   </div>
                </div>
             )}

             {activeTab === 'activity' && (
                <div className="space-y-4 animate-fade-up">
                   {activity.length ? (
                      activity.map((row, i) => (
                        <div key={row.id} className="group relative flex items-start gap-5 p-5 rounded-2xl bg-surface2/50 border border-border/50 hover:border-accent/40 transition-all hover:translate-x-1" style={{ animationDelay: `${i * 0.05}s` }}>
                           <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted group-hover:text-accent transition-colors">
                              <Clock size={18} />
                           </div>
                           <div className="min-w-0">
                              <p className="text-sm font-bold text-text uppercase tracking-tight">{row.event_type.replaceAll('_', ' ')}</p>
                              <div className="flex items-center gap-3 mt-1.5 opacity-40">
                                 <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">{new Date(row.created_at).toLocaleDateString()}</span>
                                 <span className="w-1 h-1 rounded-full bg-border" />
                                 <span className="text-[9px] font-dm-mono text-muted">{new Date(row.created_at).toLocaleTimeString()}</span>
                              </div>
                           </div>
                           <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-30 transition-opacity">
                              <AlertCircle size={14} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Log Entry</span>
                           </div>
                        </div>
                      ))
                   ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-muted opacity-30">
                        <Activity size={48} className="mb-4" />
                        <p className="text-sm font-syne font-bold tracking-widest uppercase">Null Activity Stream</p>
                      </div>
                   )}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
