import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: "◰" },
  { label: "Projects", href: "/projects", icon: "📁" },
  { label: "Tasks", href: "/tasks", icon: "☰", badge: 3 },
  { label: "Calendar", href: "/calendar", icon: "📅" },
];

const teamNav = [
  { label: "Members", href: "/members", icon: "👥" },
  { label: "Messages", href: "/messages", icon: "✉", badge: 2, badgeColor: "var(--accent3)" },
];

const insightNav = [
  { label: "Reports", href: "/reports", icon: "📊" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

function SidebarContent({
  collapsed,
  onNavigate,
  user,
  currentWorkspace,
  logout,
  pathname
}) {
  const roleLabel = (currentWorkspace?.role || "member");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: 'var(--text)' }}>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-6">
        {/* Project Switcher */}
        {!collapsed && (
          <div 
            className="mx-2 p-3 rounded-xl border cursor-pointer hover:bg-surface2 transition-all group"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface2)' }}
          >
            <div className="text-[10px] text-muted uppercase font-bold mb-1">Workspace</div>
            <div className="flex items-center justify-between">
              <span className="font-syne font-semibold truncate">{currentWorkspace?.name || "Select Workspace"}</span>
              <span className="text-xs group-hover:translate-y-px transition-transform">⇅</span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <section>
          {!collapsed && <div className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Main</div>}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 px-4 transition-colors rounded-none",
                    active ? "nav-item-active" : "hover:text-accent text-muted"
                  )}
                >
                  <span className="text-lg w-5 text-center">{item.icon}</span>
                  {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface2 border border-border text-white">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          {!collapsed && <div className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Team</div>}
          <div className="space-y-1">
            {teamNav.map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 px-4 transition-colors rounded-none",
                    active ? "nav-item-active" : "hover:text-accent text-muted"
                  )}
                >
                  <span className="text-lg w-5 text-center">{item.icon}</span>
                  {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span 
                      className="px-1.5 py-0.5 rounded-full text-[10px] text-white" 
                      style={{ backgroundColor: item.badgeColor || 'var(--surface2)', border: '1px solid var(--border)' }}
                    >{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          {!collapsed && <div className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Insights</div>}
          <div className="space-y-1">
            {insightNav.map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 px-4 transition-colors rounded-none",
                    active ? "nav-item-active" : "hover:text-accent text-muted"
                  )}
                >
                  <span className="text-lg w-5 text-center">{item.icon}</span>
                  {!collapsed && <span className="flex-1 text-left font-medium">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 group relative cursor-pointer" onClick={logout}>
            <div 
              className="w-8 h-8 rounded-full flex-shrink-0" 
              style={{ background: 'linear-gradient(135deg, var(--accent2), var(--accent5))' }}
            />
            <div className="overflow-hidden">
              <div className="font-syne font-bold truncate text-text">{user?.display_name || user?.email || "User"}</div>
              <div className="text-[10px] text-muted truncate capitalize">{roleLabel}</div>
            </div>
            <div className="absolute inset-0 bg-accent3/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <span className="text-[10px] font-bold text-accent3">LOGOUT</span>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <style>{`
        .nav-item-active {
          background: linear-gradient(90deg, rgba(0, 229, 192, 0.1) 0%, transparent 100%);
          border-left: 2px solid var(--accent);
          color: var(--accent);
        }
      `}</style>
      <aside
        className={cn(
          "hidden h-screen border-r transition-all duration-300 lg:flex lg:flex-col lg:overflow-hidden z-30",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between p-4 h-[58px] border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="min-w-[32px] h-8 rounded-lg flex items-center justify-center font-bold text-lg" style={{ background: 'var(--accent)', color: 'var(--background)' }}>F</div>
            {!collapsed && <span className="font-syne font-bold tracking-tighter text-lg text-text">FLOWDESK</span>}
          </div>
          <button onClick={onToggleCollapsed} className="hover:text-accent transition-colors text-muted">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <SidebarContent
          collapsed={collapsed}
          onNavigate={onNavigate}
          user={user}
          currentWorkspace={currentWorkspace}
          logout={logout}
          pathname={location.pathname}
        />
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onMobileOpenChange?.(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between p-4 h-[58px] border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
           <div className="flex items-center gap-3 overflow-hidden">
            <div className="min-w-[32px] h-8 rounded-lg flex items-center justify-center font-bold text-lg" style={{ background: 'var(--accent)', color: 'var(--background)' }}>F</div>
            <span className="font-syne font-bold tracking-tighter text-lg text-text">FLOWDESK</span>
          </div>
          <button onClick={() => onMobileOpenChange?.(false)} className="text-muted hover:text-accent">
            ✕
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
