import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.email) nextErrors.email = "Required";
    if (!form.password) nextErrors.password = "Required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (error) {
       toast.error("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent2/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[440px] animate-fade-up">
        <div className="flex flex-col items-center mb-10">
           <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(0,229,192,0.3)] mb-6">
              <Sparkles className="w-8 h-8 text-background" />
           </div>
           <h1 className="text-text font-syne font-bold text-4xl tracking-tighter">FLOWDESK</h1>
           <p className="text-muted text-xs font-dm-mono mt-2 uppercase tracking-[0.3em]">Streamline your workflow</p>
        </div>

        <div 
          className="rounded-[2.5rem] border p-10 shadow-2xl relative overflow-hidden group"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Subtle Inner Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          
          <div className="mb-8">
            <h2 className="text-text font-syne font-bold text-2xl tracking-tight">Welcome Back</h2>
            <p className="text-muted text-sm mt-1">Access your team workspace.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Email Address</label>
               <input 
                  type="email"
                  placeholder="name@company.com"
                  className={`w-full h-14 bg-surface2 rounded-2xl border px-5 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                    errors.email ? 'border-accent3' : 'border-border'
                  }`}
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-bold text-muted uppercase tracking-widest pl-1">Secret Password</label>
               <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full h-14 bg-surface2 rounded-2xl border px-5 text-sm transition-all focus:border-accent focus:outline-none text-text ${
                      errors.password ? 'border-accent3' : 'border-border'
                    }`}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
               </div>
            </div>

            <button 
               className="w-full h-14 bg-accent text-background rounded-2xl font-syne font-bold text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,229,192,0.2)]"
               disabled={loading}
            >
               {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-background" /> : "Authorize Access"}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border/50 text-center">
             <p className="text-muted text-xs">
                New to the platform? <Link to="/register" className="text-accent font-bold hover:underline">Create Account</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
