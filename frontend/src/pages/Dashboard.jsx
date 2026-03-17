import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useTenant } from "@/context/TenantContext";
import { getDashboardBundle, DASHBOARD_DUMMY_DATA } from "@/services/dashboardService";
import { cn } from "@/lib";
import { 
  Folder, 
  CheckSquare, 
  CheckCircle2, 
  BarChart2, 
  AlertCircle,
  Download,
  Plus
} from "lucide-react";

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

const statusColors = ['var(--accent2)', 'var(--accent5)', 'var(--accent)', 'var(--accent4)'];

export default function Dashboard() {
  const { user } = useAuth();
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
    { label: 'TOTAL PROJECTS', value: stats.totalProjects, change: 'unchanged', icon: Folder, color: 'var(--accent2)', sparkline: [5, 8, 7, 9, 8, 10, 8] },
    { label: 'TOTAL TASKS', value: stats.totalTasks, change: '↓ -1 this period', icon: CheckSquare, color: 'var(--accent)', sparkline: [10, 15, 12, 18, 14, 25, 20] },
    { label: 'COMPLETED', value: stats.completedTasks, change: '↑ 33% rate', icon: CheckCircle2, color: 'var(--accent5)', sparkline: [2, 5, 3, 8, 4, 10, 12] },
    { label: 'COMPLETION RATE', value: `${stats.completionRate}%`, change: '- on track', icon: BarChart2, color: 'var(--accent4)', sparkline: [20, 25, 22, 30, 28, 35, 33] },
    { label: 'OVERDUE TASKS', value: stats.overdueTasks, change: '↑ No delays!', icon: AlertCircle, color: 'var(--accent3)', sparkline: [5, 4, 3, 2, 1, 0, 0] },
  ], [stats]);

  const teamPerfs = [
    { name: 'Shreya', completed: 4, role: 'Project Lead', color: 'var(--accent)', initials: 'SI' },
    { name: 'Arjun', completed: 2, role: 'Developer', color: 'var(--accent4)', initials: 'AK' },
    { name: 'Neha', completed: 1, role: 'Designer', color: 'var(--accent3)', initials: 'NP' },
  ];

  return (
    <div className="p-6 space-y-6 page-enter custom-scrollbar bg-background">
      
      {/* HEADER SECTION */}
      <div className="flex items-end justify-between px-1">
         <div>
            <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em] font-dm-mono mb-2">Welcome Back, {user?.first_name || user?.display_name || "Agent"}</div>
            <h1 className="text-[42px] font-syne font-black text-text tracking-tighter uppercase leading-none">Dashboard</h1>
            <p className="text-[10px] font-black text-muted mt-3 opacity-50 uppercase tracking-widest font-dm-mono">Track delivery velocity, task flow, and team output in one place.</p>
         </div>
         <div className="flex gap-2">
            <button className="h-8 px-4 rounded-lg border border-border bg-surface/50 text-[9px] font-black uppercase tracking-widest text-muted hover:text-text transition-all flex items-center gap-1.5 font-dm-mono">
               <Download size={12} /> Export
            </button>
            <button 
              onClick={() => navigate('/tasks')}
              className="h-8 px-4 rounded-lg bg-accent text-background text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 font-dm-mono shadow-lg"
            >
               <Plus size={12} strokeWidth={3} /> New Task
            </button>
         </div>
      </div>

      {/* KPI ROW - 5 COLUMNS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[14px]">
         {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-surface border border-border rounded-[10px] p-[16px_18px] flex flex-col justify-between h-32">
               <div>
                  <h4 className="text-[9px] font-black text-muted uppercase tracking-[0.15em] opacity-60 font-dm-mono mb-2">{kpi.label}</h4>
                  <div className="text-[28px] font-syne font-black tracking-tight leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
               </div>
               
               <div>
                  <p className="text-[9px] font-bold text-accent uppercase tracking-tight flex items-center gap-1 mb-1 font-dm-mono">
                     {kpi.change}
                  </p>
                  <div className="h-[28px] -mx-1">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpi.sparkline.map(v => ({ v }))}>
                           <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={kpi.color} fillOpacity={0.05} baseLine={0} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* CHARTS ROW - Row 3 Grid (3 columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_1fr] gap-[18px]">
         {/* Tasks by Status (Donut) */}
         <div className="bg-surface border border-border rounded-[10px] p-[20px_22px] flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[10px] font-black text-text uppercase tracking-widest font-dm-mono">Tasks by Status</h3>
               <div className="flex bg-surface2/50 p-0.5 rounded border border-border">
                  <button className="px-2 py-0.5 rounded-sm text-[8px] font-black bg-accent text-background uppercase">Donut</button>
                  <button className="px-2 py-0.5 rounded-sm text-[8px] font-black text-muted uppercase">Bar</button>
               </div>
            </div>
            
            <div className="flex gap-[20px] items-center flex-1">
               <div className="w-[110px] h-[110px] relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={dashboard?.statusData || []}
                           innerRadius={40}
                           outerRadius={55}
                           paddingAngle={4}
                           dataKey="value"
                        >
                           {(dashboard?.statusData || []).map((entry, index) => (
                              <Cell 
                                 key={`cell-${index}`} 
                                 fill={statusColors[index % statusColors.length]} 
                                 stroke="transparent"
                              />
                           ))}
                        </Pie>
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-xl font-syne font-black text-text">{stats.totalTasks}</span>
                     <span className="text-[8px] text-muted font-black uppercase tracking-widest opacity-40 font-dm-mono">tasks</span>
                  </div>
               </div>

               <div className="space-y-2.5 flex-1">
                  {(dashboard?.statusData || []).map((s, idx) => (
                     <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[idx] }} />
                           <span className="text-[9px] font-bold text-muted uppercase tracking-tight font-dm-mono">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-1 bg-surface2 rounded-full overflow-hidden">
                              <div className="h-full" style={{ width: `${(s.value / stats.totalTasks) * 100}%`, backgroundColor: statusColors[idx] }} />
                           </div>
                           <span className="text-[9px] font-black text-text font-dm-mono w-2 text-right">{s.value}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Velocity (Line Chart) */}
         <div className="bg-surface border border-border rounded-[10px] p-[20px_22px] flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[10px] font-black text-text uppercase tracking-widest font-dm-mono">Velocity</h3>
               <div className="flex bg-surface2/50 p-0.5 rounded border border-border">
                  <button className="px-2 py-0.5 rounded-sm text-[8px] font-black bg-accent/20 text-accent border border-accent/30 uppercase font-dm-mono">Week</button>
                  <button className="px-2 py-0.5 rounded-sm text-[8px] font-black text-muted uppercase font-dm-mono">Month</button>
               </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent2" />
                  <span className="text-[8px] font-black text-accent2 uppercase tracking-widest font-dm-mono">Created</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest font-dm-mono">Completed</span>
               </div>
            </div>

            <div className="h-[150px] -mx-4">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard?.tasksComparison || []}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                     <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted)', fontSize: 8, fontFamily: 'DM Mono' }} 
                        dy={10} 
                     />
                     <YAxis hide domain={[0, 'dataMax + 1']} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '9px', fontFamily: 'DM Mono' }}
                     />
                     <Line 
                        type="monotone" 
                        dataKey="created" 
                        stroke="var(--accent2)" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: 'var(--accent2)', strokeWidth: 0 }} 
                     />
                     <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="var(--accent)" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }} 
                     />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Activity Heatmap */}
         <div className="bg-surface border border-border rounded-[10px] p-[20px_22px] flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[10px] font-black text-text uppercase tracking-widest font-dm-mono">Activity Heatmap</h3>
               <span className="text-[9px] font-bold text-muted uppercase tracking-tight opacity-40 font-dm-mono">Last 28 days</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
               <div className="grid grid-cols-7 gap-1 mb-4">
                  {Array.from({ length: 28 }).map((_, i) => {
                     const vals = [0, 1, 2, 3, 4, 3, 2, 0, 1, 0, 4, 2, 1, 0, 2, 3, 4, 1, 0, 2, 3, 1, 0, 2, 4, 1, 3, 0];
                     const val = vals[i] || 0;
                     return (
                        <div 
                           key={i} 
                           className="aspect-square rounded-[3px] transition-all hover:scale-110"
                           style={{ 
                              backgroundColor: 'var(--accent)', 
                              opacity: val === 0 ? 0.05 : val * 0.25 
                           }}
                        />
                     );
                  })}
               </div>
               
               <div className="grid grid-cols-7 gap-1 mb-6">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                     <div key={d} className="text-[8px] font-black text-muted uppercase tracking-widest text-center opacity-40 font-dm-mono">{d}</div>
                  ))}
               </div>

               <div className="flex items-center gap-2 pt-4 border-t border-border/30">
                  <span className="text-[8px] font-bold text-muted uppercase font-dm-mono">Less</span>
                  <div className="flex gap-1">
                     {[0.05, 0.25, 0.5, 0.75, 1].map(o => (
                        <div key={o} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: `var(--accent)`, opacity: o }} />
                     ))}
                  </div>
                  <span className="text-[8px] font-bold text-muted uppercase font-dm-mono">More</span>
               </div>
            </div>
         </div>
      </div>

      {/* OPERATIONS ROW - Row 2 Grid (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] pb-6">
         {/* Recent Activity */}
         <div className="bg-surface border border-border rounded-[10px] p-[20px_22px] flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[12px] font-syne font-bold text-text tracking-tight uppercase">Recent Activity</h3>
               <div className="flex gap-1.5">
                  {['All', 'Assigned', 'Comments'].map(f => (
                     <button key={f} onClick={() => setActivityFilter(f)} className={cn("text-[8px] px-3 py-1 rounded-full font-black uppercase transition-all font-dm-mono", activityFilter === f ? "bg-accent text-background" : "bg-surface2/50 text-muted")}>{f}</button>
                  ))}
               </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] space-y-2">
               {[
                  { user: 'Shreya Iyer', action: 'commented on', target: 'Frontend', time: '6m ago', initials: 'SI' },
                  { user: 'Shreya Iyer', action: 'was assigned to', target: 'Frontend', time: '6m ago', initials: 'SI' },
                  { user: 'Shreya Iyer', action: 'was unassigned from', target: 'Frontend', time: '7m ago', initials: 'SI' },
                  { user: 'Shreya Iyer', action: 'updated', target: 'Frontend', time: '8m ago', initials: 'SI' },
                  { user: 'Shreya Iyer', action: 'added member to', target: 'Task Management', time: '10m ago', initials: 'SI' },
               ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-[11px] py-[10px] border-b border-border/20 last:border-0 group">
                     <div className="w-[30px] h-[30px] rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-[9px] text-accent shrink-0">
                        {item.initials}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted leading-tight font-dm-mono">
                           <span className="font-bold text-text">{item.user}</span> {item.action} <span className="font-bold text-accent">{item.target}</span>
                        </p>
                        <span className="text-[8px] text-muted opacity-40 font-dm-mono block mt-0.5">{item.time}</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Team Performance */}
         <div className="bg-surface border border-border rounded-[10px] p-[20px_22px] flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-[12px] font-syne font-bold text-text tracking-tight uppercase">Team Performance</h3>
                  <p className="text-[8px] text-muted font-black uppercase tracking-[0.2em] mt-0.5 opacity-40 font-dm-mono">Operational Stats</p>
               </div>
               <span className="text-[9px] font-black text-accent uppercase tracking-widest font-dm-mono">This week</span>
            </div>
            
            <div className="h-[120px] mb-8 -mx-2">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerfs}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 8, fontFamily: 'DM Mono' }} dy={10} />
                     <YAxis hide domain={[0, 6]} />
                     <Bar dataKey="completed" radius={[4, 4, 0, 0]} barSize={40}>
                        {teamPerfs.map((e, i) => <Cell key={i} fill={e.color} />)}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
               {teamPerfs.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-[10px] p-[8px_10px] rounded-[7px] bg-surface2/20 border border-border/20 hover:bg-surface2/30 transition-all">
                     <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-black text-[9px] text-background shrink-0" style={{ backgroundColor: m.color }}>
                        {m.initials}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                           <div className="min-w-0">
                              <span className="text-[10px] font-bold text-text block tracking-tight truncate">{m.name}</span>
                           </div>
                           <span className="text-[9px] font-black text-text font-dm-mono">{m.completed}</span>
                        </div>
                        <div className="h-[3px] w-[70px] bg-background rounded-[2px] overflow-hidden">
                           <div className="h-full rounded-[2px]" style={{ width: `${(m.completed / 6) * 100}%`, backgroundColor: m.color }} />
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
