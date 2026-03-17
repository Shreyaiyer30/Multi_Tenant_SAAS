import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { Sparkles, X, Layout, Type, AlignLeft, Calendar, ShieldAlert, UserPlus, Layers } from "lucide-react";
import { cn } from "@/lib";

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

  if (!open) return null;

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
      toast.success("Flow Stream Initialized");
      setForm(initialForm);
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
       toast.error("Resource Allocation Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/80 overflow-y-auto">
      <div 
        className="w-full max-w-2xl rounded-[2.5rem] border p-10 shadow-2xl animate-fade-up relative overflow-hidden my-8"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-8 right-8 text-muted hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-10 text-center">
           <div className="w-16 h-16 bg-accent/20 border border-accent/30 rounded-3xl mx-auto flex items-center justify-center mb-6 text-accent animate-pulse">
              <Sparkles size={32} />
           </div>
           <h2 className="text-3xl font-syne font-bold text-text mb-2">Initialize Flow</h2>
           <p className="text-xs text-muted font-dm-mono uppercase tracking-[0.2em]">Deploy new operational task</p>
        </div>

        <form className="space-y-6" onSubmit={submit}>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Layout size={10} /> Target Node
                 </label>
                 <select
                    className="w-full h-12 bg-surface2 rounded-xl border border-border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text appearance-none cursor-pointer"
                    value={form.project}
                    onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
                    required
                 >
                    <option value="">Select Stream...</option>
                    {projects.map((project) => (
                       <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                    <UserPlus size={10} /> Operator
                 </label>
                 <select
                    className="w-full h-12 bg-surface2 rounded-xl border border-border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text appearance-none cursor-pointer"
                    value={form.assignee}
                    onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))}
                 >
                    <option value="">Unassigned</option>
                    {memberOptions.map((member) => (
                       <option key={member.id} value={member.id}>{member.label}</option>
                    ))}
                 </select>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                 <Type size={10} /> Flow Title
              </label>
              <input 
                 placeholder="Enter mission objective..."
                 className="w-full h-14 bg-surface2 rounded-2xl border border-border px-5 text-sm transition-all focus:border-accent focus:outline-none text-text"
                 value={form.title}
                 onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                 required
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                 <AlignLeft size={10} /> objective Data
              </label>
              <textarea 
                 rows={2}
                 placeholder="Contextual parameters for this flow..."
                 className="w-full bg-surface2 rounded-2xl border border-border px-5 py-4 text-sm transition-all focus:border-accent focus:outline-none text-text resize-none"
                 value={form.description}
                 onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
           </div>

           <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Calendar size={10} /> Deadline
                 </label>
                 <input 
                   type="date" 
                   className="w-full h-12 bg-surface2 rounded-xl border border-border px-4 text-xs transition-all focus:border-accent focus:outline-none text-text"
                   value={form.due_date} 
                   onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} 
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                    <ShieldAlert size={10} /> priority
                 </label>
                 <select 
                   className="w-full h-12 bg-surface2 rounded-xl border border-border px-4 text-xs transition-all focus:border-accent focus:outline-none text-text appearance-none"
                   value={form.priority} 
                   onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                 >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Layers size={10} /> status
                 </label>
                 <select 
                   className="w-full h-12 bg-surface2 rounded-xl border border-border px-4 text-xs transition-all focus:border-accent focus:outline-none text-text appearance-none"
                   value={form.status} 
                   onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                 >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                 </select>
              </div>
           </div>

           <div className="flex gap-4 pt-4">
              <button 
                 type="button"
                 onClick={() => onOpenChange(false)}
                 className="flex-1 h-14 bg-surface2 border border-border text-muted rounded-2xl font-syne font-bold text-sm hover:text-white transition-all"
              >
                 Abort
              </button>
              <button 
                 type="submit" 
                 disabled={loading}
                 className="flex-2 h-14 bg-accent text-background px-10 rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.05] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                 {loading ? "Initializing..." : (
                    <>
                      <span>Initialize Flow</span>
                      <Sparkles size={16} />
                    </>
                 )}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
