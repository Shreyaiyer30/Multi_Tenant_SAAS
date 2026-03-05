import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/api/api";
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

const searchTargets = [
  { label: "Dashboard", href: "/dashboard", keywords: ["home", "overview", "stats"] },
  { label: "Projects", href: "/projects", keywords: ["project", "board", "kanban"] },
  { label: "Tasks", href: "/tasks", keywords: ["task", "todo", "work"] },
  { label: "Members", href: "/members", keywords: ["users", "team", "workspace"] },
  { label: "Notifications", href: "/notifications", keywords: ["alerts", "activity"] },
  { label: "Billing", href: "/billing", keywords: ["plan", "subscription", "payment"] },
  { label: "Reports", href: "/reports", keywords: ["analytics", "metrics", "reporting"] }
];

export default function Topbar({ onToggleMobileSidebar }) {
  const { logout, user } = useAuth();
  const { tenant, setTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectResults, setProjectResults] = useState([]);
  const [taskResults, setTaskResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const currentWorkspace = useMemo(() => {
    const workspaces = user?.workspaces || [];
    return workspaces.find((ws) => ws.slug === tenant) || workspaces[0] || null;
  }, [user, tenant]);

  const title = useMemo(() => {
    if (location.pathname.startsWith("/projects/") && location.pathname.includes("/board")) return "Project Board";
    return pageTitles[location.pathname] || "Workspace";
  }, [location.pathname]);

  const filteredTargets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchTargets;

    return searchTargets.filter((item) => {
      const haystack = `${item.label} ${item.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setProjectResults([]);
      setTaskResults([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const [projectRes, taskRes] = await Promise.all([
          api.get("projects/", { params: { search: normalized, ordering: "-updated_at" } }),
          api.get("tasks/", { params: { search: normalized, ordering: "-updated_at" } })
        ]);

        if (!active) return;
        setProjectResults((projectRes.data?.results || projectRes.data || []).slice(0, 5));
        setTaskResults((taskRes.data?.results || taskRes.data || []).slice(0, 5));
      } catch {
        if (!active) return;
        setProjectResults([]);
        setTaskResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const navigateToSearchTarget = (href) => {
    navigate(href);
    setSearchOpen(false);
  };

  const submitSearch = (event) => {
    event?.preventDefault?.();
    if (projectResults.length) {
      navigateToSearchTarget(`/projects/${projectResults[0].id}/board`);
      return;
    }
    if (taskResults.length) {
      navigateToSearchTarget("/tasks");
      return;
    }
    if (filteredTargets.length) {
      navigateToSearchTarget(filteredTargets[0].href);
    }
  };

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

              <form className="relative min-w-[260px] max-w-[440px] flex-1" onSubmit={submitSearch}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages..."
                  className="pl-9"
                />
              </form>
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

          <form onSubmit={submitSearch}>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages..."
            />
          </form>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-background/60 p-2">
            {searchLoading ? <p className="px-2 py-2 text-xs text-muted-foreground">Searching...</p> : null}

            {projectResults.length ? (
              <div className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Projects</p>
                {projectResults.map((project) => (
                  <button
                    key={project.id}
                    className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-foreground/90 transition hover:bg-muted/55"
                    onClick={() => navigateToSearchTarget(`/projects/${project.id}/board`)}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            ) : null}

            {taskResults.length ? (
              <div className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tasks</p>
                {taskResults.map((task) => (
                  <button
                    key={task.id}
                    className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-foreground/90 transition hover:bg-muted/55"
                    onClick={() => navigateToSearchTarget("/tasks")}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            ) : null}

            {!query.trim() ? (
              <div className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pages</p>
                {filteredTargets.map((item) => (
                  <button
                    key={item.href}
                    className="flex h-10 w-full items-center rounded-lg px-2 text-left text-sm text-foreground/90 transition hover:bg-muted/55"
                    onClick={() => navigateToSearchTarget(item.href)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}

            {!searchLoading && query.trim() && !projectResults.length && !taskResults.length ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">No matching projects or tasks.</p>
            ) : null}
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
