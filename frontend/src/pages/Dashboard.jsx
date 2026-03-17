import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart,
  Cell, PieChart, Pie
} from 'recharts';
import { useTenant } from "@/context/TenantContext";
import { getDashboardBundle, DASHBOARD_DUMMY_DATA } from "@/services/dashboardService";
import { cn } from "@/lib";
import {
  Folder, CheckSquare, CheckCircle2, BarChart2,
  AlertCircle, Download, Plus, ChevronRight
} from "lucide-react";

// ─── HELPERS ────────────────────────────────────────────────
function relativeLabel(isoDate) {
  if (!isoDate) return "Just now";
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_COLORS = ['#4f8fff', '#00e5c0', '#a78bfa', '#f9c74f'];
const TEAM_COLORS   = ['#00e5c0', '#f9c74f', '#ff5f6b', '#a78bfa'];
const HEATMAP_VALS  = [0,1,2,3,4,3,2,0,1,0,4,2,1,0,2,3,4,1,0,2,3,1,0,2,4,1,3,0];
const HEATMAP_DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── BADGE HELPER ───────────────────────────────────────────
function activityBadge(action = '') {
  if (action.includes('comment'))  return { label: 'Comment',  color: '#00e5c0', bg: 'rgba(0,229,192,0.08)'   };
  if (action.includes('unassign')) return { label: 'Removed',  color: '#4d6a85', bg: 'transparent'            };
  if (action.includes('assign'))   return { label: 'Assigned', color: '#4f8fff', bg: 'rgba(79,143,255,0.08)'  };
  if (action.includes('update'))   return { label: 'Updated',  color: '#f9c74f', bg: 'rgba(249,199,79,0.08)'  };
  if (action.includes('member'))   return { label: 'Member',   color: '#4f8fff', bg: 'rgba(79,143,255,0.08)'  };
  return                                   { label: 'Activity', color: '#4d6a85', bg: 'transparent'            };
}

// ─── CUSTOM RECHARTS TOOLTIP ────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface2,#121d2e)', border: '1px solid var(--border,#1a2d44)',
      borderRadius: 8, padding: '8px 12px', fontSize: 9,
      fontFamily: 'DM Mono,monospace', color: 'var(--text,#ddeeff)',
      boxShadow: '0 8px 24px rgba(0,0,0,.45)',
    }}>
      <p style={{ color: 'var(--muted,#4d6a85)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── SPARKLINE ──────────────────────────────────────────────
const Sparkline = ({ data, color }) => (
  <div style={{ height: 28, margin: '0 -4px' }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.map(v => ({ v }))}>
        <defs>
          <linearGradient id={`sg${color.replace(/[^a-z0-9]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg${color.replace(/[^a-z0-9]/gi,'')})`}
          dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

// ─── CARD ───────────────────────────────────────────────────
const Card = ({ children, style = {}, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'var(--surface,#0d1520)',
      border: '1px solid var(--border,#1a2d44)',
      borderRadius: 10, padding: '20px 22px',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color .2s',
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── ICON BUTTON ────────────────────────────────────────────
const IconBtn = ({ children, onClick, primary = false }) => (
  <button
    onClick={onClick}
    style={{
      height: 32, padding: '0 16px', borderRadius: 8, cursor: 'pointer',
      fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
      letterSpacing: '0.15em', fontFamily: 'DM Mono,monospace',
      display: 'flex', alignItems: 'center', gap: 6,
      border: primary ? 'none' : '1px solid var(--border,#1a2d44)',
      background: primary ? 'var(--accent,#00e5c0)' : 'rgba(13,21,32,.5)',
      color: primary ? 'var(--bg,#070b0f)' : 'var(--muted,#4d6a85)',
      transition: 'all .2s',
      boxShadow: primary ? '0 4px 16px rgba(0,229,192,.25)' : 'none',
    }}
    onMouseEnter={e => {
      if (primary) { e.currentTarget.style.background = '#00ffd4'; e.currentTarget.style.transform = 'translateY(-1px)'; }
      else { e.currentTarget.style.borderColor = 'var(--accent,#00e5c0)'; e.currentTarget.style.color = 'var(--accent,#00e5c0)'; }
    }}
    onMouseLeave={e => {
      if (primary) { e.currentTarget.style.background = 'var(--accent,#00e5c0)'; e.currentTarget.style.transform = 'translateY(0)'; }
      else { e.currentTarget.style.borderColor = 'var(--border,#1a2d44)'; e.currentTarget.style.color = 'var(--muted,#4d6a85)'; }
    }}
  >
    {children}
  </button>
);

// ─── PILL TABS ───────────────────────────────────────────────
const PillTabs = ({ options, value, onChange, accentMode = false }) => (
  <div style={{
    display: 'flex', padding: 2, borderRadius: 5,
    background: 'rgba(18,29,46,.5)',
    border: '1px solid var(--border,#1a2d44)',
  }}>
    {options.map(o => {
      const active = value === o;
      return (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: '2px 8px', borderRadius: 3, fontSize: 8, fontWeight: 900,
            textTransform: 'uppercase', cursor: 'pointer', border: 'none',
            fontFamily: 'DM Mono,monospace', transition: 'all .2s',
            background: active ? (accentMode ? 'rgba(0,229,192,.15)' : 'var(--accent,#00e5c0)') : 'transparent',
            color: active ? (accentMode ? 'var(--accent,#00e5c0)' : 'var(--bg,#070b0f)') : 'var(--muted,#4d6a85)',
          }}
        >{o}</button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user }      = useAuth();
  const { tenant }    = useTenant();
  const navigate      = useNavigate();
  const { timeRange } = useOutletContext();

  const [dashboard,      setDashboard]      = useState(() => DASHBOARD_DUMMY_DATA["7d"]);
  const [loading,        setLoading]        = useState(false);
  const [activityFilter, setActivityFilter] = useState('All');
  const [chartPeriod,    setChartPeriod]    = useState('Week');
  const [statusView,     setStatusView]     = useState('Donut');
  const [selectedKpi,    setSelectedKpi]    = useState(null);

  // ── fetch ──
  useEffect(() => {
    if (!tenant) return;
    let active = true;
    setLoading(true);
    getDashboardBundle(timeRange)
      .then(p  => { if (active) setDashboard(p); })
      .catch(() => { if (active) setDashboard(DASHBOARD_DUMMY_DATA[timeRange] || DASHBOARD_DUMMY_DATA["7d"]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenant, timeRange]);

  const stats = dashboard?.stats || {};

  // ── KPIs ──
  const kpis = useMemo(() => [
    { label: 'TOTAL PROJECTS',  value: stats.totalProjects,           change: '— unchanged',       icon: Folder,       color: '#4f8fff', sparkline: [5,8,7,9,8,10,8]        },
    { label: 'TOTAL TASKS',     value: stats.totalTasks,              change: '↓ -1 this period',  icon: CheckSquare,  color: '#00e5c0', sparkline: [10,15,12,18,14,25,20]   },
    { label: 'COMPLETED',       value: stats.completedTasks,          change: '↑ 33% rate',        icon: CheckCircle2, color: '#a78bfa', sparkline: [2,5,3,8,4,10,12]        },
    { label: 'COMPLETION RATE', value: `${stats.completionRate ?? 0}%`, change: '— on track',      icon: BarChart2,    color: '#f9c74f', sparkline: [20,25,22,30,28,35,33]   },
    { label: 'OVERDUE TASKS',   value: stats.overdueTasks,            change: '↑ No delays!',      icon: AlertCircle,  color: '#ff5f6b', sparkline: [5,4,3,2,1,0,0]          },
  ], [stats]);

  // ── team ──
  const teamPerfs = useMemo(() =>
    (dashboard?.teamPerformance || []).map((m, i) => ({
      ...m,
      initials: m.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase(),
      color: TEAM_COLORS[i % 4],
    }))
  , [dashboard?.teamPerformance]);

  // ── filtered activity ──
  const filteredActivity = useMemo(() => {
    const all = dashboard?.recentActivity || [];
    if (activityFilter === 'Assigned') return all.filter(a => a.action?.includes('assign'));
    if (activityFilter === 'Comments') return all.filter(a => a.action?.includes('comment'));
    return all;
  }, [dashboard?.recentActivity, activityFilter]);

  // ─────────────────────────────────────────────────────────
  return (
    <div
      className="p-6 space-y-5 custom-scrollbar"
      style={{ background: 'var(--bg,#070b0f)', minHeight: '100vh', position: 'relative' }}
    >
      {/* grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,229,192,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,192,.025) 1px,transparent 1px)',
        backgroundSize: '44px 44px',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="space-y-5">

        {/* ── HEADER ── */}
        <div className="flex items-end justify-between px-1">
          <div>
            {/* breadcrumb */}
            <div className="flex items-center gap-1.5 mb-3">
              {['Workspace', 'Task Management'].map((crumb, i) => (
                <span key={crumb} className="flex items-center gap-1.5">
                  <span style={{ fontSize: 9, color: 'var(--muted,#4d6a85)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'DM Mono,monospace', cursor: 'pointer' }}>{crumb}</span>
                  <ChevronRight size={9} style={{ color: 'var(--border,#1a2d44)' }} />
                </span>
              ))}
              <span style={{ fontSize: 9, color: 'var(--accent,#00e5c0)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>Dashboard</span>
            </div>

            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent,#00e5c0)', textTransform: 'uppercase', letterSpacing: '0.3em', fontFamily: 'DM Mono,monospace', marginBottom: 6 }}>
              Welcome Back, {user?.first_name || user?.display_name || 'Agent'}
            </div>
            <h1 style={{ fontSize: 42, fontFamily: 'Syne,sans-serif', fontWeight: 900, color: 'var(--text,#ddeeff)', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: 1 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted,#4d6a85)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'DM Mono,monospace', opacity: 0.5 }}>
              Track delivery velocity, task flow, and team output in one place.
            </p>
          </div>

          <div className="flex gap-2">
            <IconBtn><Download size={12} /> Export</IconBtn>
            <IconBtn primary onClick={() => navigate('/tasks')}><Plus size={12} strokeWidth={3} /> New Task</IconBtn>
          </div>
        </div>

        {/* ── KPI ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[14px]">
          {kpis.map((kpi, idx) => {
            const Icon     = kpi.icon;
            const selected = selectedKpi === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedKpi(selected ? null : idx)}
                style={{
                  background: 'var(--surface,#0d1520)',
                  border: `1px solid ${selected ? kpi.color : 'var(--border,#1a2d44)'}`,
                  borderRadius: 10, padding: '16px 18px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  height: 128, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transition: 'all .25s',
                  boxShadow: selected ? `0 0 0 2px ${kpi.color}25, 0 8px 28px ${kpi.color}18` : 'none',
                }}
                onMouseEnter={e => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = kpi.color;
                    e.currentTarget.style.transform   = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow   = `0 8px 28px ${kpi.color}14`;
                  }
                }}
                onMouseLeave={e => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = 'var(--border,#1a2d44)';
                    e.currentTarget.style.transform   = 'translateY(0)';
                    e.currentTarget.style.boxShadow   = 'none';
                  }
                }}
              >
                {/* glow orb */}
                <div style={{ position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%', background: kpi.color, opacity: 0.07, pointerEvents:'none' }} />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 style={{ fontSize: 9, fontWeight: 900, color: 'var(--muted,#4d6a85)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'DM Mono,monospace', opacity: 0.7 }}>
                      {kpi.label}
                    </h4>
                    <Icon size={11} style={{ color: kpi.color, opacity: 0.45, flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 28, fontFamily: 'Syne,sans-serif', fontWeight: 900, color: kpi.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {kpi.value ?? '—'}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent,#00e5c0)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'DM Mono,monospace', marginBottom: 4 }}>
                    {kpi.change}
                  </p>
                  <Sparkline data={kpi.sparkline} color={kpi.color} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── ROW 3 ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_1fr] gap-[18px]">

          {/* Tasks by Status */}
          <Card style={{ height: 280, gap: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize: 10, fontWeight: 900, color: 'var(--text,#ddeeff)', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'DM Mono,monospace' }}>
                Tasks by Status
              </h3>
              <PillTabs options={['Donut','Bar']} value={statusView} onChange={setStatusView} />
            </div>

            <div className="flex items-center flex-1" style={{ gap: 20 }}>
              {/* donut */}
              <div style={{ width: 110, height: 110, position: 'relative', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dashboard?.statusData || []} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value">
                      {(dashboard?.statusData || []).map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:20, fontFamily:'Syne,sans-serif', fontWeight:900, color:'var(--text,#ddeeff)' }}>{stats.totalTasks ?? 0}</span>
                  <span style={{ fontSize:8, color:'var(--muted,#4d6a85)', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace', opacity:0.5 }}>tasks</span>
                </div>
              </div>

              {/* legend */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                {(dashboard?.statusData || []).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ width:6, height:6, borderRadius:'50%', background: STATUS_COLORS[idx], flexShrink:0 }} />
                      <span style={{ fontSize:9, fontWeight:700, color:'var(--muted2,#7a9ab8)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'DM Mono,monospace' }}>{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ width:48, height:3, background:'var(--surface2,#121d2e)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${stats.totalTasks ? (s.value/stats.totalTasks)*100 : 0}%`, background: STATUS_COLORS[idx], borderRadius:2, transition:'width .5s' }} />
                      </div>
                      <span style={{ fontSize:9, fontWeight:900, color:'var(--text,#ddeeff)', fontFamily:'DM Mono,monospace', minWidth:12, textAlign:'right' }}>{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Velocity */}
          <Card style={{ height: 280, gap: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize:10, fontWeight:900, color:'var(--text,#ddeeff)', textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace' }}>
                Velocity
              </h3>
              <PillTabs options={['Week','Month','Quarter']} value={chartPeriod} onChange={setChartPeriod} accentMode />
            </div>

            <div className="flex items-center gap-4 mb-3">
              {[['Created','#4f8fff'],['Completed','#00e5c0']].map(([l,c]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div style={{ width:6, height:6, borderRadius:'50%', background:c }} />
                  <span style={{ fontSize:8, fontWeight:900, color:c, textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace' }}>{l}</span>
                </div>
              ))}
            </div>

            <div style={{ flex:1, marginLeft:-16, marginRight:-16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard?.tasksComparison || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border,#1a2d44)" opacity={0.3} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill:'var(--muted,#4d6a85)', fontSize:8, fontFamily:'DM Mono' }} dy={10} />
                  <YAxis hide domain={[0,'dataMax + 1']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="created"   stroke="#4f8fff" strokeWidth={2} dot={{ r:3, fill:'#4f8fff', strokeWidth:0 }} activeDot={{ r:5 }} />
                  <Line type="monotone" dataKey="completed" stroke="#00e5c0" strokeWidth={2} dot={{ r:3, fill:'#00e5c0', strokeWidth:0 }} activeDot={{ r:5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Heatmap */}
          <Card style={{ height: 280, gap: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize:10, fontWeight:900, color:'var(--text,#ddeeff)', textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace' }}>
                Activity Heatmap
              </h3>
              <span style={{ fontSize:9, fontWeight:700, color:'var(--muted,#4d6a85)', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'DM Mono,monospace', opacity:0.5 }}>Last 28 days</span>
            </div>

            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              {/* cells */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
                {HEATMAP_VALS.map((val,i) => (
                  <div
                    key={i}
                    title={`${HEATMAP_DAYS[i%7]}: ${val} tasks`}
                    style={{
                      aspectRatio:'1', borderRadius:3,
                      background:'var(--accent,#00e5c0)',
                      opacity: val===0 ? 0.05 : val*0.22,
                      cursor:'pointer', transition:'transform .15s, opacity .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.3)'; e.currentTarget.style.opacity='1'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.opacity=val===0?'0.05':String(val*0.22); }}
                  />
                ))}
              </div>

              {/* day labels */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:14 }}>
                {HEATMAP_DAYS.map(d => (
                  <div key={d} style={{ fontSize:8, fontWeight:900, color:'var(--muted,#4d6a85)', textTransform:'uppercase', textAlign:'center', fontFamily:'DM Mono,monospace', opacity:0.4 }}>{d}</div>
                ))}
              </div>

              {/* legend */}
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, borderTop:'1px solid rgba(26,45,68,.4)' }}>
                <span style={{ fontSize:8, fontWeight:700, color:'var(--muted,#4d6a85)', textTransform:'uppercase', fontFamily:'DM Mono,monospace' }}>Less</span>
                <div style={{ display:'flex', gap:3 }}>
                  {[0.05,0.22,0.44,0.66,1].map(o => (
                    <div key={o} style={{ width:10, height:10, borderRadius:2, background:'var(--accent,#00e5c0)', opacity:o }} />
                  ))}
                </div>
                <span style={{ fontSize:8, fontWeight:700, color:'var(--muted,#4d6a85)', textTransform:'uppercase', fontFamily:'DM Mono,monospace' }}>More</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── ROW 2: Activity + Team ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] pb-6">

          {/* Recent Activity */}
          <Card style={{ height: 400, gap: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize:12, fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text,#ddeeff)', textTransform:'uppercase', letterSpacing:'0.02em' }}>
                Recent Activity
              </h3>
              <div style={{ display:'flex', gap:6 }}>
                {['All','Assigned','Comments'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActivityFilter(f)}
                    style={{
                      padding:'4px 12px', borderRadius:20, fontSize:8, fontWeight:900,
                      textTransform:'uppercase', cursor:'pointer', fontFamily:'DM Mono,monospace',
                      border:'none', transition:'all .2s',
                      background: activityFilter===f ? 'var(--accent,#00e5c0)' : 'rgba(18,29,46,.5)',
                      color: activityFilter===f ? 'var(--bg,#070b0f)' : 'var(--muted,#4d6a85)',
                    }}
                  >{f}</button>
                ))}
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto', maxHeight:300 }} className="custom-scrollbar">
              {filteredActivity.length > 0 ? filteredActivity.map((item, idx) => {
                const initials = (item.actor?.name || 'S').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                const badge    = activityBadge(item.action || '');
                return (
                  <div
                    key={idx}
                    style={{
                      display:'flex', alignItems:'flex-start', gap:11,
                      padding:'10px 0',
                      borderBottom: idx < filteredActivity.length-1 ? '1px solid rgba(26,45,68,.3)' : 'none',
                      cursor:'pointer', transition:'all .18s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background   = 'rgba(255,255,255,.025)';
                      e.currentTarget.style.padding      = '10px 6px';
                      e.currentTarget.style.borderRadius = '6px';
                      e.currentTarget.style.margin       = '0 -6px';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background   = 'transparent';
                      e.currentTarget.style.padding      = '10px 0';
                      e.currentTarget.style.borderRadius = '0';
                      e.currentTarget.style.margin       = '0';
                    }}
                  >
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#4f8fff,#00e5c0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff', flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:11, color:'var(--muted2,#7a9ab8)', lineHeight:1.5, fontFamily:'DM Mono,monospace' }}>
                        <strong style={{ color:'var(--text,#ddeeff)', fontWeight:600 }}>{item.actor?.name}</strong>
                        {' '}{(item.action||'').replaceAll('_',' ')}{' '}
                        <strong style={{ color:'var(--accent,#00e5c0)', fontWeight:600 }}>{item.task?.title || item.project?.name}</strong>
                      </p>
                      <span style={{ fontSize:9, color:'var(--muted,#4d6a85)', fontFamily:'DM Mono,monospace', display:'block', marginTop:2, opacity:.6 }}>
                        {relativeLabel(item.created_at)}
                      </span>
                    </div>
                    <div style={{
                      fontSize:9, padding:'2px 8px', borderRadius:4, flexShrink:0,
                      color: badge.color, background: badge.bg,
                      border: `1px solid ${badge.color}30`,
                      fontWeight:700, fontFamily:'DM Mono,monospace', textTransform:'uppercase',
                    }}>
                      {badge.label}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', opacity:.2, padding:40 }}>
                  <span style={{ fontSize:36, marginBottom:8 }}>📡</span>
                  <p style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace', color:'var(--muted,#4d6a85)' }}>No activity detected</p>
                </div>
              )}
            </div>
          </Card>

          {/* Team Performance */}
          <Card style={{ height: 400, gap: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontSize:12, fontFamily:'Syne,sans-serif', fontWeight:700, color:'var(--text,#ddeeff)', textTransform:'uppercase', letterSpacing:'0.02em' }}>
                  Team Performance
                </h3>
                <p style={{ fontSize:8, fontWeight:900, color:'var(--muted,#4d6a85)', textTransform:'uppercase', letterSpacing:'0.2em', marginTop:2, fontFamily:'DM Mono,monospace', opacity:.5 }}>
                  Operational Stats
                </p>
              </div>
              <span style={{ fontSize:9, fontWeight:900, color:'var(--accent,#00e5c0)', textTransform:'uppercase', letterSpacing:'0.15em', fontFamily:'DM Mono,monospace' }}>This week</span>
            </div>

            <div style={{ height:120, marginBottom:28, marginLeft:-8, marginRight:-8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerfs}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border,#1a2d44)" opacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'var(--muted,#4d6a85)', fontSize:8, fontFamily:'DM Mono' }} dy={10} />
                  <YAxis hide domain={[0,6]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="completed" radius={[4,4,0,0]} barSize={40}>
                    {teamPerfs.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.75} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }} className="custom-scrollbar">
              {teamPerfs.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'8px 10px', borderRadius:7,
                    background:'rgba(18,29,46,.2)',
                    border:'1px solid rgba(26,45,68,.25)',
                    cursor:'pointer', transition:'all .18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=`rgba(18,29,46,.45)`; e.currentTarget.style.borderColor=`${m.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(18,29,46,.2)'; e.currentTarget.style.borderColor='rgba(26,45,68,.25)'; }}
                >
                  <div style={{ width:30, height:30, borderRadius:'50%', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'var(--bg,#070b0f)', flexShrink:0 }}>
                    {m.initials}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize:10, fontWeight:700, color:'var(--text,#ddeeff)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</span>
                      <span style={{ fontSize:9, fontWeight:900, color:m.color, fontFamily:'DM Mono,monospace', background:`${m.color}14`, padding:'2px 7px', borderRadius:4 }}>{m.completed}</span>
                    </div>
                    <div style={{ height:3, width:70, background:'var(--bg,#070b0f)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(m.completed/6)*100}%`, background:m.color, borderRadius:2, transition:'width .5s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
