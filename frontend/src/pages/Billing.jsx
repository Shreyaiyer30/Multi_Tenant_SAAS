import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Zap, Shield, Rocket } from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";
import { createOrder } from "@/services/billingService";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

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

const getPlanIcon = (code) => {
  if (code?.includes('pro')) return <Rocket className="w-5 h-5 text-accent2" />;
  if (code?.includes('enterprise')) return <Shield className="w-5 h-5 text-accent5" />;
  return <Zap className="w-5 h-5 text-accent" />;
};

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
    if (busyPlanId) return;
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

      const data = await createOrder(plan);
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
        theme: { color: "#00e5c0" }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      if (error?.response?.status === 401) return;
      toast.error(error?.response?.data?.detail?.detail || "Unable to initiate payment");
    } finally {
      setBusyPlanId(null);
    }
  };

  return (
    <div className="p-6 space-y-12 page-enter h-full flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-text font-syne font-bold text-3xl tracking-tight">Billing & Plans</h1>
          <p className="text-muted mt-1 text-xs font-medium uppercase tracking-[0.2em]">Workspace / Subscription / Management</p>
        </div>
        <div 
          className="flex items-center gap-4 px-6 py-3 rounded-2xl border bg-surface2 shadow-xl"
          style={{ borderColor: 'var(--border)' }}
        >
           <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
              <CreditCard className="w-5 h-5 text-accent" />
           </div>
           <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mb-1">Status</p>
              <div className="flex items-center gap-2">
                 <span className="text-text font-syne font-bold text-sm capitalize">{workspaceInfo?.plan || "Free"}</span>
                 <span className="w-1 h-1 rounded-full bg-accent" />
                 <span className="text-xs text-muted">Active</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {plans.map((plan, idx) => {
          const isCurrent = workspaceInfo?.plan === plan.code;
          const isPro = plan.code?.includes('pro');
          const isEnterprise = plan.code?.includes('enterprise');

          return (
            <div 
              key={plan.id} 
              className={`animate-fade-up relative flex flex-col rounded-3xl border p-8 transition-all hover:scale-[1.02] ${
                isCurrent ? 'border-accent shadow-[0_0_30px_rgba(0,229,192,0.15)] bg-surface' : 'bg-surface2 border-border elevate-hover'
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-background px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Current Tier
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                 <div className="p-3 rounded-2xl bg-surface border border-border">
                    {getPlanIcon(plan.code)}
                 </div>
                 {isPro && <span className="text-[10px] font-bold text-accent2 uppercase tracking-widest">Most Popular</span>}
              </div>

              <h3 className="text-text font-syne font-bold text-xl mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-muted text-sm">₹</span>
                 <span className="text-text font-syne font-bold text-4xl">{(Number(plan.price || 0) / 100).toFixed(0)}</span>
                 <span className="text-muted text-xs uppercase tracking-widest font-bold ml-2">/ month</span>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                 <div className="flex items-center gap-3 text-sm text-text">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-dm-mono">{plan.max_projects} Active Projects</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-text">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-dm-mono">{plan.max_users} Team Members</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-text">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-dm-mono font-medium">Standard Support</span>
                 </div>
                 {(isPro || isEnterprise) && (
                   <div className="flex items-center gap-3 text-sm text-text">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="font-dm-mono font-medium">Advanced Reporting</span>
                   </div>
                 )}
              </div>

              <button
                disabled={isCurrent || busyPlanId === plan.id || !isOwner}
                onClick={() => handleUpgrade(plan)}
                className={`w-full h-12 rounded-xl font-syne font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isCurrent 
                    ? 'bg-transparent border border-accent text-accent cursor-default' 
                    : !isOwner 
                    ? 'bg-surface border border-border text-muted cursor-not-allowed'
                    : 'bg-accent text-background hover:scale-[1.05] active:scale-95 shadow-lg'
                }`}
              >
                {busyPlanId === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>{isCurrent ? "Active Plan" : isOwner ? "Select Plan" : "Owner Only"}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div 
        className="mt-auto p-8 rounded-3xl border border-dashed flex items-center justify-between"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface2)' }}
      >
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center">
               <Shield className="w-6 h-6 text-accent5" />
            </div>
            <div>
               <h4 className="text-text font-syne font-bold text-lg leading-tight">Secure Checkout</h4>
               <p className="text-muted text-xs font-dm-mono">Payments powered by Razorpay with 256-bit encryption.</p>
            </div>
         </div>
         <div className="hidden sm:flex gap-4 opacity-40 grayscale group-hover:grayscale-0 transition-all">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest border border-border px-2 py-1 rounded">VISA</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest border border-border px-2 py-1 rounded">MASTERCARD</span>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest border border-border px-2 py-1 rounded">UPI</span>
         </div>
      </div>
    </div>
  );
}
