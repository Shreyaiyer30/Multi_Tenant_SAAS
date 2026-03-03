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
  Sparkles,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useAuth } from "@/context/AuthContext";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Members", href: "/members", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: LineChart }
];

function SidebarContent({ collapsed, onNavigate, onToggleCollapsed, user, logout, pathname }) {
  const initials = useMemo(() => {
    const first = user?.first_name?.[0] || user?.display_name?.[0] || "U";
    const last = user?.last_name?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [user]);

  return (
    <>
      <div className="flex items-center justify-between px-2">
        <button
          className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-150 hover:bg-muted/50"
          onClick={() => onNavigate("/dashboard")}
        >
          <div className="rounded-lg bg-gradient-to-br from-primary-hover to-primary p-1.5 text-primary-foreground shadow-[0_8px_20px_rgba(58,66,90,0.38)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          {!collapsed ? <span className="truncate text-sm font-semibold tracking-tight">TaskSaaS</span> : null}
        </button>

        {onToggleCollapsed ? (
          <button
            className="rounded-lg border border-border/70 bg-card/70 p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
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
                  ? "bg-gradient-to-r from-primary/25 to-primary-active/20 text-foreground shadow-[inset_0_0_0_1px_rgba(127,138,167,0.48)]"
                  : "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
                  active ? "bg-primary-hover opacity-100" : "opacity-0"
                )}
              />
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <details className="group mt-3 rounded-2xl border border-border/70 bg-card/70 p-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/35 hover:text-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-hover to-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
            {!collapsed ? <span className="truncate">{user?.display_name || user?.email || "User"}</span> : null}
          </span>
          {!collapsed ? <Sparkles className="h-4 w-4" /> : null}
        </summary>
        {!collapsed ? (
          <button
            className="mt-2 flex h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-foreground transition hover:bg-danger/15 hover:text-danger-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        ) : null}
      </details>
    </>
  );
}

export default function Sidebar({ collapsed = false, onToggleCollapsed, mobileOpen = false, onMobileOpenChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onNavigate = (href) => {
    navigate(href);
    onMobileOpenChange?.(false);
  };

  return (
    <>
      <aside className="hidden h-screen border-r border-border/60 bg-gradient-to-b from-card/90 via-card/75 to-background px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col">
        <SidebarContent
          collapsed={collapsed}
          onNavigate={onNavigate}
          onToggleCollapsed={onToggleCollapsed}
          user={user}
          logout={logout}
          pathname={location.pathname}
        />
      </aside>

      <div className={cn("fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => onMobileOpenChange?.(false)} />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border/60 bg-gradient-to-b from-card/95 via-card/90 to-background px-3 py-4 backdrop-blur-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-2 flex items-center justify-end">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/75 text-muted-foreground" onClick={() => onMobileOpenChange?.(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent
          collapsed={false}
          onNavigate={onNavigate}
          user={user}
          logout={logout}
          pathname={location.pathname}
        />
      </aside>
    </>
  );
}
