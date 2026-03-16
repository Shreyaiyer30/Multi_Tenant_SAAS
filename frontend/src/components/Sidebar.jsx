import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  ListTodo,
  LogOut,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Members", href: "/members", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: LineChart }
];

function SidebarContent({
  collapsed,
  onNavigate,
  onToggleCollapsed,
  user,
  currentWorkspace,
  logout,
  pathname
}) {
  const initials = useMemo(() => {
    const first = user?.first_name?.[0] || user?.display_name?.[0] || "U";
    const last = user?.last_name?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [user]);

  const roleLabel = (currentWorkspace?.role || "member").toUpperCase();

  return (
    <>
      <div className="flex items-center justify-between">
        <button
          className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-150 hover:bg-muted/55"
          onClick={() => onNavigate("/dashboard")}
        >
          <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-violet-500 p-1.5 text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          {!collapsed ? <span className="truncate text-sm font-semibold tracking-tight">TaskSaaS</span> : null}
        </button>

        {onToggleCollapsed ? (
          <button
            className="rounded-lg border border-border/70 bg-card/70 p-1.5 text-muted-foreground transition hover:bg-muted/45 hover:text-foreground"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <WorkspaceSwitcher compact={collapsed} />
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "group relative flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ease-in-out",
                active
                  ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-foreground shadow-[inset_0_0_0_1px_rgba(16,185,129,0.45)]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
                  active ? "bg-primary opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-all",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl border border-border/70 bg-card/75 p-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 text-xs font-semibold text-white">
            {initials}
          </span>

          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.display_name || user?.email || "User"}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                {roleLabel} {currentWorkspace?.name ? `• ${currentWorkspace.name}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        <button
          className={cn(
            "mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-danger/15 hover:text-danger-foreground",
            collapsed ? "justify-center" : "justify-start"
          )}
          onClick={logout}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? "Logout" : null}
        </button>
      </div>
    </>
  );
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileOpenChange
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant } = useTenant();

  const onNavigate = (href) => {
    navigate(href);
    onMobileOpenChange?.(false);
  };

  const currentWorkspace = useMemo(() => {
    const workspaces = user?.workspaces || [];
    return workspaces.find((ws) => ws.slug === tenant) || workspaces[0] || null;
  }, [user, tenant]);

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen border-r border-border/60 bg-gradient-to-b from-card/95 via-card/85 to-background backdrop-blur-xl lg:flex lg:flex-col lg:overflow-hidden lg:transition-all lg:duration-300",
          collapsed ? "w-[72px] px-2 py-4" : "w-[260px] px-3 py-4"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onNavigate={onNavigate}
          onToggleCollapsed={onToggleCollapsed}
          user={user}
          currentWorkspace={currentWorkspace}
          logout={logout}
          pathname={location.pathname}
        />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onMobileOpenChange?.(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border/60 bg-gradient-to-b from-card/95 via-card/90 to-background px-3 py-4 backdrop-blur-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-2 flex items-center justify-end">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/75 text-muted-foreground"
            onClick={() => onMobileOpenChange?.(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent
          collapsed={false}
          onNavigate={onNavigate}
          user={user}
          currentWorkspace={currentWorkspace}
          logout={logout}
          pathname={location.pathname}
        />
      </aside>
    </>
  );
}
