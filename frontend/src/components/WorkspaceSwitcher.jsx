import { useEffect, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

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

  useEffect(() => {
    if (!workspaces.length && tenant) {
      setWorkspaces([{ slug: tenant, name: tenant }]);
    }
  }, [tenant, workspaces]);

  if (compact) {
    const active = workspaces.find((ws) => ws.slug === tenant) || workspaces[0];
    return (
      <button
        className="flex h-10 w-full items-center justify-center rounded-xl border border-border/70 bg-card/70 text-xs font-semibold text-foreground transition hover:bg-muted/45"
        onClick={() => active && setTenant(active.slug)}
        title={active?.name || "Workspace"}
      >
        {(active?.name || "WS").slice(0, 2).toUpperCase()}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Workspace</p>
      <div className="relative rounded-2xl border border-border/70 bg-card/70 p-1.5">
        <select
          className="h-10 w-full appearance-none rounded-xl bg-transparent px-3 pr-9 text-sm text-foreground outline-none transition hover:bg-muted/35"
          value={tenant || ""}
          onChange={(event) => setTenant(event.target.value)}
        >
          {workspaces.map((ws) => (
            <option key={ws.slug} value={ws.slug}>
              {ws.name || ws.slug}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
