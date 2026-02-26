import * as React from "react";
import { cn } from "@/lib";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-card border border-border hover:bg-muted",
    ghost: "hover:bg-muted",
    destructive: "bg-red-500 text-white hover:bg-red-600"
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3",
    lg: "h-11 px-5"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
