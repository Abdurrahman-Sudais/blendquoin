import { AlertTriangle, CheckCircle2, CircleDot, Eye, FlaskConical, Loader2, PauseCircle, Search, ShieldAlert } from "lucide-react";
import type { BatchStatus, LotStatus, PredictionStatus, InvestigationStatus } from "@/data/types";
import { cn } from "@/lib/utils";

const PRED: Record<PredictionStatus, { cls: string; icon: typeof CheckCircle2 }> = {
  "Within specification": { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  Monitor: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Eye },
  "Potential deviation": { cls: "bg-orange-50 text-orange-800 border-orange-200", icon: AlertTriangle },
  "Requires quality review": { cls: "bg-red-50 text-red-800 border-red-200", icon: ShieldAlert },
};

export const PRED_COLORS: Record<PredictionStatus, string> = {
  "Within specification": "#1f8a5b",
  Monitor: "#c58a1b",
  "Potential deviation": "#d9622b",
  "Requires quality review": "#c0392b",
};

export function PredictionBadge({ status, className }: { status: PredictionStatus; className?: string }) {
  const { cls, icon: Icon } = PRED[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", cls, className)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

const BATCH: Record<BatchStatus, { cls: string; icon: typeof CheckCircle2 }> = {
  Released: { cls: "bg-forest-50 text-forest-800 border-forest-200", icon: CheckCircle2 },
  "In production": { cls: "bg-sky-50 text-sky-800 border-sky-200", icon: Loader2 },
  "Awaiting lab": { cls: "bg-slate-50 text-slate-700 border-slate-200", icon: FlaskConical },
  "Quality review": { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Eye },
  "Under investigation": { cls: "bg-orange-50 text-orange-800 border-orange-200", icon: Search },
  "On hold": { cls: "bg-red-50 text-red-800 border-red-200", icon: PauseCircle },
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { cls, icon: Icon } = BATCH[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export function LotStatusBadge({ status }: { status: LotStatus }) {
  const cls = status === "Released" ? "bg-forest-50 text-forest-800 border-forest-200" : status === "Quarantine" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-red-50 text-red-800 border-red-200";
  return <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", cls)}><CircleDot className="h-3 w-3" />{status}</span>;
}

export function InvestigationStatusBadge({ status }: { status: InvestigationStatus }) {
  const cls = {
    Open: "bg-sky-50 text-sky-800 border-sky-200",
    "In progress": "bg-orange-50 text-orange-800 border-orange-200",
    "Pending approval": "bg-amber-50 text-amber-800 border-amber-200",
    Closed: "bg-forest-50 text-forest-800 border-forest-200",
  }[status];
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>{status}</span>;
}
