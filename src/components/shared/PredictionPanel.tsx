import { ArrowDown, ArrowUp, Lightbulb } from "lucide-react";
import type { Batch, Prediction, Specification } from "@/data/types";
import { PredictionBadge, PRED_COLORS } from "./StatusBadge";
import { Provenance } from "./Provenance";
import { cn } from "@/lib/utils";

/** Horizontal gauge showing spec band, predicted interval and (if any) the measured value. */
export function SpecGauge({ min, max, lo, hi, predicted, measured, unit, domain }: { min: number; max: number; lo: number; hi: number; predicted: number; measured?: number; unit: string; domain: [number, number] }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - domain[0]) / (domain[1] - domain[0])) * 100))}%`;
  const fmt = (v: number) => (unit === "cP" ? v.toLocaleString() : v.toFixed(2));
  return (
    <div className="pt-5">
      <div className="relative h-3 rounded-full bg-red-100">
        <div className="absolute inset-y-0 rounded-full bg-emerald-100" style={{ left: pos(min), width: `calc(${pos(max)} - ${pos(min)})` }} />
        <div className="absolute inset-y-[3px] rounded-full border border-dashed border-violet-500 bg-violet-300/40" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
        <div className="absolute -top-1 h-5 w-0.5 bg-violet-600" style={{ left: pos(predicted) }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600 px-1 text-[10px] font-semibold text-white">P {fmt(predicted)}</span>
        </div>
        {measured !== undefined && (
          <div className="absolute -top-1 h-5 w-0.5 bg-navy-900" style={{ left: pos(measured) }}>
            <span className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy-900 px-1 text-[10px] font-semibold text-white">M {fmt(measured)}</span>
          </div>
        )}
      </div>
      <div className={cn("flex justify-between text-[10.5px] text-muted-foreground", measured !== undefined ? "mt-6" : "mt-1.5")}>
        <span>{fmt(domain[0])}</span>
        <span>spec {unit === "cP" ? `${fmt(min)}–${fmt(max)}` : `≤ ${fmt(max)}`} {unit}</span>
        <span>{fmt(domain[1])}</span>
      </div>
    </div>
  );
}

export function PredictionCard({ prediction: p, batch, spec, compact }: { prediction: Prediction; batch: Batch; spec: Specification; compact?: boolean }) {
  const isVisc = p.property === "viscosity";
  const unit = isVisc ? "cP" : "ΔE";
  const measured = isVisc ? batch.lab?.viscosityCps : batch.lab?.appearanceDeltaE;
  const min = isVisc ? spec.viscosity.min : 0;
  const max = isVisc ? spec.viscosity.max : spec.appearance.maxDeltaE;
  const domain: [number, number] = isVisc ? [spec.viscosity.min - (spec.viscosity.max - spec.viscosity.min) * 0.5, spec.viscosity.max + (spec.viscosity.max - spec.viscosity.min) * 0.5] : [0, spec.appearance.maxDeltaE * 2];
  const maxImpact = Math.max(...p.contributors.map((c) => Math.abs(c.impact)), 1e-6);
  const fmt = (v: number) => (isVisc ? `${v.toLocaleString()} cP` : v.toFixed(2));

  return (
    <div className="rounded-lg border border-dashed border-violet-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-navy-900">{isVisc ? "Viscosity deviation" : "Appearance variation"}</div>
          <Provenance kind="predicted" />
        </div>
        <PredictionBadge status={p.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-[11px] text-muted-foreground">Target spec</div>
          <div className="tabular font-medium">{isVisc ? `${spec.viscosity.target.toLocaleString()} cP` : `ΔE ≤ ${spec.appearance.maxDeltaE}`}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Predicted (90% interval)</div>
          <div className="tabular font-medium text-violet-700">{fmt(p.predicted)}</div>
          <div className="tabular text-[11px] text-muted-foreground">{isVisc ? `${p.intervalLow.toLocaleString()}–${p.intervalHigh.toLocaleString()}` : `${p.intervalLow.toFixed(2)}–${p.intervalHigh.toFixed(2)}`}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Deviation risk</div>
          <div className="tabular font-semibold" style={{ color: PRED_COLORS[p.status] }}>{Math.round(p.risk * 100)}%</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Model confidence</div>
          <div className="tabular font-medium">{Math.round(p.confidence * 100)}%</div>
        </div>
      </div>

      <SpecGauge min={min} max={max} lo={p.intervalLow} hi={p.intervalHigh} predicted={p.predicted} measured={measured} unit={unit} domain={domain} />
      {measured !== undefined ? (
        <p className="mt-2 text-[11.5px] text-navy-600"><strong>M</strong> = measured lab value ({fmt(measured)}). The laboratory result takes precedence over the prediction.</p>
      ) : (
        <p className="mt-2 text-[11.5px] text-muted-foreground">No laboratory result yet — this is an estimate only.</p>
      )}

      {!compact && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contributing variables</div>
            <div className="space-y-2">
              {p.contributors.map((c) => (
                <div key={c.variable}>
                  <div className="flex justify-between gap-2 text-[12.5px]">
                    <span className="truncate">{c.variable} <span className="text-muted-foreground">({c.value})</span></span>
                    <span className={cn("tabular inline-flex items-center gap-0.5 font-medium", c.impact < 0 ? "text-sky-700" : "text-orange-700")}>
                      {c.impact < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                      {isVisc ? Math.abs(c.impact).toLocaleString() : Math.abs(c.impact).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className={cn("h-1.5 rounded-full", c.impact < 0 ? "bg-sky-500" : "bg-orange-500")} style={{ width: `${(Math.abs(c.impact) / maxImpact) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Model attributions show statistical influence on the estimate, not proven causes.</p>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended investigation actions</div>
            <ul className="space-y-2">
              {p.actions.map((a) => (
                <li key={a} className="flex gap-2 text-[12.5px] text-navy-700"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="mt-3 border-t pt-2 font-mono text-[10.5px] text-muted-foreground">model {p.modelVersion} · source: {p.source === "simulated" ? "simulated (SageMaker-ready)" : "Amazon SageMaker"}</div>
    </div>
  );
}
