import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogOverlay({ className, ...props }) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({ className, children, ...props }) {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2",
          "rounded-xl border bg-card p-6 shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4 flex flex-col gap-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return (
    <RadixDialog.Title
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <RadixDialog.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** ✅ Added: DialogFooter (this fixes your import error) */
export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
        className
      )}
      {...props}
    />
  );
}