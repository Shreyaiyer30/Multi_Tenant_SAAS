import { useEffect, useState } from "react";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/context/TenantContext";

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState("");
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const { tenant } = useTenant();

  const loadPlan = () => {
    api
      .get("billing/plan/")
      .then((res) => {
        setBilling(res.data);
        setError("");
      })
      .catch((err) => {
        setBilling(null);
        setError(err?.response?.status === 403 ? "Only workspace owner can access billing." : "Unable to load billing.");
      });
  };

  useEffect(() => {
    loadPlan();
  }, [tenant]);

  const upgrade = async () => {
    setLoadingUpgrade(true);
    try {
      const { data } = await api.post("billing/upgrade/", { plan: "pro" });
      if (data?.provider === "razorpay" && window.Razorpay && data.key_id && data.order_id) {
        const rz = new window.Razorpay({
          key: data.key_id,
          order_id: data.order_id,
          amount: data.amount,
          currency: data.currency,
          name: "TaskSaaS",
          description: "Upgrade to Pro",
          handler: async () => {
            await loadPlan();
          }
        });
        rz.open();
      } else {
        await loadPlan();
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Upgrade flow failed. Check provider configuration.");
    } finally {
      setLoadingUpgrade(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {billing ? (
            <p className="text-sm text-muted-foreground">
              {billing.plan?.toUpperCase() || "FREE"} plan · status: {billing.status || "inactive"}
            </p>
          ) : null}
          <Button disabled={!billing || !billing.can_upgrade || loadingUpgrade} onClick={upgrade}>
            {loadingUpgrade ? "Processing..." : "Upgrade to Pro"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
