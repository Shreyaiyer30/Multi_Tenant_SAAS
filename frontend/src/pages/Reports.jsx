import { useEffect, useState } from "react";
import api from "@/api/api";
import { useTenant } from "@/context/TenantContext";

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("week");
  const [exporting, setExporting] = useState("");
  const { tenant } = useTenant();

  useEffect(() => {
    setLoading(true);
    api
      .get(`reporting/stats/?range=${range}`)
      .then((res) => {
        setStats(res.data);
        setError("");
      })
      .catch((err) => {
        setStats(null);
        setError(err?.response?.status === 403 ? "Reports require admin role or upgrade to Pro plan." : "Unable to load reports.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tenant, range]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const fileName = type === "csv" ? "tasks_export.csv" : "tasks_report.pdf";
      const contentType = type === "csv" ? "text/csv" : "application/pdf";
      const { data } = await api.get(`reporting/export/${type}/`, { responseType: "blob" });
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Unable to export report.");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="p-6 space-y-8 page-enter h-full flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-text font-syne font-bold text-3xl tracking-tight">Analytics</h1>
          <p className="text-muted mt-1 text-xs font-medium uppercase tracking-[0.2em]">Insights / Performance / Reports</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="bg-surface text-text h-11 appearance-none rounded-xl border border-border px-4 text-sm font-bold focus:border-accent focus:outline-none"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="quarter">Past 90 Days</option>
          </select>
          <div className="flex gap-2">
             <button 
                disabled={exporting === "csv"}
                onClick={() => handleExport("csv")}
                className="bg-surface2 text-text border-border hover:border-accent2 flex-1 h-11 rounded-xl border px-6 font-syne font-bold text-xs transition-all disabled:opacity-50"
             >
                {exporting === "csv" ? "Preparing..." : "Export CSV"}
             </button>
             <button 
                disabled={exporting === "pdf"}
                onClick={() => handleExport("pdf")}
                className="bg-surface2 text-text border-border hover:border-accent5 flex-1 h-11 rounded-xl border px-6 font-syne font-bold text-xs transition-all disabled:opacity-50"
             >
                {exporting === "pdf" ? "Preparing..." : "Export PDF"}
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <div 
            className="animate-fade-up rounded-3xl border p-8"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
         >
            <h3 className="text-text font-syne mb-8 font-bold">Reporting Overview</h3>
            
            {loading ? (
               <div className="space-y-6">
                  {[1,2,3].map(i => <div key={i} className="bg-surface2 h-12 w-full animate-pulse rounded-2xl" />)}
               </div>
            ) : error ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="mb-4 text-4xl opacity-20">📊</span>
                  <p className="text-accent3 text-sm font-bold">{error}</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-surface2 flex flex-col items-center justify-center rounded-2xl border border-border p-6 transition-all hover:border-accent">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Created</span>
                     <span className="text-text font-syne mt-2 text-3xl font-bold">{stats?.tasks_created ?? 0}</span>
                  </div>
                  <div className="bg-surface2 flex flex-col items-center justify-center rounded-2xl border border-border p-6 transition-all hover:border-accent2">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Completed</span>
                     <span className="text-accent2 font-syne mt-2 text-3xl font-bold">{stats?.tasks_completed ?? 0}</span>
                  </div>
                  <div className="bg-surface2 flex flex-col items-center justify-center rounded-2xl border border-border p-6 transition-all hover:border-accent3">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Overdue</span>
                     <span className="text-accent3 font-syne mt-2 text-3xl font-bold">{stats?.tasks_overdue ?? 0}</span>
                  </div>
               </div>
            )}
         </div>

         <div 
            className="animate-fade-up rounded-3xl border p-8"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', animationDelay: '0.1s' }}
         >
            <h3 className="text-text font-syne mb-6 font-bold">Performance Insight</h3>
            <p className="text-muted text-sm leading-relaxed">
               Based on the <span className="text-text font-bold">{range}</span> filter, your team has a completion rate of 
               <span className="text-accent font-dm-mono mx-1 font-bold">
                  {stats?.tasks_created > 0 ? Math.round((stats.tasks_completed / stats.tasks_created) * 100) : 0}%
               </span>
               of all generated work items.
            </p>
            <div className="mt-8 space-y-4">
               <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span className="text-muted">Efficiency Score</span>
                  <span className="text-accent">Optimized</span>
               </div>
               <div className="bg-surface2 h-2 w-full overflow-hidden rounded-full">
                  <div className="bg-accent h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(0,229,192,0.5)]" />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
