import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return <TabsPrimitive.List className={cn("inline-flex items-center gap-4 border-b", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "border-b-2 border-transparent px-1 py-2 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
