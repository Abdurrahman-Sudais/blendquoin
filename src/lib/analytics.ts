import type { Batch, IngredientLot, Specification } from "@/data/types";

export function inSpecViscosity(b: Batch, spec: Specification) {
  return !!b.lab && b.lab.viscosityCps >= spec.viscosity.min && b.lab.viscosityCps <= spec.viscosity.max;
}
export function inSpecAppearance(b: Batch, spec: Specification) {
  return !!b.lab && b.lab.appearanceDeltaE <= spec.appearance.maxDeltaE;
}

/** 0–100 consistency score from MEASURED values: closeness to viscosity target and low ΔE. */
export function consistencyScore(b: Batch, spec: Specification): number | null {
  if (!b.lab) return null;
  const half = (spec.viscosity.max - spec.viscosity.min) / 2;
  const v = Math.max(0, 1 - Math.abs(b.lab.viscosityCps - spec.viscosity.target) / (half * 1.6));
  const a = Math.max(0, 1 - b.lab.appearanceDeltaE / (spec.appearance.maxDeltaE * 1.6));
  return Math.round((v * 0.65 + a * 0.35) * 100);
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export function mean(a: number[]) {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}
export function stdev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

export function lotFor(b: Batch, materialId: string, lots: IngredientLot[]) {
  for (const u of b.lots) {
    const l = lots.find((x) => x.id === u.lotId);
    if (l?.materialId === materialId) return l;
  }
  return undefined;
}

export function batchSuppliers(b: Batch, lots: IngredientLot[]) {
  return new Set(b.lots.map((u) => lots.find((l) => l.id === u.lotId)?.supplierId).filter(Boolean) as string[]);
}

/** Numeric features available for pattern analysis. */
export const FEATURES: { key: string; label: string; unit: string; get: (b: Batch, lots: IngredientLot[]) => number | undefined }[] = [
  { key: "carbCoa", label: "Carbomer CoA viscosity", unit: "cP", get: (b, l) => lotFor(b, "RM-CARB", l)?.coaValue },
  { key: "sheaColour", label: "Shea butter colour", unit: "Y", get: (b, l) => lotFor(b, "RM-SHEA", l)?.coaValue },
  { key: "speed", label: "Mixing speed", unit: "rpm", get: (b) => b.mixing.mixingSpeedRpm },
  { key: "duration", label: "Mixing duration", unit: "min", get: (b) => b.mixing.mixingDurationMin },
  { key: "temp", label: "Emulsification temp.", unit: "°C", get: (b) => b.mixing.emulsificationTempC },
  { key: "cooling", label: "Cooling rate", unit: "°C/min", get: (b) => b.mixing.coolingRateCPerMin },
  { key: "homog", label: "Homogeniser speed", unit: "rpm", get: (b) => b.mixing.homogenizerRpm },
];

export const OUTCOMES: { key: string; label: string; unit: string; get: (b: Batch) => number | undefined }[] = [
  { key: "viscosity", label: "Viscosity (measured)", unit: "cP", get: (b) => b.lab?.viscosityCps },
  { key: "deltaE", label: "Appearance ΔE (measured)", unit: "ΔE", get: (b) => b.lab?.appearanceDeltaE },
];

export function strengthLabel(r: number) {
  const a = Math.abs(r);
  if (a >= 0.6) return "Strong";
  if (a >= 0.35) return "Moderate";
  if (a >= 0.15) return "Weak";
  return "Negligible";
}
