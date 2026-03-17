import { useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { Sparkles, X } from "lucide-react";

export default function ProjectModal({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("projects/", form);
      toast.success("Project Stream Initialized");
      setForm({ name: "", description: "" });
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Resource allocation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/80">
      <div 
        className="w-full max-w-lg rounded-[2.5rem] border p-10 shadow-2xl animate-fade-up relative overflow-hidden"
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
           <h2 className="text-3xl font-syne font-bold text-text mb-2">New Project</h2>
           <p className="text-xs text-muted font-dm-mono uppercase tracking-[0.2em]">Initialize workspace repository</p>
        </div>

        <form className="space-y-6" onSubmit={submit}>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Project Identifier</label>
              <input 
                 autoFocus
                 placeholder="Enter project name..."
                 className="w-full h-14 bg-surface2 rounded-2xl border border-border px-5 text-sm transition-all focus:border-accent focus:outline-none text-text"
                 value={form.name}
                 onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                 required
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Brief Description</label>
              <textarea 
                 rows={3}
                 placeholder="What is this stream about?"
                 className="w-full bg-surface2 rounded-2xl border border-border px-5 py-4 text-sm transition-all focus:border-accent focus:outline-none text-text resize-none"
                 value={form.description}
                 onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
           </div>

           <div className="flex gap-4 pt-4">
              <button 
                 type="button"
                 onClick={() => onOpenChange(false)}
                 className="flex-1 h-14 bg-surface2 border border-border text-muted rounded-2xl font-syne font-bold text-sm hover:text-white transition-all"
              >
                 Cancel
              </button>
              <button 
                 type="submit" 
                 disabled={loading}
                 className="flex-3 h-14 bg-accent text-background px-10 rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                 {loading ? "Allocating..." : "Create Project"}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
