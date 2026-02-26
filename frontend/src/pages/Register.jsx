import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    create_workspace: true,
    workspace_name: ""
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setApiError("");
    const localErrors = {};
    if (!/[A-Z]/.test(form.password)) {
      localErrors.password = "Password must include at least one uppercase letter.";
    } else if (!/\d/.test(form.password)) {
      localErrors.password = "Password must include at least one digit.";
    }
    if (form.create_workspace && !form.workspace_name.trim()) {
      localErrors.workspace_name = "This field is required when create_workspace is true.";
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      setLoading(false);
      return;
    }
    try {
      await register(form);
      navigate("/");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        const nextErrors = {};
        Object.entries(detail).forEach(([key, value]) => {
          nextErrors[key] = Array.isArray(value) ? value[0] : String(value);
        });
        if (nextErrors.email?.toLowerCase().includes("already exists")) {
          nextErrors.email = `${nextErrors.email} Try signing in instead.`;
        }
        if (nextErrors.non_field_errors && !nextErrors.password) {
          nextErrors.password = nextErrors.non_field_errors;
        }
        setErrors(nextErrors);
        if (typeof detail?.non_field_errors === "string") {
          setApiError(detail.non_field_errors);
        }
      } else if (Array.isArray(detail) && detail.length) {
        setErrors({ password: String(detail[0]) });
        setApiError(String(detail[0]));
      } else if (typeof detail === "string") {
        setErrors({ password: detail });
        setApiError(detail);
      } else {
        const msg = "Registration failed";
        setApiError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} required />
                {errors.first_name ? <p className="text-xs text-red-500">{errors.first_name}</p> : null}
              </div>
              <div className="space-y-1">
                <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} required />
                {errors.last_name ? <p className="text-xs text-red-500">{errors.last_name}</p> : null}
              </div>
            </div>
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
            <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.create_workspace} onChange={(e) => setForm((p) => ({ ...p, create_workspace: e.target.checked }))} />
              Create a new workspace
            </label>
            {form.create_workspace ? <Input placeholder="Workspace name" value={form.workspace_name} onChange={(e) => setForm((p) => ({ ...p, workspace_name: e.target.value }))} required /> : null}
            {errors.workspace_name ? <p className="text-xs text-red-500">{errors.workspace_name}</p> : null}
            {apiError ? <p className="text-xs text-red-500">{apiError}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered? <Link to="/login" className="text-primary">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
