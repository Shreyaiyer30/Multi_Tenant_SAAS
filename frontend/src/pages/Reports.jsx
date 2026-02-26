import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/context/TenantContext";

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const { tenant } = useTenant();

  useEffect(() => {
    api
      .get("reporting/stats/?range=week")
      .then((res) => {
        setStats(res.data);
        setError("");
      })
      .catch((err) => {
        setStats(null);
        setError(err?.response?.status === 403 ? "Reports require admin/owner role on Pro plan." : "Unable to load reports.");
      });
  }, [tenant]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="secondary">Export CSV</Button>
          <Button variant="secondary">Export PDF</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Reporting Overview</CardTitle></CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tasks created: {stats?.tasks_created ?? 0} · completed: {stats?.tasks_completed ?? 0} · overdue: {stats?.tasks_overdue ?? 0}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
