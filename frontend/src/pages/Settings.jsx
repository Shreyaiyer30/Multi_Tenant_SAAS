import { useState } from "react";
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Zap, 
  Database, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  Trash2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    displayName: user?.display_name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifications: {
      email: true,
      browser: true,
      slack: false,
      mobile: true
    },
    privacy: "public"
  });

  const [showPass, setShowPass] = useState(false);

  const handleSave = () => {
    toast.success("Terminal Configuration Synchronized");
  };

  const tabs = [
    { id: "profile", label: "Identity", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Streams", icon: Bell },
    { id: "integration", label: "Integrations", icon: Zap },
    { id: "system", label: "Core System", icon: Database },
  ];

  return (
    <div className="p-8 space-y-8 page-enter h-full flex flex-col xl:flex-row gap-8">
       {/* Left: Sidebar Tabs */}
       <div className="w-full xl:w-72 space-y-2 shrink-0">
          <div className="mb-8 px-4">
             <div className="w-14 h-14 bg-accent/20 border border-accent/40 rounded-3xl flex items-center justify-center text-accent mb-6 shadow-2xl animate-pulse">
                <Globe size={28} />
             </div>
             <h1 className="text-3xl font-syne font-black text-text tracking-tighter uppercase leading-none italic">
                Settings
             </h1>
             <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-2">Global System Parameters</p>
          </div>

          {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border group",
                 activeTab === tab.id 
                  ? "bg-accent/10 border-accent/40 text-accent shadow-lg" 
                  : "bg-surface/30 border-transparent text-muted hover:bg-surface2 hover:text-text"
               )}
             >
                <div className="flex items-center gap-4">
                   <tab.icon size={18} />
                   <span className="text-xs font-black uppercase tracking-[0.2em]">{tab.label}</span>
                </div>
                {activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
             </button>
          ))}

          <div className="pt-8 mt-8 border-t" style={{ borderColor: 'var(--border)' }}>
             <button className="w-full h-14 bg-accent3/10 text-accent3 border border-accent3/20 rounded-2xl font-syne font-bold text-xs tracking-[0.3em] uppercase hover:bg-accent3 hover:text-background transition-all flex items-center justify-center gap-3">
                <Trash2 size={18} />
                Delete Node
             </button>
          </div>
       </div>

       {/* Right: Active Tab Content */}
       <div className="flex-1 min-w-0">
          <div className="surface-glass rounded-[3rem] p-10 shadow-2xl h-full border border-border relative overflow-hidden group">
             <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
             
             <div className="max-w-2xl mx-auto space-y-10 animate-fade-up">
                {activeTab === 'profile' && (
                   <div className="space-y-8">
                      <div className="flex items-center gap-8 pb-8 border-b border-border/50">
                         <div className="relative">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-accent2 to-accent5 p-1">
                               <div className="w-full h-full rounded-[2.3rem] bg-background flex items-center justify-center font-syne font-black text-4xl text-text">
                                  {user?.display_name?.[0] || 'A'}
                               </div>
                            </div>
                            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent text-background rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all">
                               <Sparkles size={18} />
                            </button>
                         </div>
                         <div>
                            <h2 className="text-2xl font-syne font-bold text-text tracking-tight uppercase leading-none">Avatar Update</h2>
                            <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-2">Initialize Profile Identification</p>
                            <div className="flex gap-2 mt-4">
                               <button className="px-4 py-2 rounded-xl bg-surface2 border border-border text-[10px] font-black text-muted uppercase tracking-widest hover:text-text hover:border-accent/40 transition-all">Edit Asset</button>
                               <button className="px-4 py-2 rounded-xl bg-surface2 border border-border text-[10px] font-black text-muted uppercase tracking-widest hover:text-accent3 hover:border-accent3/40 transition-all">Deallocate</button>
                            </div>
                         </div>
                      </div>

                      <div className="grid gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Visual Identifier</label>
                            <input 
                               value={form.displayName}
                               onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
                               className="w-full h-14 bg-surface2/50 rounded-2xl border border-border px-6 text-sm font-bold text-text focus:border-accent focus:outline-none transition-all shadow-inner"
                               placeholder="Display Name"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Network Email</label>
                            <input 
                               value={form.email}
                               onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                               className="w-full h-14 bg-surface2/50 rounded-2xl border border-border px-6 text-sm font-bold text-text focus:border-accent focus:outline-none transition-all shadow-inner"
                               placeholder="email@flowdesk.ai"
                            />
                         </div>
                      </div>
                   </div>
                )}

                {activeTab === 'security' && (
                   <div className="space-y-8">
                      <div className="grid gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Current Encryption Key</label>
                            <div className="relative">
                               <input 
                                  type={showPass ? "text" : "password"}
                                  value={form.currentPassword}
                                  onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
                                  className="w-full h-14 bg-surface2/50 rounded-2xl border border-border px-6 pr-14 text-sm font-bold text-text focus:border-accent focus:outline-none transition-all"
                                  placeholder="••••••••"
                               />
                               <button 
                                 onClick={() => setShowPass(!showPass)}
                                 className="absolute right-5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-all"
                               >
                                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-6 pt-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">New Signature</label>
                               <input 
                                  type="password"
                                  className="w-full h-14 bg-surface2/50 rounded-2xl border border-border px-6 text-sm font-bold text-text focus:border-accent focus:outline-none transition-all"
                                  placeholder="New Password"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] pl-1 opacity-50">Confirm Signature</label>
                               <input 
                                  type="password"
                                  className="w-full h-14 bg-surface2/50 rounded-2xl border border-border px-6 text-sm font-bold text-text focus:border-accent focus:outline-none transition-all"
                                  placeholder="Confirm Password"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-accent5/5 border border-accent5/20 flex items-center gap-5">
                         <div className="w-12 h-12 rounded-2xl bg-accent5/10 flex items-center justify-center text-accent5">
                            <Lock size={22} />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-sm font-syne font-bold text-text">Two-Factor Auth</h4>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Multi-stage verification node</p>
                         </div>
                         <button className="px-6 h-10 bg-accent5 text-background rounded-xl font-syne font-bold text-[10px] tracking-widest uppercase hover:scale-[1.05] active:scale-95 transition-all">Initialize</button>
                      </div>
                   </div>
                )}

                {activeTab === 'notifications' && (
                   <div className="space-y-8">
                      <div className="space-y-4">
                         {[
                           { key: 'email', label: 'Email Broadcasts', desc: 'Summary of node activity in your inbox' },
                           { key: 'browser', label: 'Direct Push', desc: 'Real-time terminal alerts in browser' },
                           { key: 'slack', label: 'Slack Bridge', desc: 'Sync internal streams with Slack hooks' },
                           { key: 'mobile', label: 'Neural Link', desc: 'Mobile terminal push notifications' },
                         ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-6 rounded-3xl bg-surface2/30 border border-border hover:border-accent/30 transition-all group">
                               <div>
                                  <h4 className="text-sm font-syne font-bold text-text group-hover:text-accent transition-colors">{item.label}</h4>
                                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">{item.desc}</p>
                               </div>
                               <button 
                                 onClick={() => setForm(p => ({ ...p, notifications: { ...p.notifications, [item.key]: !p.notifications[item.key] } }))}
                                 className={cn(
                                   "w-12 h-6 rounded-full border transition-all relative flex items-center px-1",
                                   form.notifications[item.key] ? "bg-accent border-accent" : "bg-surface border-border"
                                 )}
                               >
                                  <div className={cn(
                                    "w-4 h-4 rounded-full transition-all shadow-sm",
                                    form.notifications[item.key] ? "translate-x-6 bg-background" : "bg-muted"
                                  )} />
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                <div className="pt-10 flex border-t" style={{ borderColor: 'var(--border)' }}>
                   <button 
                     onClick={handleSave}
                     className="ml-auto px-10 h-16 bg-accent text-background rounded-2xl font-syne font-bold text-sm tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
                   >
                      <Save size={20} />
                      Sync Configuration
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
