// SIMULATED deviation model.
// A transparent linear surrogate used for demonstration until the SageMaker endpoint is connected.
// Outputs are estimates — they are never written back as laboratory results.
import type { Batch, ContributingVariable, IngredientLot, Prediction, PredictionStatus, Specification } from "@/data/types";

export const SIMULATED_MODEL_VERSION = "bq-deviation-sim-0.4";

const normCdf = (x: number) => {
  // Abramowitz–Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

export function statusFromRisk(risk: number): PredictionStatus {
  if (risk < 0.15) return "Within specification";
  if (risk < 0.35) return "Monitor";
  if (risk < 0.6) return "Potential deviation";
  return "Requires quality review";
}

const fmt = (n: number, unit = "") => `${n.toLocaleString("en-GB")}${unit}`;

export function predictBatch(batch: Batch, spec: Specification, lots: IngredientLot[]): Prediction[] {
  const lotOf = (materialId: string) => {
    const usage = batch.lots.find((u) => lots.find((l) => l.id === u.lotId)?.materialId === materialId);
    return usage ? lots.find((l) => l.id === usage.lotId) : undefined;
  };
  const carb = lotOf("RM-CARB");
  const shea = lotOf("RM-SHEA");
  const m = batch.mixing;
  const scale = spec.viscosity.target / 18000;
  const generatedAt = new Date().toISOString();

  // ---- Viscosity --------------------------------------------------------------
  const vContrib: ContributingVariable[] = [];
  const add = (variable: string, value: string, impact: number) =>
    vContrib.push({ variable, value, impact: Math.round(impact), direction: impact >= 0 ? "increases" : "decreases" });
  if (carb) add(`Carbomer lot ${carb.id} (CoA)`, fmt(carb.coaValue, " cP"), scale * 18000 * 0.62 * (carb.coaValue / 45500 - 1));
  if (carb && carb.supplierId === "SUP-02") add("Supplier history: Orbis Polymer Trading", "limited history", scale * -1400);
  add("Mixing speed", fmt(m.mixingSpeedRpm, " rpm"), scale * (m.mixingSpeedRpm - 2800) * -1.1);
  add("Mixing duration", `${m.mixingDurationMin} min`, scale * (m.mixingDurationMin - 45) * 70);
  add("Emulsification temperature", `${m.emulsificationTempC} °C`, scale * (m.emulsificationTempC - 75) * -160);
  add(`Equipment ${batch.equipmentId}`, batch.equipmentId, scale * ({ "MX-01": 0, "MX-02": -250, "MX-03": 420 }[batch.equipmentId] ?? 0));
  vContrib.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const vPred = Math.round((spec.viscosity.target + vContrib.reduce((s, c) => s + c.impact, 0)) / 10) * 10;
  const vSigma = 950 * scale;
  const vRisk = normCdf((spec.viscosity.min - vPred) / vSigma) + (1 - normCdf((spec.viscosity.max - vPred) / vSigma));
  const vConfidence = Math.max(0.55, Math.min(0.93, 0.9 - (carb?.supplierId === "SUP-02" ? 0.16 : 0) - Math.abs(m.emulsificationTempC - 75) * 0.015));
  const vStatus = statusFromRisk(vRisk);
  const vActions: string[] = [];
  if (vStatus !== "Within specification") {
    if (carb && vContrib.slice(0, 3).some((c) => c.variable.includes("Carbomer") || c.variable.includes("Supplier"))) vActions.push(`Review CoA and retained sample of carbomer lot ${carb.id}; consider an incoming viscosity check.`);
    if (carb?.supplierId === "SUP-02") vActions.push("Compare against batches made with Lumina carbomer in the same period.");
    if (Math.abs(m.emulsificationTempC - 75) > 2.5) vActions.push("Verify emulsification temperature log and probe calibration for this run.");
    if (Math.abs(m.mixingSpeedRpm - 2800) > 200) vActions.push("Confirm mixer speed set-point against batch record.");
    vActions.push("Prioritise laboratory viscosity measurement before release decision.");
  } else {
    vActions.push("No action suggested beyond routine release testing.");
  }

  // ---- Appearance -------------------------------------------------------------
  const aContrib: ContributingVariable[] = [];
  const addA = (variable: string, value: string, impact: number) =>
    aContrib.push({ variable, value, impact: Math.round(impact * 100) / 100, direction: impact >= 0 ? "increases" : "decreases" });
  if (shea) addA(`Shea butter lot ${shea.id} colour`, `${shea.coaValue} Y`, 0.17 * (shea.coaValue - 6));
  addA("Emulsification temperature", `${m.emulsificationTempC} °C`, Math.max(0, m.emulsificationTempC - 77.5) * 0.22);
  addA("Cooling rate", `${m.coolingRateCPerMin} °C/min`, m.coolingRateCPerMin < 1.0 ? 0.25 : 0);
  addA("Homogeniser speed", fmt(m.homogenizerRpm, " rpm"), (m.homogenizerRpm - 3600) * 0.00005);
  aContrib.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const aPred = Math.max(0.15, Math.round((0.55 + aContrib.reduce((s, c) => s + c.impact, 0)) * 100) / 100);
  const aSigma = 0.22;
  const aRisk = 1 - normCdf((spec.appearance.maxDeltaE - aPred) / aSigma);
  const aStatus = statusFromRisk(aRisk);
  const aActions: string[] = [];
  if (aStatus !== "Within specification") {
    if (shea && shea.coaValue > 8) aActions.push(`Check colour of shea butter lot ${shea.id} against the incoming alert limit (8.0 Y).`);
    if (m.emulsificationTempC > 77.5) aActions.push("Review heating profile — temperature above 77.5 °C is associated with colour shift.");
    if (m.coolingRateCPerMin < 1.0) aActions.push("Review cooling stage; slow cooling has been associated with appearance variation.");
    aActions.push("Request colour measurement against reference standard before release.");
  } else {
    aActions.push("No action suggested beyond routine appearance check.");
  }

  const base = { batchId: batch.id, modelVersion: SIMULATED_MODEL_VERSION, source: "simulated" as const, generatedAt };
  return [
    {
      ...base,
      property: "viscosity",
      predicted: vPred,
      intervalLow: Math.round((vPred - 1.64 * vSigma) / 10) * 10,
      intervalHigh: Math.round((vPred + 1.64 * vSigma) / 10) * 10,
      risk: Math.min(0.99, vRisk),
      confidence: vConfidence,
      status: vStatus,
      contributors: vContrib.filter((c) => c.impact !== 0).slice(0, 5),
      actions: vActions,
    },
    {
      ...base,
      property: "appearance",
      predicted: aPred,
      intervalLow: Math.max(0, Math.round((aPred - 1.64 * aSigma) * 100) / 100),
      intervalHigh: Math.round((aPred + 1.64 * aSigma) * 100) / 100,
      risk: Math.min(0.99, aRisk),
      confidence: shea && shea.coaValue > 8 ? 0.71 : 0.84,
      status: aStatus,
      contributors: aContrib.filter((c) => c.impact !== 0).slice(0, 5),
      actions: aActions,
    },
  ];
}

export function worstStatus(preds: Prediction[]): PredictionStatus {
  const order: PredictionStatus[] = ["Within specification", "Monitor", "Potential deviation", "Requires quality review"];
  return preds.reduce<PredictionStatus>((w, p) => (order.indexOf(p.status) > order.indexOf(w) ? p.status : w), "Within specification");
}
