import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, Layout } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib";

export default function WorkspaceSwitcher({ compact = false }) {
  const { tenant, setTenant } = useTenant();
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState(() => {
    const raw = localStorage.getItem("workspaces");
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const fromUser = Array.isArray(user?.workspaces)
      ? user.workspaces.map((ws) => ({ slug: ws.slug, name: ws.name }))
      : [];
    if (fromUser.length) setWorkspaces(fromUser);
  }, [user]);

  const active = workspaces.find((ws) => ws.slug === tenant) || workspaces[0];

  if (compact) {
    return (
      <button
        className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center font-bold text-xs text-accent transition-all hover:scale-110 active:scale-95 shadow-lg group relative"
        onClick={() => active && setTenant(active.slug)}
        title={active?.name || "Workspace"}
      >
        <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />
      </button>
    );
  }

  return (
    <div className="space-y-2 group">
      <div className="px-5 flex items-center justify-between">
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-40">System Node</p>
         <Layout size={12} className="text-muted/30" />
      </div>
      
      <div className="relative mx-2">
        <select
          className="w-full h-14 bg-surface2/50 rounded-2xl border border-border pl-5 pr-12 text-sm font-syne font-bold text-text outline-none appearance-none transition-all hover:border-accent group-hover:bg-surface2 cursor-pointer shadow-inner"
          value={tenant || ""}
          onChange={(event) => setTenant(event.target.value)}
        >
          {workspaces.map((ws) => (
            <option key={ws.slug} value={ws.slug} className="bg-surface text-text font-bold">
              {ws.name || ws.slug}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col gap-0.5 opacity-40 group-hover:opacity-100 transition-all group-hover:text-accent">
           <ChevronDown size={14} strokeWidth={3} />
        </div>
        
        <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      </div>
    </div>
  );
}
