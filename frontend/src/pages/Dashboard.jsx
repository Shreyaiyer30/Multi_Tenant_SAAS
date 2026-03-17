import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Cell
} from 'recharts';
import { useTenant } from "@/context/TenantContext";
import { getDashboardBundle, DASHBOARD_DUMMY_DATA } from "@/services/dashboardService";
import { cn } from "@/lib";

// --- HELPERS ---
function relativeLabel(isoDate) {
  if (!isoDate) return "Just now";
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- DASHBOARD COMPONENT ---

export default function Dashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { timeRange } = useOutletContext(); 
  const [dashboard, setDashboard] = useState(() => DASHBOARD_DUMMY_DATA["7d"]);
  const [loading, setLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState('All');

  useEffect(() => {
    if (!tenant) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await getDashboardBundle(timeRange);
        if (active) setDashboard(payload);
      } catch {
        if (active) setDashboard(DASHBOARD_DUMMY_DATA[timeRange] || DASHBOARD_DUMMY_DATA["7d"]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [tenant, timeRange]);

  const stats = dashboard?.stats || {};
  
  const kpis = useMemo(() => [
    { label: 'PROJECTS', value: stats.totalProjects, delta: '+12%', color: 'var(--accent2)', sparkline: [5, 12, 8, 15, 10, 20, 15] },
    { label: 'TASKS', value: stats.totalTasks, delta: '+5%', color: 'var(--accent)', sparkline: [10, 15, 12, 18, 14, 25, 20] },
    { label: 'COMPLETED', value: stats.completedTasks, delta: '+2', color: 'var(--accent5)', sparkline: [2, 5, 3, 8, 4, 10, 12] },
    { label: 'COMPLETION RATE', value: `${stats.completionRate}%`, delta: 'Stable', color: 'var(--accent4)', sparkline: [20, 25, 22, 30, 28, 35, 33] },
    { label: 'OVERDUE', value: stats.overdueTasks, delta: stats.overdueTasks > 0 ? '+1%' : '-100%', color: 'var(--accent3)', sparkline: [5, 8, 2, 4, 1, 0, 0] },
  ], [stats]);

  const filteredActivity = useMemo(() => {
    const items = dashboard?.recentActivity || [];
    if (activityFilter === 'All') return items;
    return items.filter(item => {
      if (activityFilter === 'Comments') return item.action.includes('comment') || item.action.includes('discussion');
      if (activityFilter === 'Assigned') return item.action.includes('assign');
      return true;
    });
  }, [dashboard, activityFilter]);

  // Specific data for the bar charts in the screenshot
  const teamPerfs = [
    { name: 'Shreya', completed: 4, role: 'Project Lead', color: 'var(--accent)', initials: 'SI' },
    { name: 'Arjun', completed: 2, role: 'Developer', color: 'var(--accent4)', initials: 'AK' },
    { name: 'Neha', completed: 1, role: 'Designer', color: 'var(--accent3)', initials: 'NP' },
  ];

  return (
    <div className="p-6 space-y-6 page-enter custom-scrollbar bg-background">
      
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Simple Area Charts like the screenshot */}
         <div className="surface-glass rounded-2xl p-6 h-48 flex flex-col justify-between overflow-hidden">
            <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Operational Velocity</h4>
            <div className="flex-1 -mx-6 -mb-2 mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[10, 40, 20, 50, 25, 45, 15, 35].map(v => ({ v }))}>
                     <defs>
                       <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="var(--accent2)" stopOpacity={0.2}/>
                         <stop offset="100%" stopColor="var(--accent2)" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="name" hide />
                     <Area type="monotone" dataKey="v" stroke="var(--accent2)" strokeWidth={2} fill="url(#velocityGrad)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="surface-glass rounded-2xl p-6 h-48 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
               <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">Network Load</h4>
               <span className="text-[10px] font-dm-mono text-accent">Active Sync</span>
            </div>
            <div className="flex-1 -mx-6 -mb-2 mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[30, 15, 45, 20, 55, 30, 65, 40].map(v => ({ v }))}>
                     <defs>
                       <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2}/>
                         <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} fill="url(#loadGrad)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="surface-glass rounded-2xl p-6 h-48 flex flex-col justify-between overflow-hidden">
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-40">System Density</h4>
              <div className="mt-4 flex items-center gap-2">
                 <span className="text-[9px] text-muted font-bold">Less</span>
                 <div className="flex gap-1">
                    {[0.2, 0.4, 0.6, 0.8, 1].map(o => (
                       <div key={o} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `var(--accent)`, opacity: o }} />
                    ))}
                 </div>
                 <span className="text-[9px] text-muted font-bold">More</span>
              </div>
            </div>
            <div className="flex gap-2 text-[9px] font-dm-mono text-muted overflow-hidden">
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="flex-1 text-center">{d}</div>)}
            </div>
         </div>
      </div>

      {/* BOTTOM ROW - Recent Activity & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        
        {/* Recent Activity Card */}
        <div className="surface-glass rounded-3xl flex flex-col h-[520px] overflow-hidden">
          <div className="p-8 border-b border-border/50 shrink-0 flex items-center justify-between">
            <h3 className="text-xl font-syne font-bold text-text tracking-tight uppercase">Recent Activity</h3>
            <div className="flex gap-2">
              {['All', 'Assigned', 'Comments'].map(f => (
                <button 
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={cn(
                    "text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-tight transition-all border",
                    activityFilter === f 
                      ? "bg-accent/10 border-accent/40 text-accent" 
                      : "bg-surface2/30 border-border/50 text-muted hover:border-accent/20"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {[
               { name: 'Shreya Iyer', action: 'commented on', target: 'Frontend', time: '6m ago', type: 'Comment', color: 'var(--accent)', initials: 'SI' },
               { name: 'Shreya Iyer', action: 'was assigned to', target: 'Frontend', time: '6m ago', type: 'Assigned', color: 'var(--accent2)', initials: 'SI' },
               { name: 'Shreya Iyer', action: 'was unassigned from', target: 'Frontend', time: '7m ago', type: 'Removed', color: 'var(--accent3)', initials: 'SI' },
               { name: 'Shreya Iyer', action: 'updated', target: 'Frontend', time: '8m ago', type: 'Updated', color: 'var(--accent4)', initials: 'SI' },
               { name: 'Shreya Iyer', action: 'added member to', target: 'Task Management', time: '10m ago', type: 'Member', color: 'var(--accent2)', initials: 'SI' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface2/40 transition-all group animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-[10px] text-background bg-accent shadow-lg">
                  {item.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">
                    <span className="font-bold text-text">{item.name}</span>
                    <span className="opacity-80">{item.action}</span>
                    <span className="font-bold text-accent">{item.target}</span>
                  </div>
                  <span className="text-[10px] text-muted opacity-40 font-dm-mono mt-1.5 block">{item.time}</span>
                </div>
                <div 
                  className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border"
                  style={{ backgroundColor: `${item.color}10`, color: item.color, borderColor: `${item.color}30` }}
                >
                  {item.type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Performance Card */}
        <div className="surface-glass rounded-3xl flex flex-col h-[520px] overflow-hidden">
          <div className="p-8 border-b border-border/50 shrink-0 flex items-center justify-between">
             <div>
                <h3 className="text-xl font-syne font-bold text-text tracking-tight uppercase">Team Performance</h3>
                <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1 opacity-40 ml-0.5">This week</p>
             </div>
          </div>
          <div className="p-8 flex-1 flex flex-col">
            <div className="h-40 mb-10 -mx-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerfs}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 9, fontStyle: 'DM Mono' }} dy={10} />
                  <YAxis hide domain={[0, 6]} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={() => null} />
                  <Bar dataKey="completed" radius={[8, 8, 0, 0]} barSize={90}>
                    {teamPerfs.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {teamPerfs.map((member, idx) => (
                <div key={idx} className="flex items-center gap-5 p-3 rounded-2xl hover:bg-surface2/40 transition-all animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-[10px] text-background" style={{ backgroundColor: member.color }}>
                    {member.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                         <span className="font-bold text-xs text-text block truncate tracking-tight">{member.name}</span>
                         <span className="text-[9px] text-muted font-black uppercase tracking-widest mt-1 block opacity-60">{member.role}</span>
                      </div>
                      <span className="text-[10px] font-black text-text font-dm-mono">{member.completed}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.2)]" 
                        style={{ width: `${(member.completed / 6) * 100}%`, backgroundColor: member.color }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
