import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email) nextErrors.email = "This field is required";
    if (!form.password) nextErrors.password = "This field is required";
    setErrors(nextErrors);
    setApiError("");
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        const fieldErrors = {};
        Object.entries(detail).forEach(([key, value]) => {
          fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
        });
        const fallback =
          fieldErrors.non_field_errors ||
          fieldErrors.detail ||
          fieldErrors.password ||
          "Invalid credentials";
        setErrors({
          email: fieldErrors.email || "",
          password: fieldErrors.password || fallback
        });
        setApiError(fallback);
      } else if (Array.isArray(detail) && detail.length) {
        setErrors({ password: String(detail[0]) });
        setApiError(String(detail[0]));
      } else if (typeof detail === "string") {
        setErrors({ password: detail });
        setApiError(detail);
      } else {
        setErrors({ password: "Invalid credentials" });
        toast.error("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={errors.email ? "border-red-500" : ""} />
            {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
            <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className={errors.password ? "border-red-500" : ""} />
            {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
            {apiError ? <p className="text-xs text-red-500">{apiError}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account? <Link className="text-primary" to="/register">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
