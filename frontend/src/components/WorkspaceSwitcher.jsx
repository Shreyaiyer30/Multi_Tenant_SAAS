import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (fromUser.length) {
      setWorkspaces(fromUser);
    }
  }, [user]);

  useEffect(() => {
    if (!workspaces.length && tenant) {
      setWorkspaces([{ slug: tenant, name: tenant }]);
    }
  }, [tenant, workspaces]);

  return (
    <div className="space-y-2">
      {!compact ? <p className="px-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Workspace</p> : null}
      <div className="rounded-2xl border border-border/70 bg-card/65 p-1.5">
        {workspaces.map((ws) => (
          <Button
            key={ws.slug}
            variant="ghost"
            className="h-10 w-full justify-between rounded-xl"
            onClick={() => setTenant(ws.slug)}
            title={ws.name || ws.slug}
          >
            {!compact ? <span className="truncate">{ws.name || ws.slug}</span> : <span className="truncate">{(ws.name || ws.slug).slice(0, 2).toUpperCase()}</span>}
            {tenant === ws.slug ? <Check className="h-4 w-4" /> : !compact ? <ChevronsUpDown className="h-4 w-4" /> : null}
          </Button>
        ))}
      </div>
    </div>
  );
}
