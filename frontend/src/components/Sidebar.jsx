import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { 
  Grid, 
  CheckSquare, 
  Folder, 
  Calendar, 
  Users, 
  MessageCircle, 
  BarChart, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: Grid },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, badge: 3 },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Calendar", href: "/calendar", icon: Calendar },
];

const teamNav = [
  { label: "Members", href: "/members", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageCircle, badge: 2 },
];

const insightNav = [
  { label: "Reports", href: "/reports", icon: BarChart },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

function NavItem({ item, collapsed, pathname, onClick }) {
  const active = pathname === item.href;
  const Icon = item.icon;

  return (
    <button
      onClick={() => onClick(item.href)}
      className={cn(
        "group relative flex items-center gap-3 w-full h-10 transition-all duration-200 px-4",
        active ? "text-accent bg-accent/5" : "text-muted hover:text-text hover:bg-surface2/50"
      )}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent shadow-[2px_0_10px_rgba(0,229,192,0.4)]" />
      )}
      
      <div className={cn(
        "shrink-0 transition-colors",
        active ? "text-accent" : "text-muted group-hover:text-text"
      )}>
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      </div>

      {!collapsed && (
        <span className={cn(
          "flex-1 text-left text-xs font-medium tracking-tight font-dm-mono",
          active ? "text-accent" : ""
        )}>
          {item.label}
        </span>
      )}

      {!collapsed && item.badge && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[9px] font-black",
          active ? "bg-accent/20 text-accent" : "bg-surface2 text-accent"
        )}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

function SidebarContent({ collapsed, onNavigate, user, currentWorkspace, logout, pathname }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 pb-4 space-y-6">
        
        {/* Workspace Switcher */}
        {!collapsed && (
          <div className="px-4 mb-4">
            <div className="text-[9px] font-black text-muted uppercase tracking-[0.15em] mb-2 opacity-60 font-dm-mono">Current Workspace</div>
            <button 
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border/50 bg-surface2/30 hover:bg-surface2/50 transition-all text-left"
            >
              <span className="text-xs font-bold text-text truncate max-w-[140px] font-syne">
                {currentWorkspace?.name || "Task Management"}
              </span>
              <ArrowUpDown size={12} className="text-muted" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="space-y-6">
          <section>
            {!collapsed && <div className="px-4 text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-3 opacity-40 font-dm-mono">Main</div>}
            <div className="space-y-0.5">
              {mainNav.map((item) => (
                <NavItem key={item.label} item={item} collapsed={collapsed} pathname={pathname} onClick={onNavigate} />
              ))}
            </div>
          </section>

          <section>
            {!collapsed && <div className="px-4 text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-3 opacity-40 font-dm-mono">Team</div>}
            <div className="space-y-0.5">
              {teamNav.map((item) => (
                <NavItem key={item.label} item={item} collapsed={collapsed} pathname={pathname} onClick={onNavigate} />
              ))}
            </div>
          </section>

          <section>
            {!collapsed && <div className="px-4 text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-3 opacity-40 font-dm-mono">Insights</div>}
            <div className="space-y-0.5">
              {insightNav.map((item) => (
                <NavItem key={item.label} item={item} collapsed={collapsed} pathname={pathname} onClick={onNavigate} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 mt-auto border-t border-border/50">
        <div 
          className={cn(
            "group flex items-center gap-3 transition-all cursor-pointer p-2 rounded-xl hover:bg-surface2/50",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="shrink-0 relative">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-background font-black text-[10px] bg-accent2 shadow-lg"
            >
              {(user?.display_name || "SI").slice(0, 2).toUpperCase()}
            </div>
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-syne font-bold text-xs text-text truncate tracking-tight">
                {user?.display_name || "Shreya Iyer"}
              </div>
              <div className="text-[8px] font-black text-muted uppercase tracking-widest mt-0.5">
                Pro Member
              </div>
            </div>
          )}
          
          {!collapsed && (
            <button onClick={logout} className="text-muted hover:text-accent3 transition-colors p-1">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
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
      <aside
        className={cn(
          "hidden h-screen border-r transition-all duration-300 lg:flex lg:flex-col lg:overflow-hidden z-30",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
        style={{ borderColor: 'var(--border)', backgroundColor: '#070b0f' }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-accent text-background flex items-center justify-center font-black text-sm shrink-0">
              F
            </div>
            {!collapsed && (
              <span className="font-syne font-black tracking-widest text-base text-text uppercase">
                Flow<span className="text-accent">Desk</span>
              </span>
            )}
          </div>
          <button 
            onClick={onToggleCollapsed} 
            className="text-muted hover:text-accent transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r shadow-2xl transition-transform duration-300 transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-background flex items-center justify-center font-black text-sm">
              F
            </div>
            <span className="font-syne font-black tracking-widest text-base text-text uppercase">FLOWDESK</span>
          </div>
          <button onClick={() => onMobileOpenChange?.(false)} className="text-muted">
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
