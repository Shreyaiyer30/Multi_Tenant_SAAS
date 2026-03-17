import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import { useTenant } from "@/context/TenantContext";

export default function Members() {
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const { tenant } = useTenant();

    const loadMembers = () => {
        if (!tenant) {
            setMembers([]);
            setError("Select a workspace to view members.");
            setLoading(false);
            return;
        }

        setLoading(true);
        api
            .get("members/")
            .then((res) => {
                setMembers(res.data);
                setError("");
            })
            .catch((err) => {
                setError(err?.response?.status === 403 ? "Only workspace admin or owner can manage members." : "Unable to load members.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadMembers();
    }, [tenant]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        try {
            await api.post("members/", { email: inviteEmail, role: inviteRole });
            toast.success("Member invited successfully");
            setShowInviteModal(false);
            setInviteEmail("");
            loadMembers();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to invite member");
        }
    };

    const removeMember = async (membershipId) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`members/${membershipId}/`);
            toast.success("Member removed");
            loadMembers();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to remove member");
        }
    };

    return (
        <div className="p-6 space-y-8 page-enter h-full flex flex-col">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div>
                  <h1 className="text-text font-syne font-bold text-3xl tracking-tight">Members</h1>
                  <p className="text-muted mt-1 text-xs font-medium uppercase tracking-[0.2em]">Team / Organization / Members</p>
                </div>
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-accent text-background h-11 rounded-xl px-6 font-syne font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,229,192,0.3)]"
                >
                    + Add New Member
                </button>
            </div>

            <div 
                className="flex-1 rounded-3xl border overflow-hidden flex flex-col animate-fade-up"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="flex items-center justify-between border-b p-6" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-text font-syne font-bold">Active Organization</h3>
                  <span className="bg-surface2 text-muted rounded border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {members.length} Total
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted">
                           <span className="mb-2 text-4xl opacity-20">⚠️</span>
                           <p className="text-accent3 text-sm font-bold">{error}</p>
                        </div>
                    ) : loading ? (
                        <div className="space-y-4">
                           {[1,2,3].map(i => <div key={i} className="bg-surface2 h-16 w-full animate-pulse rounded-2xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Mobile View */}
                            <div className="space-y-4 sm:hidden">
                                {members.map((m) => (
                                    <div 
                                      key={m.id} 
                                      className="group rounded-2xl border p-4"
                                      style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
                                    >
                                        <div className="mb-4 flex items-center gap-4">
                                           <div className="bg-accent5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white">
                                             {m.user.display_name?.[0] || 'U'}
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-text font-syne font-bold truncate">{m.user.display_name}</p>
                                              <p className="text-muted text-xs truncate">{m.user.email}</p>
                                           </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                                            <span className="text-muted rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-tighter" style={{ borderColor: 'var(--border)' }}>{m.role}</span>
                                            <button onClick={() => removeMember(m.id)} className="text-muted transition-colors hover:text-accent3 p-2">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View */}
                            <table className="hidden w-full border-separate border-spacing-y-2 sm:table">
                                <thead>
                                    <tr className="text-muted text-[10px] font-bold uppercase tracking-[0.2em]">
                                        <th className="px-4 pb-4 text-left">Member</th>
                                        <th className="px-4 pb-4 text-left">Email Address</th>
                                        <th className="px-4 pb-4 text-left">Access Level</th>
                                        <th className="px-4 pb-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((m) => (
                                        <tr key={m.id} className="group transition-all hover:scale-[1.01]">
                                            <td className="rounded-l-2xl border-y border-l px-4 py-4 transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                                                <div className="flex items-center gap-3">
                                                   <div className="bg-gradient-to-br from-accent2 to-accent5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                                                     {m.user.display_name?.[0] || 'U'}
                                                   </div>
                                                   <span className="text-text font-syne font-bold transition-colors group-hover:text-accent">{m.user.display_name}</span>
                                                </div>
                                            </td>
                                            <td className="border-y px-4 py-4 transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                                                <span className="text-muted font-dm-mono text-xs">{m.user.email}</span>
                                            </td>
                                            <td className="border-y px-4 py-4 transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                                                <span className="text-muted rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all group-hover:text-text" style={{ borderColor: 'var(--border)' }}>{m.role}</span>
                                            </td>
                                            <td className="rounded-r-2xl border-y border-r px-4 py-4 text-right transition-all group-hover:border-accent/30" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
                                                <button onClick={() => removeMember(m.id)} className="text-muted opacity-0 transition-all group-hover:opacity-100 hover:text-accent3 p-2">
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal Overlay */}
            {showInviteModal && (
               <div className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                  <div className="animate-fade-up w-full max-w-md rounded-3xl border p-8 shadow-2xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                     <h2 className="text-text font-syne font-bold mb-2 text-2xl">Invite Member</h2>
                     <p className="text-muted mb-8 text-xs">Add a new collaborator to <span className="text-accent">{tenant}</span></p>
                     
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-muted pl-1 text-[10px] font-bold uppercase tracking-widest">Email Address</label>
                           <input 
                              autoFocus
                              placeholder="colleague@company.com"
                              className="bg-surface2 text-text w-full h-12 rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none"
                              style={{ borderColor: 'var(--border)' }}
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-muted pl-1 text-[10px] font-bold uppercase tracking-widest">Access Role</label>
                           <select 
                              className="bg-surface2 text-text w-full h-12 appearance-none rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none"
                              style={{ borderColor: 'var(--border)' }}
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                           >
                              <option value="member">Workspace Member</option>
                              <option value="admin">Administrator</option>
                           </select>
                        </div>
                     </div>

                     <div className="mt-10 flex gap-4">
                        <button 
                           onClick={() => setShowInviteModal(false)}
                           className="border-border text-muted flex-1 h-12 rounded-xl border font-syne font-bold text-sm transition-all hover:text-white"
                        >
                           Cancel
                        </button>
                        <button 
                           onClick={handleInvite}
                           className="bg-accent text-background flex-1 h-12 rounded-xl font-syne font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                           Send Invite
                        </button>
                     </div>
                  </div>
               </div>
            )}
        </div>
    );
}
