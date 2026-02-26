import { cn } from "@/lib";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  );
}
