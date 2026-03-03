import { useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/members": "Members",
  "/notifications": "Notifications",
  "/billing": "Billing",
  "/reports": "Reports"
};

export default function Topbar({ onToggleMobileSidebar }) {
  const { logout, user } = useAuth();
  const { tenant, setTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const currentWorkspace = useMemo(() => {
    const workspaces = user?.workspaces || [];
    return workspaces.find((ws) => ws.slug === tenant) || workspaces[0] || null;
  }, [user, tenant]);

  const title = useMemo(() => {
    if (location.pathname.startsWith("/projects/") && location.pathname.includes("/board")) return "Project Board";
    return pageTitles[location.pathname] || "Workspace";
  }, [location.pathname]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("light");
    const isLight = document.documentElement.classList.contains("light");
    document.documentElement.style.colorScheme = isLight ? "light" : "dark";
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground lg:hidden"
              onClick={onToggleMobileSidebar}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 lg:hidden">
              <p className="truncate text-base font-semibold tracking-tight">{title}</p>
            </div>

            <div className="hidden min-w-0 items-center gap-3 lg:flex">
              <div className="rounded-xl border border-border/70 bg-card/65 px-3 py-2 text-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="max-w-40 truncate font-medium tracking-tight">
                    {currentWorkspace?.name || tenant || "Workspace"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="relative min-w-[260px] max-w-[440px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks, projects, members..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl p-0" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>

            <Button variant="secondary" size="sm" className="relative h-10 w-10 rounded-xl p-0" onClick={() => navigate("/notifications")}> 
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary-hover" />
            </Button>

            <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl p-0" onClick={toggleTheme}>
              {document.documentElement.classList.contains("light") ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <details className="group relative hidden sm:block">
              <summary className="list-none">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-hover to-primary text-sm font-semibold text-primary-foreground shadow-md">
                  {(user?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                </button>
              </summary>
              <div className="absolute right-0 mt-2 min-w-52 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-xl backdrop-blur">
                <p className="px-3 py-2 text-sm font-medium">{user?.display_name || "Account"}</p>
                <p className="px-3 pb-2 text-xs text-muted-foreground">{user?.email || ""}</p>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger-foreground transition hover:bg-danger/15" onClick={logout}>
                  Logout
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-40 bg-background/75 backdrop-blur-sm transition-opacity ${searchOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setSearchOpen(false)} />
      <div className={`fixed inset-x-0 top-0 z-50 p-4 transition-transform sm:p-6 ${searchOpen ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Search</p>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70" onClick={() => setSearchOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, members..."
          />
          <div className="mt-4 rounded-xl border border-dashed border-border/80 p-3 text-xs text-muted-foreground">
            Search suggestions can be wired to your global search endpoint.
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select
              className="h-10 rounded-xl border border-border/80 bg-background/80 px-3 text-sm"
              value={tenant || ""}
              onChange={(e) => setTenant(e.target.value)}
            >
              {(user?.workspaces || []).map((ws) => (
                <option key={ws.slug} value={ws.slug}>{ws.name}</option>
              ))}
            </select>
            <Button variant="secondary" className="h-10" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>
    </>
  );
}
