import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: ""
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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(107,118,145,0.14),transparent)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} required />
                {errors.first_name ? <p className="text-xs text-danger-foreground">{errors.first_name}</p> : null}
              </div>
              <div className="space-y-1">
                <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} required />
                {errors.last_name ? <p className="text-xs text-danger-foreground">{errors.last_name}</p> : null}
              </div>
            </div>
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            {errors.email ? <p className="text-xs text-danger-foreground">{errors.email}</p> : null}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="pr-10"
                required
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="text-xs text-danger-foreground">{errors.password}</p> : null}
            {apiError ? <p className="text-xs text-danger-foreground">{apiError}</p> : null}
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
