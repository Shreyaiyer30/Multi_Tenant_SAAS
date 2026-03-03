import * as React from "react";
import { cn } from "@/lib";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const variants = {
    default:
      "bg-gradient-to-b from-primary-hover to-primary text-primary-foreground shadow-[0_10px_24px_rgba(58,66,90,0.38)] hover:from-primary hover:to-primary-active",
    secondary: "border border-border/80 bg-card-elevated/70 text-foreground hover:bg-muted/55 shadow-sm",
    ghost: "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    destructive: "bg-danger text-danger-foreground shadow-[0_10px_22px_rgba(115,69,81,0.35)] hover:brightness-110"
  };
  const sizes = {
    default: "h-10 px-4",
    sm: "h-10 px-3.5 text-xs",
    lg: "h-11 px-5"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-150 ease-in-out active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
