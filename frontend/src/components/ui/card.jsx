import { cn } from "@/lib";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-base font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}
