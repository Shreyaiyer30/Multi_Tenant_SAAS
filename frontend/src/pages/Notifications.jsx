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

  const load = async () => {
    if (!tenant) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("notifications/");
      setItems(data.results || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenant]);

  const mark = async (id, read) => {
    try {
      const mode = read ? "unread" : "read";
      await api.post(`notifications/${mode}/`, { ids: [id] });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, is_read: !read } : it)));
    } catch {
      // no-op to keep list stable
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("notifications/read/", { all: true });
      setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    } catch {
      // no-op to keep list stable
    }
  };

  const unread = useMemo(() => items.filter((i) => !i.is_read), [items]);
  const mentions = useMemo(() => items.filter((i) => i.event_type === "mention"), [items]);

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
      <p className="text-sm">{item.body}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={openTarget}>Open</Button>
        <Button variant="ghost" size="sm" onClick={() => onToggle(item.id, item.is_read)}>{item.is_read ? "Mark unread" : "Mark read"}</Button>
      </div>
    </div>
  );
}
