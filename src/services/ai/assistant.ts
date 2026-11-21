// AI Investigation Assistant.
// Simulated responses are produced from the investigation's own records using simple rules.
// When AWS is enabled, the same tasks are sent to Amazon Bedrock via the API.
import type { Batch, IngredientLot, Investigation, InvestigationNote, Specification } from "@/data/types";
import { apiRequest } from "../aws/apiClient";
import { awsConfig } from "../aws/config";
import { recordMetric } from "../aws/monitoring";

export type AssistantTask = "classify" | "summarizeLab" | "relatedBatches" | "organizeEvidence" | "summary" | "missingInfo";

export const ASSISTANT_TASKS: { id: AssistantTask; label: string; description: string }[] = [
  { id: "classify", label: "Classify notes", description: "Tag each investigation note by evidence category" },
  { id: "summarizeLab", label: "Summarise lab observations", description: "Condense measured laboratory results" },
  { id: "relatedBatches", label: "Find related batches", description: "Batches sharing ingredient lots or conditions" },
  { id: "organizeEvidence", label: "Organise evidence", description: "Group evidence by supporting factor" },
  { id: "summary", label: "Draft investigation summary", description: "A draft for the quality team to review" },
  { id: "missingInfo", label: "Highlight missing information", description: "Gaps before a conclusion can be approved" },
];

export interface AssistantContext {
  investigation: Investigation;
  batches: Batch[];
  allBatches: Batch[];
  lots: IngredientLot[];
  specs: Specification[];
}

export interface AssistantSection {
  heading: string;
  items: string[];
}

export interface AssistantResponse {
  task: AssistantTask;
  title: string;
  sections: AssistantSection[];
  classifications?: { noteId: string; category: string; confidence: number }[];
  source: "simulated" | "bedrock";
  model: string;
}

const CATEGORY_RULES: { category: string; words: string[] }[] = [
  { category: "Raw material", words: ["lot", "supplier", "coa", "carbomer", "shea", "raw material", "quarantine"] },
  { category: "Laboratory observation", words: ["measured", "viscosity", "δe", "Δe", "tested", "re-tested", "visual", "tint", "results"] },
  { category: "Process", words: ["mixing", "temperature", "speed", "neutralisation", "log", "sop", "cooling", "homogen"] },
  { category: "Equipment", words: ["mx-", "vessel", "calibration", "probe", "equipment"] },
  { category: "Lab method", words: ["viscometer", "method", "instrument", "cross-check", "spindle"] },
  { category: "Verification test", words: ["trial", "lab-scale", "substitution", "verified", "confirm"] },
];

