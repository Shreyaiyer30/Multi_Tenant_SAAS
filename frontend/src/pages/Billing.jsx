import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const { tenant } = useTenant();
  const { user, refreshUser } = useAuth();

  const currentWorkspace = useMemo(
    () => (user?.workspaces || []).find((ws) => ws.slug === tenant),
    [user, tenant]
  );
  const isOwner = currentWorkspace?.role === "owner";

  const loadBilling = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const { data } = await api.get("billing/plans/");
      setPlans(data.plans || []);
      setSubscription(data.subscription || null);
      setWorkspaceInfo(data.workspace || null);
    } catch {
      setPlans([]);
      setSubscription(null);
      setWorkspaceInfo(null);
      toast.error("Unable to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [tenant]);

  const handleUpgrade = async (plan) => {
    if (!isOwner) {
      toast.error("Only workspace owner can upgrade plan");
      return;
    }

    setBusyPlanId(plan.id);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        toast.error("Unable to load Razorpay checkout");
        return;
      }

      const { data } = await api.post("billing/create-order/", { plan_id: plan.id });

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency || "INR",
        name: currentWorkspace?.name || "Workspace",
        description: `${plan.name} Plan Upgrade`,
        order_id: data.order_id,
        handler: async function (response) {
          try {
            await api.post("billing/verify-payment/", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Subscription upgraded successfully");
            await Promise.all([loadBilling(), refreshUser?.()]);
          } catch {
            toast.error("Payment verification failed");
          }
        },
        theme: { color: "#6f7891" }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      const detail = error?.response?.data?.detail?.detail;
      toast.error(detail || "Unable to initiate payment");
    } finally {
      setBusyPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage workspace subscription and upgrade limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Workspace Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Loading subscription...</p>
          ) : (
            <>
              <p>Plan: <span className="font-medium capitalize">{workspaceInfo?.plan || "free"}</span></p>
              <p>Max Projects: <span className="font-medium">{workspaceInfo?.max_projects ?? "-"}</span></p>
              <p>Max Users: <span className="font-medium">{workspaceInfo?.max_users ?? "-"}</span></p>
              {subscription?.is_active ? (
                <p className="inline-flex items-center gap-1.5 text-success-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Active subscription
                </p>
              ) : (
                <p className="text-muted-foreground">No active paid subscription.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const current = workspaceInfo?.plan === plan.code;
          return (
            <Card key={plan.id} className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="truncate">{plan.name}</span>
                  {current ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Current</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-semibold">₹{(Number(plan.price || 0) / 100).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Projects: {plan.max_projects}</p>
                <p className="text-sm text-muted-foreground">Users: {plan.max_users}</p>

                <Button
                  className="h-11 w-full"
                  disabled={current || busyPlanId === plan.id || !isOwner}
                  onClick={() => handleUpgrade(plan)}
                >
                  {busyPlanId === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {current ? "Current Plan" : isOwner ? "Upgrade" : "Owner only"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
