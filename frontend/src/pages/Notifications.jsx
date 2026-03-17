import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { useTenant } from "@/context/TenantContext";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const broadcastUnreadCount = (nextItems, fallbackUnreadCount = null) => {
    const unread_count =
      typeof fallbackUnreadCount === "number"
        ? fallbackUnreadCount
        : nextItems.filter((item) => !item.is_read).length;
    window.dispatchEvent(new CustomEvent("notifications-updated", { detail: { unread_count } }));
  };

  const load = async () => {
    if (!tenant) {
      setItems([]);
      broadcastUnreadCount([], 0);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("notifications/");
      const results = data.results || [];
      setItems(results);
      broadcastUnreadCount(results, Number(data?.unread_count ?? 0));
    } catch {
      setItems([]);
      broadcastUnreadCount([], 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenant]);

  const mark = async (id, read) => {
    try {
      if (read) return;
      await api.post("notifications/mark-read/", { ids: [id] });
      setItems((prev) => {
        const next = prev.map((it) => (it.id === id ? { ...it, is_read: true } : it));
        broadcastUnreadCount(next);
        return next;
      });
    } catch {
      // no-op
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("notifications/mark-all-read/");
      setItems((prev) => {
        const next = prev.map((it) => ({ ...it, is_read: true }));
        broadcastUnreadCount(next, 0);
        return next;
      });
    } catch {
      // no-op
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === "unread") return items.filter((i) => !i.is_read);
    if (activeTab === "mentions") return items.filter((i) => i.type === "mention");
    return items;
  }, [items, activeTab]);

  return (
    <div className="p-6 space-y-8 page-enter h-full flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-text font-syne font-bold text-3xl tracking-tight">Notifications</h1>
          <p className="text-muted mt-1 text-xs font-medium uppercase tracking-[0.2em]">Workspace / Activity / Notifications</p>
        </div>
        <button 
          onClick={markAllRead}
          className="bg-surface2 text-text border-border hover:border-accent flex h-11 items-center gap-2 rounded-xl border px-6 font-syne font-bold text-xs transition-all active:scale-95"
        >
          <span>✓</span> Mark All as Read
        </button>
      </div>

      <div 
        className="flex-1 rounded-3xl border overflow-hidden flex flex-col animate-fade-up"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="border-b p-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex bg-surface2 rounded-xl p-1 gap-1 border border-border">
            {["all", "unread", "mentions"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? "bg-accent text-background shadow-[0_0_15px_rgba(0,229,192,0.3)]" 
                    : "text-muted hover:text-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest px-4">
            {filteredItems.length} Total
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="bg-surface2 h-20 w-full animate-pulse rounded-2xl" />)}
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((it, idx) => (
              <div 
                key={it.id} 
                className="group animate-fade-up relative flex items-center justify-between rounded-2xl border p-5 transition-all hover:scale-[1.01] hover:border-accent/30"
                style={{ 
                  backgroundColor: it.is_read ? 'var(--surface2)' : 'var(--surface)', 
                  borderColor: it.is_read ? 'var(--border)' : 'var(--accent)',
                  animationDelay: `${idx * 0.05}s`
                }}
              >
                {!it.is_read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-accent" />
                )}
                
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      it.type === 'mention' ? 'border-accent5 text-accent5' : 'border-border text-muted'
                    }`}>
                      {it.type || 'system'}
                    </span>
                    <span className="text-muted font-dm-mono text-[10px]">Just now</span>
                  </div>
                  <p className={`font-syne text-sm leading-relaxed ${it.is_read ? 'text-text' : 'text-accent font-bold'}`}>
                    {it.message}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      const taskId = it?.payload?.task_id || it?.task?.id;
                      const projectId = it?.payload?.project_id || it?.task?.project_id;
                      if (projectId) navigate(`/projects/${projectId}/board`);
                      else if (taskId) navigate("/tasks");
                    }}
                    className="h-10 px-4 rounded-lg bg-surface2 border border-border text-[10px] font-bold uppercase tracking-widest text-text hover:border-accent2 transition-all"
                  >
                    View
                  </button>
                  {!it.is_read && (
                    <button 
                      onClick={() => mark(it.id, it.is_read)}
                      className="h-10 w-10 flex items-center justify-center rounded-lg bg-surface2 border border-border text-muted hover:text-accent transition-all"
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-muted">
              <span className="text-6xl mb-4 opacity-10">🔔</span>
              <h3 className="font-syne font-bold text-lg">All caught up!</h3>
              <p className="text-xs">No new notifications in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
