import * as React from "react";
import { cn } from "@/lib";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const variants = {
    default:
      "btn-primary",
    secondary: "btn-secondary",
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
