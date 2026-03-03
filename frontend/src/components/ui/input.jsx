import { cn } from "@/lib";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm outline-none transition-all duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
        className
      )}
      {...props}
    />
  );
}