export function classifyNote(note: InvestigationNote): { category: string; confidence: number } {
  const t = note.text.toLowerCase();
  let best = { category: "General", score: 0 };
  for (const rule of CATEGORY_RULES) {
    const score = rule.words.reduce((s, w) => s + (t.includes(w.toLowerCase()) ? 1 : 0), 0);
    if (score > best.score) best = { category: rule.category, score };
  }
  return { category: best.category, confidence: Math.min(0.95, 0.55 + best.score * 0.1) };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runAssistant(task: AssistantTask, ctx: AssistantContext): Promise<AssistantResponse> {
  const started = performance.now();
  if (awsConfig.enabled) {
    const res = await apiRequest<AssistantResponse>(`/assistant/${task}`, {
      method: "POST",
      body: JSON.stringify({ modelId: awsConfig.bedrockModelId, investigationId: ctx.investigation.id }),
    });
    recordMetric("AssistantLatencyMs", performance.now() - started, "Milliseconds");
    return res;
  }
  await delay(700 + Math.random() * 500);
  const res = simulate(task, ctx);
  recordMetric("AssistantLatencyMs", Math.round(performance.now() - started), "Milliseconds");
  return res;
}

function simulate(task: AssistantTask, ctx: AssistantContext): AssistantResponse {
  const { investigation: inv, batches, allBatches, lots, specs } = ctx;
  const base = { task, source: "simulated" as const, model: "Simulated assistant (Bedrock-ready)" };
  const specFor = (b: Batch) => specs.find((s) => s.productFamily === b.productFamily)!;
  const measured = batches.filter((b) => b.lab);

  switch (task) {
    case "classify": {
      const classifications = inv.notes.map((n) => ({ noteId: n.id, ...classifyNote(n) }));
      const groups = new Map<string, string[]>();
      inv.notes.forEach((n, i) => {
        const c = classifications[i].category;
        groups.set(c, [...(groups.get(c) ?? []), `${n.author} (${n.date}): ${n.text.slice(0, 110)}${n.text.length > 110 ? "…" : ""}`]);
      });
      return { ...base, title: `Classified ${inv.notes.length} notes`, classifications, sections: [...groups].map(([heading, items]) => ({ heading, items })) };
    }
    case "summarizeLab": {
      if (!measured.length) return { ...base, title: "No laboratory results attached", sections: [{ heading: "Observation", items: ["None of the selected batches has a recorded laboratory measurement yet."] }] };
      const visc = measured.map((b) => b.lab!.viscosityCps);
      const de = measured.map((b) => b.lab!.appearanceDeltaE);
      const outVisc = measured.filter((b) => b.lab!.viscosityCps < specFor(b).viscosity.min || b.lab!.viscosityCps > specFor(b).viscosity.max);
      const outApp = measured.filter((b) => b.lab!.appearanceDeltaE > specFor(b).appearance.maxDeltaE);
      const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
      return {
        ...base,
        title: `Laboratory summary — ${measured.length} measured batches`,
        sections: [
          {
            heading: "Measured values (laboratory)",
            items: [
              `Viscosity ranged ${Math.min(...visc).toLocaleString()}–${Math.max(...visc).toLocaleString()} cP (mean ${Math.round(mean(visc)).toLocaleString()} cP).`,
              `Appearance ΔE ranged ${Math.min(...de).toFixed(2)}–${Math.max(...de).toFixed(2)} (mean ${mean(de).toFixed(2)}).`,
            ],
          },
          {
            heading: "Against specification",
            items: [
              outVisc.length ? `${outVisc.length} batch(es) outside viscosity specification: ${outVisc.map((b) => b.id).join(", ")}.` : "All measured batches within viscosity specification.",
              outApp.length ? `${outApp.length} batch(es) above appearance ΔE limit: ${outApp.map((b) => b.id).join(", ")}.` : "All measured batches within appearance limit.",
            ],
          },
          { heading: "Notes from records", items: inv.notes.filter((n) => classifyNote(n).category === "Laboratory observation").map((n) => n.text) },
        ],
      };
    }
    case "relatedBatches": {
      const lotIds = new Set(batches.flatMap((b) => b.lots.map((l) => l.lotId)));
      const flaggedLots = lots.filter((l) => lotIds.has(l.id) && l.status !== "Released");
      const keyLots = flaggedLots.length ? flaggedLots : lots.filter((l) => lotIds.has(l.id) && ["RM-CARB", "RM-SHEA"].includes(l.materialId));
      const items = keyLots.map((l) => {
        const users = allBatches.filter((b) => !inv.batchIds.includes(b.id) && b.lots.some((u) => u.lotId === l.id));
        return `${l.id}: also used in ${users.length} other batch(es)${users.length ? ` — ${users.slice(0, 6).map((b) => `${b.id}${b.lab ? "" : " (no lab result yet)"}`).join(", ")}${users.length > 6 ? "…" : ""}` : ""}.`;
      });
      return { ...base, title: "Related batches by shared ingredient lots", sections: [{ heading: "Shared lots", items }, { heading: "Suggested next step", items: ["Review unreleased batches that share these lots before their release decision."] }] };
    }
    case "organizeEvidence": {
      return {
        ...base,
        title: "Evidence organised by suspected factor",
        sections: inv.factors.map((f) => ({
          heading: `${f.factor} — likelihood ${f.likelihood.toLowerCase()} (team assessment)`,
          items: [
            `Evidence recorded: ${f.evidence}`,
            ...inv.notes.filter((n) => f.factor.split(/\s+/).some((w) => w.length > 4 && n.text.toLowerCase().includes(w.toLowerCase()))).map((n) => `Supporting note — ${n.author}: ${n.text.slice(0, 120)}…`),
            ...inv.attachments.filter((a) => f.factor.split(/\s+/).some((w) => w.length > 4 && a.name.toLowerCase().includes(w.toLowerCase()))).map((a) => `Attachment: ${a.name}`),
          ],
        })),
      };
    }
    case "summary": {
      const top = [...inv.factors].sort((a, b) => ["Low", "Medium", "High"].indexOf(b.likelihood) - ["Low", "Medium", "High"].indexOf(a.likelihood))[0];
      return {
        ...base,
        title: "Draft investigation summary (requires review)",
        sections: [
          { heading: "Scope", items: [`${inv.property} variation across ${inv.batchIds.length} batches (${inv.batchIds.join(", ")}). Investigation opened ${inv.createdAt}, owner ${inv.owner}.`] },
          { heading: "What was measured", items: [`${measured.length} of ${batches.length} batches have laboratory results. ${inv.attachments.length} supporting document(s) attached.`] },
          { heading: "Leading hypothesis", items: [top ? `${top.factor} — currently rated ${top.likelihood.toLowerCase()} likelihood by the team. This is an association unless confirmed by a verification test.` : "No suspected factors recorded yet."] },
          { heading: "Status", items: [inv.conclusion?.rootCauseStatus ? `Conclusion drafted: ${inv.conclusion.rootCauseStatus}.` : "No conclusion documented. A verification test is recommended before confirming a cause."] },
        ],
      };
    }
    case "missingInfo": {
      const gaps: string[] = [];
      const noLab = batches.filter((b) => !b.lab);
      if (noLab.length) gaps.push(`Laboratory results missing for ${noLab.map((b) => b.id).join(", ")}.`);
      if (!inv.attachments.some((a) => a.kind === "Lab report")) gaps.push("No laboratory report attached.");
      if (!inv.attachments.some((a) => a.kind === "Certificate of analysis")) gaps.push("No certificate of analysis attached for the suspected ingredient lot.");
      if (!inv.attachments.some((a) => a.kind === "Batch record")) gaps.push("No batch manufacturing record attached to verify process conditions.");
      if (!inv.notes.some((n) => classifyNote(n).category === "Verification test")) gaps.push("No verification test (e.g. lab-scale substitution trial) recorded — cause cannot be confirmed.");
      if (!inv.factors.length) gaps.push("No suspected contributing factors recorded.");
      if (!inv.conclusion) gaps.push("Conclusion not documented.");
      else if (!inv.conclusion.approvedBy) gaps.push("Conclusion awaiting quality approval.");
      if (!inv.notes.some((n) => classifyNote(n).category === "Lab method")) gaps.push("Measurement method not reviewed (instrument, spindle, temperature equilibration).");
      return { ...base, title: gaps.length ? `${gaps.length} gaps identified` : "No gaps identified", sections: [{ heading: "Missing information", items: gaps.length ? gaps : ["The record appears complete. Final review remains with the quality team."] }] };
    }
  }
}
