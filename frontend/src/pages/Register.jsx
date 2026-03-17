import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
    
    const localErrors = {};
    if (!/[A-Z]/.test(form.password)) {
      localErrors.password = "Need an uppercase letter.";
    } else if (!/\d/.test(form.password)) {
      localErrors.password = "Need at least one number.";
    }
    
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      setLoading(false);
      return;
    }

    try {
      await register(form);
      toast.success("Welcome to FlowDesk!");
      navigate("/");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        const nextErrors = {};
        Object.entries(detail).forEach(([key, value]) => {
          nextErrors[key] = Array.isArray(value) ? value[0] : String(value);
        });
        setErrors(nextErrors);
      } else {
        toast.error("Registration failed. Try a different email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent2/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[500px] animate-fade-up">
        <div className="flex flex-col items-center mb-10">
           <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(0,229,192,0.3)] mb-6">
              <Sparkles className="w-8 h-8 text-background" />
           </div>
           <h1 className="text-text font-syne font-bold text-4xl tracking-tighter uppercase">FlowDesk</h1>
           <p className="text-muted text-xs font-dm-mono mt-2 uppercase tracking-[0.3em]">Join the future of workflow</p>
        </div>

        <div 
          className="rounded-[2.5rem] border p-10 shadow-2xl relative overflow-hidden group"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Subtle Inner Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-text font-syne font-bold text-2xl tracking-tight">Create Account</h2>
              <p className="text-muted text-sm mt-1">Start your 14-day pro trial.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
               <UserPlus className="w-6 h-6 text-accent" />
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">First Name</label>
                  <input 
                     placeholder="John"
                     className={`w-full h-12 bg-surface2 rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                       errors.first_name ? 'border-accent3' : 'border-border'
                     }`}
                     value={form.first_name}
                     onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))}
                     required
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Last Name</label>
                  <input 
                     placeholder="Doe"
                     className={`w-full h-12 bg-surface2 rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                       errors.last_name ? 'border-accent3' : 'border-border'
                     }`}
                     value={form.last_name}
                     onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))}
                     required
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Work Email</label>
               <input 
                  type="email"
                  placeholder="name@company.com"
                  className={`w-full h-12 bg-surface2 rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                    errors.email ? 'border-accent3' : 'border-border'
                  }`}
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
               />
               {errors.email && <p className="text-[10px] text-accent3 font-bold px-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Secure Password</label>
               <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full h-12 bg-surface2 rounded-xl border px-4 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                      errors.password ? 'border-accent3' : 'border-border'
                    }`}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
               {errors.password && <p className="text-[10px] text-accent3 font-bold px-1">{errors.password}</p>}
            </div>

            <div className="pt-4">
              <button 
                className="w-full h-14 bg-accent text-background rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,229,192,0.2)] flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-background" /> : (
                  <>
                    <span>Initialize Account</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-border/50 text-center">
             <p className="text-muted text-xs">
                Already have an account? <Link to="/login" className="text-accent font-bold hover:underline">Sign In Instead</Link>
             </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-muted-foreground/30 mt-8 uppercase tracking-[0.2em]">
           By clicking initialize, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
