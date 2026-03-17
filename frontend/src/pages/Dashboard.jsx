import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { useTenant } from "@/context/TenantContext";
import { getDashboardBundle, DASHBOARD_DUMMY_DATA } from "@/services/dashboardService";

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

const HEATMAP_VALUES = [
  0,0,1,0,2,0,0, 
  1,3,0,2,1,0,0, 
  0,1,2,4,0,1,0, 
  2,1,0,1,3,0,0
];

// --- DASHBOARD COMPONENT ---

export default function Dashboard() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { timeRange } = useOutletContext(); // Lifted state from ProtectedLayout/App
  const [dashboard, setDashboard] = useState(() => DASHBOARD_DUMMY_DATA["7d"]);
  const [loading, setLoading] = useState(false);
  const [selectedKpiIdx, setSelectedKpiIdx] = useState(null);
  const [donutActiveIndex, setDonutActiveIndex] = useState(null);
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
    { label: 'PROJECTS', value: stats.totalProjects, delta: '+12%', color: 'var(--accent2)', sparkline: [5, 12, 8, 15, 10, 20, 15], href: "/projects" },
    { label: 'TASKS', value: stats.totalTasks, delta: '+5%', color: 'var(--accent)', sparkline: [10, 15, 12, 18, 14, 25, 20], href: "/tasks" },
    { label: 'COMPLETED', value: stats.completedTasks, delta: '+2', color: 'var(--accent5)', sparkline: [2, 5, 3, 8, 4, 10, 12], href: "/tasks?status=done" },
    { label: 'COMPLETION RATE', value: `${stats.completionRate}%`, delta: 'Stable', color: 'var(--accent4)', sparkline: [20, 25, 22, 30, 28, 35, 33], href: "/tasks?status=done" },
    { label: 'OVERDUE', value: stats.overdueTasks, delta: stats.overdueTasks > 0 ? '+1%' : '-100%', color: 'var(--accent3)', sparkline: [5, 8, 2, 4, 1, 0, 0], href: "/tasks?overdue=true" },
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

  return (
    <div className="p-6 space-y-6 page-enter custom-scrollbar">
      
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            onClick={() => {
              setSelectedKpiIdx(idx);
              if (kpi.href) navigate(kpi.href);
            }}
            className={`animate-fade-up p-4 rounded-2xl border transition-all cursor-pointer group ${selectedKpiIdx === idx ? 'ring-2 ring-accent' : 'hover:border-accent/50'}`}
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderColor: 'var(--border)',
              animationDelay: `${idx * 0.1}s`
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{kpi.label}</span>
              <span className={`text-[10px] font-bold ${kpi.delta.includes('+') ? 'text-accent' : kpi.delta.includes('-') ? 'text-accent3' : 'text-muted'}`}>
                {kpi.delta}
              </span>
            </div>
            {loading ? (
              <div className="h-9 w-16 bg-surface2 animate-pulse rounded my-2" />
            ) : (
              <div className="text-3xl font-syne font-bold mb-3" style={{ color: kpi.color }}>{kpi.value}</div>
            )}
            <div className="h-10 w-full overflow-hidden -mx-4 -mb-4 mt-2">
              <ResponsiveContainer width="112%" height="100%">
                <AreaChart data={kpi.sparkline.map(v => ({ v }))}>
                  <defs>
                    <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={kpi.color} stopOpacity={0.2}/>
                      <stop offset="100%" stopColor={kpi.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} fill={`url(#gradient-${idx})`} isAnimationActive={!loading} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_1fr] gap-6">
        
        {/* [Col 1] Task Status Donut */}
        <div className="rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-text">Task Status</h3>
            <div className="flex rounded bg-surface2 p-0.5 border border-border">
              <button className="px-2 py-0.5 text-[9px] font-bold bg-accent text-background rounded-sm">DONUT</button>
              <button className="px-2 py-0.5 text-[9px] font-bold text-muted hover:text-white">BAR</button>
            </div>
          </div>
          
          <div className="h-48 relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard?.statusData || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onMouseEnter={(_, index) => setDonutActiveIndex(index)}
                  onMouseLeave={() => setDonutActiveIndex(null)}
                >
                  {(dashboard?.statusData || []).map((entry, index) => {
                     const colors = ['#4f8fff', '#00e5c0', '#a78bfa', '#f9c74f'];
                     return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors[index % colors.length]} 
                          opacity={donutActiveIndex === null || donutActiveIndex === index ? 1 : 0.3}
                          className="transition-opacity duration-300"
                        />
                     );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-syne font-bold leading-none text-text">{stats.totalTasks || 0}</span>
              <span className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Total</span>
            </div>
          </div>

          <div className="space-y-3">
            {(dashboard?.statusData || []).map((status, index) => {
              const colors = ['#4f8fff', '#00e5c0', '#a78bfa', '#f9c74f'];
              const color = colors[index % colors.length];
              return (
                <div 
                  key={status.key} 
                  className="group cursor-pointer"
                  onMouseEnter={() => setDonutActiveIndex(index)}
                  onMouseLeave={() => setDonutActiveIndex(null)}
                  onClick={() => navigate(`/tasks?status=${status.key}`)}
                >
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className={`text-[11px] font-bold transition-colors capitalize ${donutActiveIndex === index ? 'text-text' : 'text-muted'}`}>{status.label}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted">{status.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${(status.value / (stats.totalTasks || 1)) * 100}%`, 
                        backgroundColor: color,
                        opacity: donutActiveIndex === null || donutActiveIndex === index ? 1 : 0.4
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* [Col 2] Velocity Chart */}
        <div className="rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-text">Team Velocity</h3>
              <p className="text-[10px] text-muted">Created vs Completed ({timeRange})</p>
            </div>
          </div>

          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dashboard?.tasksComparison || []}>
                 <defs>
                   <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--accent2)" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="var(--accent2)" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                 <XAxis 
                   dataKey="label" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'DM Mono' }}
                   dy={10}
                 />
                 <YAxis hide />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '10px', color: 'var(--text)' }}
                   itemStyle={{ padding: '2px 0' }}
                 />
                 <Area 
                   type="monotone" 
                   dataKey="created" 
                   stroke="var(--accent2)" 
                   strokeWidth={3} 
                   fillOpacity={1} 
                   fill="url(#colorCreated)" 
                   dot={{ r: 4, fill: 'var(--background)', stroke: 'var(--accent2)', strokeWidth: 2 }}
                   activeDot={{ r: 6, strokeWidth: 0 }}
                 />
                 <Area 
                   type="monotone" 
                   dataKey="completed" 
                   stroke="var(--accent)" 
                   strokeWidth={3} 
                   fillOpacity={1} 
                   fill="url(#colorCompleted)" 
                   dot={{ r: 4, fill: 'var(--background)', stroke: 'var(--accent)', strokeWidth: 2 }}
                   activeDot={{ r: 6, strokeWidth: 0 }}
                 />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* [Col 3] Heatmap */}
        <div className="rounded-2xl border p-6 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="mb-6">
            <h3 className="font-bold text-text">Task Density</h3>
            <p className="text-[10px] text-muted">Activity Heatmap</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-7 gap-2 mb-3">
              {HEATMAP_VALUES.map((val, i) => {
                const intensities = ['var(--surface2)', 'rgba(0, 229, 192, 0.2)', 'rgba(0, 229, 192, 0.45)', 'rgba(0, 229, 192, 0.7)', 'var(--accent)'];
                return (
                  <div 
                    key={i}
                    className="aspect-square rounded-[3px] cursor-help transition-all hover:scale-110 relative group"
                    style={{ backgroundColor: intensities[val] || intensities[4] }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface2 border border-border rounded text-[9px] text-text opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-xl">
                      Day {i+1}: {val} actions
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-6">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} className="text-[9px] text-muted text-center font-bold">{day}</div>
              ))}
            </div>

            <div className="mt-auto flex items-center gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[9px] text-muted font-bold">Less</span>
              <div className="flex flex-1 h-1.5 rounded-full overflow-hidden bg-surface2">
                <div className="flex-1 bg-[rgba(0,229,192,0.2)]" />
                <div className="flex-1 bg-[rgba(0,229,192,0.45)]" />
                <div className="flex-1 bg-[rgba(0,229,192,0.7)]" />
                <div className="flex-1 bg-[var(--accent)]" />
              </div>
              <span className="text-[9px] text-muted font-bold">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        
        {/* Recent Activity */}
        <div className="rounded-2xl border flex flex-col h-[400px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="p-6 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-text">Recent Activity</h3>
            <div className="flex gap-2">
              {['All', 'Assigned', 'Comments'].map(f => (
                <button 
                  key={f}
                  onClick={() => setActivityFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border ${activityFilter === f ? 'bg-accent/10 border-accent/20 text-accent' : 'border-border text-muted hover:border-muted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {filteredActivity.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted">
                  <span className="text-4xl mb-2 opacity-20">∅</span>
                  <p className="text-xs">No activity found</p>
               </div>
            ) : filteredActivity.map((item, idx) => {
              const colors = { comment: 'var(--accent)', assigned: 'var(--accent2)', updated: 'var(--accent4)', deleted: 'var(--accent3)' };
              const type = item.action.includes('comment') ? 'comment' : item.action.includes('assign') ? 'assigned' : 'updated';
              const color = colors[type];
              return (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-surface2 transition-all group">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-[10px] text-white" style={{ background: `linear-gradient(135deg, ${color}, var(--surface2))` }}>
                    {item.actor.name[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs text-text">{item.actor.name}</span>
                      <span className="text-[9px] text-muted font-mono">{relativeLabel(item.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-tight truncate">
                      {item.action.replaceAll('_', ' ')} <span className="text-text font-medium">{item.task?.title || item.project?.name}</span>
                    </p>
                  </div>
                  <div 
                    className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter"
                    style={{ backgroundColor: `${color}20`, color: color, border: `1px solid ${color}30` }}
                  >
                    {type}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Performance */}
        <div className="rounded-2xl border flex flex-col h-[400px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="p-6 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-text">Team Performance</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <div className="h-32 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.teamPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                    {(dashboard?.teamPerformance || []).map((entry, index) => {
                       const colors = ['var(--accent)', 'var(--accent4)', 'var(--accent3)', 'var(--accent5)'];
                       return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {(dashboard?.teamPerformance || []).map((member, idx) => {
                const colors = ['var(--accent)', 'var(--accent4)', 'var(--accent3)', 'var(--accent5)'];
                const color = colors[idx % colors.length];
                const maxVal = Math.max(...(dashboard?.teamPerformance || []).map(m => m.completed)) || 1;
                return (
                  <div key={member.memberId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface2 transition-all cursor-pointer active:scale-[0.98]" onClick={() => navigate(`/tasks?assignee=${member.memberId}`)}>
                    <div className="w-10 h-10 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${color}, var(--surface2))` }} />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-text">{member.name}</span>
                        <span className="text-[10px] text-muted">Member</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(member.completed / maxVal) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border font-mono font-bold text-xs text-text" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface2)' }}>
                      {member.completed}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
