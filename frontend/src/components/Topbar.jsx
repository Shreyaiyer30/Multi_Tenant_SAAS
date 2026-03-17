import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { 
  Search, 
  Bell, 
  Menu, 
  Command, 
  ChevronRight, 
  Check, 
  Clock, 
  AlertCircle,
  Hash
} from "lucide-react";

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
   "/dashboard": ["Workspace", "Task Management", "Dashboard"],
   "/projects": ["Workspace", "Team Ops", "Projects"],
   "/tasks": ["Workspace", "Node Flow", "Tasks"],
   "/members": ["Network", "Directory", "Members"],
   "/reports": ["Insights", "Analytics", "Reports"],
   "/billing": ["Invoicing", "Subscription", "Billing"],
   "/notifications": ["System", "Events", "Notifications"],
};

export default function Topbar({ timeRange, setTimeRange, onToggleMobileSidebar, collapsed }) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  
  const notificationsRef = useOutsideClick(() => setIsNotificationsOpen(false));
  const paletteRef = useOutsideClick(() => setIsCommandPaletteOpen(false));

  const path = location.pathname;
  const crumbs = topbarBreadcrumbs[path] || ["Workspace", "Task Management", "Dashboard"];

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
      <header 
        className="h-14 flex items-center justify-between px-6 border-b sticky top-0 shrink-0 z-40 bg-background/90 backdrop-blur-md" 
        style={{ borderColor: 'rgba(26, 45, 68, 0.5)' }}
      >
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-6">
           <button 
             onClick={onToggleMobileSidebar} 
             className="lg:hidden text-muted hover:text-accent transition-all"
           >
              <Menu size={18} />
           </button>
           
           <div className="hidden sm:flex items-center gap-2">
              {crumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-2">
                   <span className={cn(
                     "text-[10px] tracking-tight font-dm-mono uppercase",
                     i === crumbs.length - 1 ? "text-text font-black" : "text-muted opacity-60 font-medium"
                   )}>
                      {crumb}
                   </span>
                   {i < crumbs.length - 1 && (
                     <span className="text-muted/30 text-[10px]">›</span>
                   )}
                </div>
              ))}
           </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
           <div 
             onClick={() => setIsCommandPaletteOpen(true)}
             className="flex items-center justify-between h-9 px-4 rounded-full border border-border/40 bg-surface/40 hover:border-accent/30 transition-all group cursor-pointer"
           >
             <div className="flex items-center gap-3">
               <Search size={14} className="text-muted/50 group-hover:text-accent/60 transition-colors" />
               <span className="text-muted/40 text-xs font-dm-mono lowercase tracking-tight">Search...</span>
             </div>
             <div className="flex items-center gap-1 opacity-20 group-hover:opacity-60 transition-opacity">
                <Command size={10} />
                <span className="text-[10px] font-black">K</span>
             </div>
           </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <div className="flex bg-surface2/30 p-1 rounded-lg border border-border/30">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tight transition-all",
                  timeRange === range 
                    ? "bg-accent text-background shadow-lg" 
                    : "text-muted hover:text-text"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="relative" ref={notificationsRef}>
             <button 
               onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
               className={cn(
                 "w-9 h-9 flex items-center justify-center rounded-lg border border-border/30 transition-all relative ring-inset",
                 isNotificationsOpen ? "bg-accent/10 border-accent/40 text-accent" : "bg-surface2/30 text-muted hover:text-accent hover:border-accent/20"
               )}
             >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-accent4 border-2 border-background animate-pulse" />
                )}
             </button>

             {isNotificationsOpen && (
                <div 
                  className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/50 shadow-2xl overflow-hidden z-[100] animate-fade-up bg-surface/95 backdrop-blur-xl"
                >
                   <div className="p-4 border-b border-border/50 flex items-center justify-between">
                      <h4 className="font-syne font-bold text-text text-sm uppercase tracking-tight">Recent Activity</h4>
                      <span className="text-[8px] font-black bg-accent text-background px-1.5 py-0.5 rounded uppercase tracking-widest">{unreadCount} New</span>
                   </div>
                   
                   <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {[
                        { title: 'Task Assigned', desc: 'Arjun assigned a task: Navbar Fix', time: '12m' },
                        { title: 'Status Update', desc: 'Front-end sync completed successfully', time: '1h' },
                      ].map((n, i) => (
                        <div key={i} className="p-4 hover:bg-surface2/50 transition-all cursor-pointer border-b border-border/30 last:border-0 group">
                           <div className="flex justify-between items-start mb-1">
                              <h5 className="text-[10px] font-bold text-text uppercase tracking-tight group-hover:text-accent transition-colors">{n.title}</h5>
                              <span className="text-[9px] font-dm-mono opacity-40">{n.time}</span>
                           </div>
                           <p className="text-[11px] text-muted leading-tight">{n.desc}</p>
                        </div>
                      ))}
                   </div>

                   <button 
                      onClick={() => { setIsNotificationsOpen(false); navigate('/notifications'); }}
                      className="w-full py-3 text-[9px] font-black text-muted uppercase tracking-[0.2em] hover:text-accent hover:bg-surface2 transition-all border-t border-border/50"
                    >
                      Audit Trail
                    </button>
                </div>
             )}
          </div>

          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] bg-accent text-background shadow-lg rotate-0 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
             {(user?.display_name || "SI").slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-background/60"
        >
          <div 
            ref={paletteRef}
            className="w-full max-w-xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-fade-up bg-surface/95 backdrop-blur-2xl"
          >
            <div className="relative border-b border-border/30">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted opacity-40" size={20} />
               <input 
                 autoFocus
                 placeholder="Search terminal..."
                 className="w-full h-16 bg-transparent px-16 text-lg focus:outline-none placeholder:text-muted/20 font-syne font-medium text-text"
               />
               <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-20 pointer-events-none">
                  <span className="text-xs font-bold">⌘</span>
                  <span className="text-xs font-bold uppercase tracking-widest">K</span>
               </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto custom-scrollbar">
               <div className="px-4 text-[9px] font-black text-muted uppercase tracking-widest mb-4 opacity-40">Frequency History</div>
               <div className="space-y-1">
                 {[
                   { label: 'Project: FlowDesk UI', type: 'Node' },
                   { label: 'Member: Sarah Chen', type: 'Entity' },
                   { label: 'Task: API Deployment', type: 'Flow' },
                 ].map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface2/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-surface2 border border-border/30 flex items-center justify-center text-muted group-hover:text-accent transition-colors">
                           <Hash size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text/80 group-hover:text-accent transition-colors">{item.label}</p>
                          <p className="text-[9px] font-black text-muted uppercase tracking-widest">{item.type}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted/20 group-hover:text-accent/40 translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100" />
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between opacity-40">
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-border text-[8px] font-black">↑↓</div>
                  <span className="text-[9px] font-black uppercase tracking-widest">Navigate</span>
               </div>
               <div className="text-[9px] font-black uppercase tracking-widest">FlowDesk terminal v2.4</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
