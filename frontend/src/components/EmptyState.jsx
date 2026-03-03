import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) {
  return (
    <div className="surface-glass flex min-h-44 flex-col items-center justify-center rounded-2xl p-8 text-center page-enter">
      {Icon ? <Icon className="mb-3 h-8 w-8 text-muted-foreground" /> : null}
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel ? (
        <Button variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
