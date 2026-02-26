import { cn } from "@/lib";

export function Table({ className, ...props }) {
  return <table className={cn("w-full text-sm", className)} {...props} />;
}

export function THead(props) {
  return <thead className="border-b" {...props} />;
}

export function TBody(props) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }) {
  return <tr className={cn("border-b hover:bg-muted/40", className)} {...props} />;
}

export function TH({ className, ...props }) {
  return <th className={cn("p-3 text-left font-medium text-muted-foreground", className)} {...props} />;
}

export function TD({ className, ...props }) {
  return <td className={cn("p-3", className)} {...props} />;
}
