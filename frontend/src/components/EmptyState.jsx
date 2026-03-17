import { Sparkles, ArrowRight } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) {
  return (
    <div className="surface-glass flex min-h-[300px] flex-col items-center justify-center rounded-[2.5rem] p-12 text-center page-enter border-dashed border-2 border-border/40">
      <div className="w-20 h-20 bg-surface2 rounded-3xl flex items-center justify-center mb-6 text-muted/30 group-hover:text-accent transition-colors relative">
         {Icon ? <Icon className="h-10 w-10" strokeWidth={1.5} /> : <Sparkles className="h-10 w-10" />}
         <div className="absolute inset-0 bg-accent/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <h3 className="text-2xl font-syne font-bold tracking-tight text-text mb-2 uppercase">{title}</h3>
      <p className="max-w-xs text-[11px] font-bold text-muted uppercase tracking-[0.2em] leading-relaxed mb-8 opacity-60">
        {description}
      </p>

      {actionLabel && (
        <button 
          onClick={onAction}
          className="px-8 h-12 bg-accent text-background rounded-xl font-syne font-bold text-xs tracking-[0.2em] uppercase hover:scale-[1.05] active:scale-95 transition-all shadow-lg flex items-center gap-3 group"
        >
          {actionLabel}
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
}
