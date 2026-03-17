import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";

// Reuse the custom hook logic or define here if needed for dropdowns
const useOutsideClick = (callback) => {
  const ref = useRef();
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);
  return ref;
};

const topbarBreadcrumbs = {
   "/dashboard": ["Workspace", "Insight", "Dashboard"],
   "/projects": ["Workspace", "Task Management", "Projects"],
   "/tasks": ["Workspace", "Task Management", "Tasks"],
   "/members": ["Team", "Organization", "Members"],
   "/reports": ["Insights", "Performance", "Reports"],
};

export default function Topbar({ timeRange, setTimeRange, onToggleMobileSidebar }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(true);
  
  const notificationsRef = useOutsideClick(() => setIsNotificationsOpen(false));
  const paletteRef = useOutsideClick(() => setIsCommandPaletteOpen(false));

  const path = location.pathname;
  const crumbs = topbarBreadcrumbs[path] || ["Workspace", "Task Management", "Dashboard"];

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') setIsCommandPaletteOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-[58px] flex items-center justify-between px-6 border-b sticky top-0 shrink-0 z-40" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
        {/* Left: Breadcrumb / Mobile Menu Toggle */}
        <div className="flex items-center gap-4">
           <button onClick={onToggleMobileSidebar} className="lg:hidden p-2 -ml-2 hover:bg-surface2 rounded-lg transition-colors">
              <span className="text-xl">☰</span>
           </button>
           <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
             <span className="text-muted cursor-pointer hover:text-white transition-colors">{crumbs[0]}</span>
             <span className="text-muted opacity-40">/</span>
             <span className="text-muted cursor-pointer hover:text-white transition-colors">{crumbs[1]}</span>
             <span className="text-muted opacity-40">/</span>
             <span className="text-text">{crumbs[2]}</span>
           </div>
        </div>

        {/* Center: Search / Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
           <div 
             onClick={() => setIsCommandPaletteOpen(true)}
             className="flex items-center justify-between h-9 px-4 rounded-full border cursor-pointer hover:border-accent transition-all group"
             style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
           >
             <div className="flex items-center gap-3">
               <span className="text-muted group-hover:text-accent transition-colors">🔍</span>
               <span className="text-muted text-xs">Search anything...</span>
             </div>
             <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface2 text-[10px] text-muted font-mono leading-none">⌘K</kbd>
           </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border p-1" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                  timeRange === range ? "bg-accent text-background" : "text-muted hover:text-white"
                )}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative" ref={notificationsRef}>
             <button 
               onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
               className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface2 transition-all relative border"
               style={{ borderColor: 'var(--border)' }}
             >
                <span className="text-lg">🔔</span>
                {unreadNotifications && <div className="absolute top-2 right-2.5 w-2 h-2 rounded-full border-2 border-background bg-accent3" />}
             </button>

             {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border shadow-2xl overflow-hidden z-[100] animate-fade-up" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                   <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                      <h4 className="font-syne font-bold text-text">Notifications</h4>
                      <button onClick={() => setUnreadNotifications(false)} className="text-[10px] font-bold text-accent hover:underline">Mark all read</button>
                   </div>
                   <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      <div className="p-4 hover:bg-surface2 transition-colors cursor-pointer border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                         <div className="flex gap-3">
                           <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                           <div>
                              <p className="text-xs text-text leading-tight">Arjun mentioned you in task <span className="text-accent2">#24 - Navbar Fix</span></p>
                              <span className="text-[10px] text-muted mt-1 block">5m ago</span>
                           </div>
                         </div>
                      </div>
                      <div className="p-4 hover:bg-surface2 transition-colors cursor-pointer border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                         <div className="flex gap-3 pl-5">
                           <div>
                              <p className="text-xs text-text leading-tight">Project <span className="text-accent4">FlowDesk v2</span> reached 80% completion</p>
                              <span className="text-[10px] text-muted mt-1 block">2h ago</span>
                           </div>
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>

          <div 
            className="w-9 h-9 rounded-full border p-0.5" 
            style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, var(--accent2), var(--accent5))' }}
          >
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-bold text-[10px] text-text">
               {(user?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/80"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div 
            ref={paletteRef}
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden animate-fade-up"
            style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <div className="relative border-b" style={{ borderColor: 'var(--border)' }}>
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-50">🔍</span>
               <input 
                 autoFocus
                 placeholder="Search dashboard, projects, team..."
                 className="w-full h-16 bg-transparent px-16 text-lg focus:outline-none placeholder:text-muted font-medium text-text font-syne"
               />
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
               <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">Recent</div>
               <div className="space-y-1">
                 {[
                   { label: 'Project: Nebula SaaS', icon: '📁', sub: 'Last edited 2h ago' },
                   { label: 'Team Members', icon: '👥', sub: '3 active now' },
                   { label: 'Dashboard Overview', icon: '◰', sub: 'Insights' },
                 ].map((item) => (
                   <div key={item.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <span className="text-xl w-6 text-center">{item.icon}</span>
                        <div>
                          <p className="font-syne font-semibold text-text">{item.label}</p>
                          <p className="text-[10px] text-muted">{item.sub}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted opacity-0 group-hover:opacity-100 italic transition-opacity">↵ Navigate</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
               <div className="flex gap-4">
                  <span className="text-[10px] text-muted"><kbd className="px-1 py-0.5 rounded bg-surface2 border border-border">↑↓</kbd> Select</span>
                  <span className="text-[10px] text-muted"><kbd className="px-1 py-0.5 rounded bg-surface2 border border-border">↵</kbd> Open</span>
               </div>
               <span className="text-[10px] text-muted">Press ESC to dismiss</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

