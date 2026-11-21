import { BadgeCheck, FlaskConical, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual marker that separates the three kinds of quality information.
 * measured  = laboratory value recorded by an analyst
 * predicted = model estimate (simulated until SageMaker is connected)
 * decided   = human-approved quality decision
 */
export function Provenance({ kind, className, label }: { kind: "measured" | "predicted" | "decided"; className?: string; label?: string }) {
  const cfg = {
    measured: { icon: FlaskConical, text: "Measured · Lab", cls: "bg-navy-50 text-navy-700 border-navy-200" },
    predicted: { icon: Sparkles, text: "Predicted · Simulated model", cls: "bg-violet-50 text-violet-700 border-violet-200 border-dashed" },
    decided: { icon: BadgeCheck, text: "Decision · Human-approved", cls: "bg-forest-50 text-forest-800 border-forest-200" },
  }[kind];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide", cfg.cls, className)}>
      <Icon className="h-3 w-3" />
      {label ?? cfg.text}
    </span>
  );
}

export function SimulatedNotice({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-md border border-dashed border-violet-300 bg-violet-50/70 px-3 py-2 text-xs text-violet-900", className)}>
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        {children ?? (
          <>
            <strong>Simulated AI output.</strong> Predictions are model estimates for prioritising investigation — they are not laboratory results and do not replace release testing.
          </>
        )}
      </div>
    </div>
  );
}
