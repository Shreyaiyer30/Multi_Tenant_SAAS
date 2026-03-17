import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/context/TenantContext";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
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
      if (read) {
        return;
      }
      await api.post("notifications/mark-read/", { ids: [id] });
      setItems((prev) => {
        const next = prev.map((it) => (it.id === id ? { ...it, is_read: true } : it));
        broadcastUnreadCount(next);
        return next;
      });
    } catch {
      // no-op to keep list stable
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
      // no-op to keep list stable
    }
  };

  const unread = useMemo(() => items.filter((i) => !i.is_read), [items]);
  const mentions = useMemo(() => items.filter((i) => i.type === "mention"), [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        <Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-2 pt-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : items.map((it) => <Row key={it.id} item={it} onToggle={mark} onOpen={navigate} />)}
          </TabsContent>
          <TabsContent value="unread" className="space-y-2 pt-3">{unread.map((it) => <Row key={it.id} item={it} onToggle={mark} onOpen={navigate} />)}</TabsContent>
          <TabsContent value="mentions" className="space-y-2 pt-3">{mentions.map((it) => <Row key={it.id} item={it} onToggle={mark} onOpen={navigate} />)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Row({ item, onToggle, onOpen }) {
  const taskId = item?.payload?.task_id || item?.task?.id;
  const projectId = item?.payload?.project_id || item?.task?.project_id;

  const openTarget = () => {
    if (projectId) {
      onOpen(`/projects/${projectId}/board`);
      return;
    }
    if (taskId) {
      onOpen("/tasks");
    }
  };

  return (
    <div className={`flex items-center justify-between rounded-md border p-3 ${!item.is_read ? "bg-muted/40" : ""}`}>
      <p className="text-sm">{item.message}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={openTarget}>Open</Button>
        <Button variant="ghost" size="sm" onClick={() => onToggle(item.id, item.is_read)}>{item.is_read ? "Read" : "Mark read"}</Button>
      </div>
    </div>
  );
}
