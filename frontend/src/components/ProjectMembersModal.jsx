import { useEffect, useMemo, useState } from "react";
import { Check, Search, UserPlus2, X, Users, Shield, User, Trash2, ArrowRight } from "lucide-react";
import api from "@/api/api";
import { toast } from "sonner";
import { cn } from "@/lib";

function initialsFor(user) {
  const display = user?.display_name || user?.email || "User";
  return display
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ProjectMembersModal({ open, onOpenChange, project, workspaceMembers = [], onUpdated }) {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [role, setRole] = useState("member");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!project?.id) return;
    api
      .get(`projects/${project.id}/members/`)
      .then((res) => setMembers(res.data || []))
      .catch(() => setMembers([]));
  };

  useEffect(() => {
    if (open) {
      load();
      setSelectedIds([]);
      setSearch("");
    }
  }, [open, project?.id]);

  const existingMemberIds = useMemo(() => new Set(members.map((m) => m.user?.id)), [members]);

  const availableUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (workspaceMembers || []).filter((m) => {
      const user = m.user || {};
      const id = user.id;
      if (!id || existingMemberIds.has(id)) return false;
      if (!q) return true;

      const display = (user.display_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return display.includes(q) || email.includes(q);
    });
  }, [workspaceMembers, existingMemberIds, search]);

  const selectedUsers = useMemo(
    () => (workspaceMembers || []).filter((m) => selectedIds.includes(m.user?.id)),
    [workspaceMembers, selectedIds]
  );

  const toggleUser = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const addMembers = async () => {
    if (!selectedIds.length) {
      toast.error("Select network entities first");
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map((userId) => api.post(`projects/${project.id}/members/`, { user_id: userId, role }))
      );
      toast.success(`Broadcasting permissions to ${selectedIds.length} entities`);
      setSelectedIds([]);
      load();
      onUpdated?.();
    } catch {
      toast.error("Permission broadcast failure");
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (targetUserId) => {
    try {
      await api.delete(`projects/${project.id}/members/${targetUserId}/`);
      toast.success("Entity disconnected");
      load();
      onUpdated?.();
    } catch {
      toast.error("Disconnection failed");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/80">
      <div 
        className="w-full max-w-5xl h-[85vh] rounded-[3rem] border shadow-2xl animate-fade-up relative overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Header Section */}
        <div className="p-8 border-b shrink-0 flex items-center justify-between bg-surface/40 backdrop-blur-xl" style={{ borderColor: 'var(--border)' }}>
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center text-accent">
                 <Users size={28} />
              </div>
              <div>
                 <h2 className="text-3xl font-syne font-black text-text tracking-tighter uppercase leading-none">Network Permission Manager</h2>
                 <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                    <Shield size={12} className="text-accent" /> Node: {project?.name || "Global"}
                 </p>
              </div>
           </div>
           <button 
             onClick={() => onOpenChange(false)}
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface2 text-muted hover:text-white transition-all border border-border hover:border-accent/40"
           >
             <X size={24} />
           </button>
        </div>

        {/* Binary Panel Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
           {/* Left: Discovery */}
           <div className="w-1/2 flex flex-col border-r bg-surface2/20" style={{ borderColor: 'var(--border)' }}>
             <div className="p-8 pb-4">
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
                   <input 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Scan network for entities..."
                      className="w-full h-14 bg-surface2 rounded-2xl border border-border pl-12 pr-6 text-sm text-text focus:border-accent focus:outline-none transition-all placeholder:text-muted/40 font-dm-mono uppercase tracking-widest"
                   />
                </div>
                <div className="flex items-center justify-between mt-6 px-2">
                   <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Available Entities</span>
                   <span className="text-[10px] font-dm-mono text-accent">{availableUsers.length} detected</span>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar space-y-3">
                {availableUsers.map((entry) => {
                   const user = entry.user || {};
                   const selected = selectedIds.includes(user.id);
                   return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={cn(
                           "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                           selected ? "bg-accent/10 border-accent/60 shadow-lg" : "bg-surface/40 border-border/50 hover:bg-surface hover:border-accent/30"
                        )}
                      >
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent2 to-accent5 flex items-center justify-center text-[10px] font-black text-white shadow-lg shrink-0">
                               {initialsFor(user)}
                            </div>
                            <div className="min-w-0 text-left">
                               <p className={cn("text-sm font-bold truncate transition-colors", selected ? "text-accent" : "text-text")}>{user.display_name || "Unknown Entity"}</p>
                               <p className="text-[10px] text-muted truncate font-dm-mono tracking-tighter">{user.email}</p>
                            </div>
                         </div>
                         <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            selected ? "bg-accent border-accent text-background" : "border-border group-hover:border-accent/40"
                         )}>
                            {selected && <Check size={14} strokeWidth={4} />}
                         </div>
                      </button>
                   );
                })}
                {availableUsers.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-muted/20 py-20">
                      <Search size={48} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Discovery results</p>
                   </div>
                )}
             </div>
           </div>

           {/* Right: Active & Action */}
           <div className="w-1/2 flex flex-col bg-surface/10">
              <div className="flex-1 flex flex-col min-h-0">
                 {/* Top: Current Selection For Add */}
                 <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Buffered for Connection</h3>
                       <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest">
                          {selectedIds.length} Nodes Ready
                       </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                       {selectedUsers.map(entry => (
                          <div key={entry.user?.id} className="flex items-center gap-3 bg-surface2 border border-border pr-2 pl-1 py-1 rounded-xl animate-fade-up">
                             <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center text-[8px] font-black text-muted">
                                {initialsFor(entry.user)}
                             </div>
                             <span className="text-[10px] font-bold text-text truncate max-w-[100px]">{entry.user.display_name}</span>
                             <button 
                               onClick={() => toggleUser(entry.user?.id)}
                               className="text-muted hover:text-accent3 transition-colors"
                             >
                                <X size={12} />
                             </button>
                          </div>
                       ))}
                       {selectedUsers.length === 0 && (
                          <div className="w-full h-12 border-2 border-dashed border-border/50 rounded-2xl flex items-center justify-center text-muted/30 text-[10px] font-black uppercase tracking-widest">
                             Awaiting Entity Selection
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Middle: Existing Members */}
                 <div className="flex-1 flex flex-col min-h-0 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="px-8 py-6 flex items-center justify-between bg-surface2/20">
                       <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Active Operational Team</span>
                       <span className="text-[10px] font-dm-mono text-accent">{members.length} Connected</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar space-y-3">
                       {members.map(m => (
                          <div key={m.id} className="group flex items-center justify-between p-4 rounded-2xl bg-surface2/30 border border-border/40 hover:border-accent/20 transition-all">
                             <div className="flex items-center gap-4 min-w-0">
                                <User size={16} className="text-muted group-hover:text-accent transition-colors" />
                                <div className="min-w-0">
                                   <p className="text-sm font-bold text-text truncate">{m.user.display_name || m.user.email}</p>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em]">{m.role}</span>
                                      <span className="w-1 h-1 rounded-full bg-border" />
                                      <span className="text-[8px] font-dm-mono text-muted tracking-tighter lowercase">{m.user.email}</span>
                                   </div>
                                </div>
                             </div>
                             <button 
                                onClick={() => removeMember(m.user.id)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent3/10 text-accent3 opacity-0 group-hover:opacity-100 transition-all hover:bg-accent3 hover:text-background"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Action Bar */}
              <div className="p-8 border-t bg-surface2/40" style={{ borderColor: 'var(--border)' }}>
                 <div className="flex items-center gap-6">
                    <div className="flex-1 flex flex-col gap-2">
                       <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Operational Proxy</label>
                       <div className="flex rounded-xl border border-border p-1 bg-surface2">
                          <button 
                            onClick={() => setRole('member')}
                            className={cn(
                               "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                               role === 'member' ? "bg-accent text-background shadow-lg" : "text-muted hover:text-text"
                            )}
                          > Member
                          </button>
                          <button 
                            onClick={() => setRole('admin')}
                            className={cn(
                               "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                               role === 'admin' ? "bg-accent text-background shadow-lg" : "text-muted hover:text-text"
                            )}
                          > Admin
                          </button>
                       </div>
                    </div>
                    <div className="flex-2 pt-5">
                       <button 
                         onClick={addMembers}
                         disabled={submitting || !selectedIds.length}
                         className="w-full h-14 bg-accent text-background rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.05] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-30 disabled:scale-100"
                       >
                          <span>Connect Nodes</span>
                          <ArrowRight size={18} />
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
