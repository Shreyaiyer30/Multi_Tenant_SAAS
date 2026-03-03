import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        setError(err?.response?.status === 403 ? "Reports require admin/owner role on Pro plan." : "Unable to load reports.");
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="h-10 rounded-xl border border-border/80 bg-background/80 px-3 text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
          </select>
          <Button variant="secondary" disabled={exporting === "csv"} onClick={() => handleExport("csv")}>
            {exporting === "csv" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button variant="secondary" disabled={exporting === "pdf"} onClick={() => handleExport("pdf")}>
            {exporting === "pdf" ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Reporting Overview</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          ) : error ? (
            <p className="text-sm text-danger-foreground">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tasks created: {stats?.tasks_created ?? 0} - completed: {stats?.tasks_completed ?? 0} - overdue: {stats?.tasks_overdue ?? 0}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
