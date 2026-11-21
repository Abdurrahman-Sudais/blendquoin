import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = "default" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: "default" | "warn" | "alert" | "good" }) {
  const toneCls = { default: "text-navy-700 bg-navy-50", warn: "text-amber-700 bg-amber-50", alert: "text-red-700 bg-red-50", good: "text-forest-700 bg-forest-50" }[tone];
  return (
    <div className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,26,43,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-medium text-muted-foreground">{label}</div>
        {icon && <div className={cn("rounded-md p-1.5 [&_svg]:h-4 [&_svg]:w-4", toneCls)}>{icon}</div>}
      </div>
      <div className="tabular mt-2 text-[26px] font-semibold leading-none tracking-tight text-navy-900">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:h-8 [&_svg]:w-8">{icon}</div>}
      <div className="font-medium text-navy-900">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
