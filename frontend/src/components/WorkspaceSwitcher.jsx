import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

export default function WorkspaceSwitcher() {
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
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
      <div className="rounded-md border bg-card p-1">
        {workspaces.map((ws) => (
          <Button
            key={ws.slug}
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setTenant(ws.slug)}
          >
            <span className="truncate">{ws.name || ws.slug}</span>
            {tenant === ws.slug ? <Check className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </Button>
        ))}
      </div>
    </div>
  );
}
