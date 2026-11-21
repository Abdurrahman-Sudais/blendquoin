import type { Batch, Equipment, IngredientLot, Investigation, Prediction, RawMaterial, Specification, Supplier } from "@/data/types";
import { inSpecAppearance, inSpecViscosity, mean } from "./analytics";
import { rowsToCsv } from "./csv";

export interface ReportInput {
  investigation: Investigation;
  batches: Batch[];
  allBatches: Batch[];
  lots: IngredientLot[];
  materials: RawMaterial[];
  suppliers: Supplier[];
  equipment: Equipment[];
  predictions: Record<string, Prediction[]>;
  specFor: (family: string) => Specification;
  generatedBy: string;
}

export interface ReportData {
  title: string;
  meta: [string, string][];
  batchInfo: string[][];
  genealogy: string[][];
  conditions: string[][];
  lab: string[][];
  predictions: string[][];
  patterns: string[];
  notes: string[][];
  factors: string[][];
  conclusion: { status: string; summary: string; actions: string; approval: string } | null;
}

export function buildReport(i: ReportInput): ReportData {
  const { investigation: inv, batches, lots, materials, suppliers, equipment, predictions, specFor } = i;
  const sup = (id: string) => suppliers.find((s) => s.id === id)?.name ?? id;
  const mat = (id: string) => materials.find((m) => m.id === id)?.name ?? id;

  const lotRows = new Map<string, string[]>();
  batches.forEach((b) =>
    b.lots.forEach((u) => {
      const l = lots.find((x) => x.id === u.lotId)!;
      const row = lotRows.get(l.id) ?? [l.id, mat(l.materialId), sup(l.supplierId), `${l.coaValue.toLocaleString()} ${l.coaUnit}`, l.status, ""];
      row[5] = [row[5], b.id].filter(Boolean).join(", ");
      lotRows.set(l.id, row);
    })
  );

  // Observed patterns — computed associations (descriptive only)
  const patterns: string[] = [];
  const shared = [...lotRows.values()].filter((r) => r[5].split(", ").length === batches.length && batches.length > 1);
  shared.filter((r) => r[4] !== "Released" || ["Carbomer 940", "Shea Butter (refined)"].includes(r[1])).forEach((r) => patterns.push(`All ${batches.length} affected batches used lot ${r[0]} (${r[1]}, ${r[2]}; status ${r[4]}).`));
  const families = new Set(batches.map((b) => b.productFamily));
  const ref = i.allBatches.filter((b) => families.has(b.productFamily) && b.status === "Released" && b.lab && !inv.batchIds.includes(b.id));
  if (ref.length) {
    const t = mean(batches.map((b) => b.mixing.emulsificationTempC)) - mean(ref.map((b) => b.mixing.emulsificationTempC));
    patterns.push(`Mean emulsification temperature differs from released reference batches by ${t >= 0 ? "+" : ""}${t.toFixed(1)} °C (n=${ref.length}).`);
    const measured = batches.filter((b) => b.lab);
    if (measured.length) {
      const dv = mean(measured.map((b) => b.lab!.viscosityCps)) - mean(ref.map((b) => b.lab!.viscosityCps));
      patterns.push(`Mean measured viscosity is ${Math.round(dv).toLocaleString()} cP ${dv < 0 ? "below" : "above"} the reference mean.`);
    }
  }
  const eqs = new Set(batches.map((b) => b.equipmentId));
  patterns.push(eqs.size === 1 ? `All affected batches were produced on ${[...eqs][0]}.` : `Affected batches span ${eqs.size} pieces of equipment (${[...eqs].join(", ")}), which makes an equipment-specific cause less likely.`);
  patterns.push("These observations are statistical associations and do not by themselves establish cause.");

  return {
    title: `${inv.id} — ${inv.title}`,
    meta: [
      ["Investigation", inv.id],
      ["Property", inv.property],
      ["Status", inv.status],
      ["Priority", inv.priority],
      ["Owner", inv.owner],
      ["Opened", inv.createdAt],
      ["Report generated", `${new Date().toISOString().slice(0, 10)} by ${i.generatedBy}`],
    ],
    batchInfo: batches.map((b) => [b.id, b.productName, b.productFamily, b.productionDate, b.facility, `${b.equipmentId} · ${equipment.find((e) => e.id === b.equipmentId)?.name ?? ""}`, `${b.sizeKg} kg`, b.status]),
    genealogy: [...lotRows.values()],
    conditions: batches.map((b) => [b.id, String(b.mixing.mixingSpeedRpm), String(b.mixing.homogenizerRpm), String(b.mixing.mixingDurationMin), String(b.mixing.emulsificationTempC), String(b.mixing.coolingRateCPerMin), String(b.processingDurationMin)]),
    lab: batches.map((b) => {
      const s = specFor(b.productFamily);
      return b.lab
        ? [b.id, b.lab.viscosityCps.toLocaleString(), `${s.viscosity.min.toLocaleString()}–${s.viscosity.max.toLocaleString()}`, inSpecViscosity(b, s) ? "Within" : "OUT", b.lab.appearanceDeltaE.toFixed(2), `≤ ${s.appearance.maxDeltaE}`, inSpecAppearance(b, s) ? "Within" : "OUT", b.lab.measuredAt, b.lab.analyst]
        : [b.id, "—", `${s.viscosity.min.toLocaleString()}–${s.viscosity.max.toLocaleString()}`, "Awaiting", "—", `≤ ${s.appearance.maxDeltaE}`, "Awaiting", "—", "—"];
    }),
    predictions: batches.flatMap((b) =>
      (predictions[b.id] ?? []).map((p) => [
        b.id,
        p.property === "viscosity" ? "Viscosity" : "Appearance",
        p.property === "viscosity" ? `${p.predicted.toLocaleString()} cP` : p.predicted.toFixed(2),
        `${Math.round(p.risk * 100)}%`,
        `${Math.round(p.confidence * 100)}%`,
        p.status,
        p.contributors[0]?.variable ?? "—",
      ])
    ),
    patterns,
    notes: inv.notes.map((n) => [n.date, n.author, n.category ?? "General", n.text]),
    factors: inv.factors.map((f) => [f.factor, f.likelihood, f.evidence]),
    conclusion: inv.conclusion
      ? { status: inv.conclusion.rootCauseStatus, summary: inv.conclusion.summary, actions: inv.conclusion.correctiveActions, approval: inv.conclusion.approvedBy ? `Approved by ${inv.conclusion.approvedBy} on ${inv.conclusion.approvedAt}` : "NOT YET APPROVED — draft conclusion" }
      : null,
  };
}

export const HEADERS = {
  batchInfo: ["Batch", "Product", "Family", "Produced", "Facility", "Equipment", "Size", "Status"],
  genealogy: ["Lot", "Material", "Supplier", "CoA", "Lot status", "Used in"],
  conditions: ["Batch", "Mix speed (rpm)", "Homog. (rpm)", "Mix time (min)", "Emuls. temp (°C)", "Cooling (°C/min)", "Process time (min)"],
  lab: ["Batch", "Viscosity (cP)", "Spec", "Result", "ΔE", "Limit", "Result", "Measured", "Analyst"],
  predictions: ["Batch", "Property", "Predicted", "Risk", "Confidence", "Status", "Top contributor"],
  notes: ["Date", "Author", "Category", "Note"],
  factors: ["Suspected factor", "Likelihood", "Evidence"],
};

export function reportToCsv(r: ReportData): string {
  const section = (name: string, headers: string[], rows: string[][]) => [`# ${name}`, rowsToCsv([headers, ...rows])].join("\n");
  return [
    `# ${r.title}`,
    rowsToCsv(r.meta),
    "",
    section("Batch information", HEADERS.batchInfo, r.batchInfo),
    "",
    section("Ingredient genealogy", HEADERS.genealogy, r.genealogy),
    "",
    section("Production conditions", HEADERS.conditions, r.conditions),
    "",
    section("Laboratory measurements (MEASURED)", HEADERS.lab, r.lab),
    "",
    section("Predicted deviations (SIMULATED MODEL - NOT LAB RESULTS)", HEADERS.predictions, r.predictions),
    "",
    "# Observed patterns (statistical associations)",
    rowsToCsv(r.patterns.map((p) => [p])),
    "",
    section("Investigation notes", HEADERS.notes, r.notes),
    "",
    section("Suspected factors", HEADERS.factors, r.factors),
    "",
    "# Quality team conclusion (HUMAN DECISION)",
    r.conclusion ? rowsToCsv([["Root cause status", r.conclusion.status], ["Conclusion", r.conclusion.summary], ["Corrective & preventive actions", r.conclusion.actions], ["Approval", r.conclusion.approval]]) : "No conclusion documented",
  ].join("\n");
}

export async function reportToPdf(r: ReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const forest: [number, number, number] = [15, 61, 46];
  const navy: [number, number, number] = [15, 26, 43];

  doc.setFillColor(...forest);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BlendQuoin · Investigation report", 36, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(r.title, 36, 48);

  let y = 86;
  doc.setTextColor(...navy);
  doc.setFontSize(9);
  r.meta.forEach(([k, v], idx) => {
    const col = idx % 4, row = Math.floor(idx / 4);
    doc.setFont("helvetica", "bold");
    doc.text(k, 36 + col * 190, y + row * 26);
    doc.setFont("helvetica", "normal");
    doc.text(v, 36 + col * 190, y + row * 26 + 11);
  });
  y += 60;

  const heading = (t: string, note?: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...forest);
    doc.text(t, 36, y);
    if (note) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(note, 36, y + 11);
    }
    y += note ? 18 : 8;
  };
  const table = (head: string[], body: string[][], color: [number, number, number] = navy) => {
    autoTable(doc, { startY: y, head: [head], body: body.length ? body : [["—"]], margin: { left: 36, right: 36 }, styles: { fontSize: 8, cellPadding: 3.5 }, headStyles: { fillColor: color }, alternateRowStyles: { fillColor: [244, 248, 246] } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  };

  heading("1. Batch information"); table(HEADERS.batchInfo, r.batchInfo);
  heading("2. Ingredient genealogy", "CoA values are supplier-reported."); table(HEADERS.genealogy, r.genealogy);
  heading("3. Production conditions"); table(HEADERS.conditions, r.conditions);
  heading("4. Laboratory measurements", "MEASURED — recorded laboratory values."); table(HEADERS.lab, r.lab);
  heading("5. Predicted deviations", "PREDICTED — simulated model estimates. Not laboratory results; not a basis for release."); table(HEADERS.predictions, r.predictions, [91, 33, 182]);
  heading("6. Observed patterns", "Statistical associations — not proven causes.");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...navy);
  r.patterns.forEach((p) => { const lines = doc.splitTextToSize(`• ${p}`, W - 72); doc.text(lines, 36, y); y += lines.length * 11 + 2; });
  y += 12;
  heading("7. Investigation notes"); table(HEADERS.notes, r.notes);
  heading("8. Suspected contributing factors", "Team assessment."); table(HEADERS.factors, r.factors);
  heading("9. Quality team conclusion", "DECIDED — human-approved conclusion.");
  doc.setFontSize(9); doc.setTextColor(...navy);
  if (r.conclusion) {
    [["Root cause status", r.conclusion.status], ["Conclusion", r.conclusion.summary], ["Corrective & preventive actions", r.conclusion.actions], ["Approval", r.conclusion.approval]].forEach(([k, v]) => {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 40; }
      doc.setFont("helvetica", "bold"); doc.text(k, 36, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(v, W - 220); doc.text(lines, 200, y); y += lines.length * 11 + 6;
    });
  } else {
    doc.setFont("helvetica", "normal"); doc.text("No conclusion documented.", 36, y);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
    doc.text(`BlendQuoin · ${r.meta[0][1]} · Predictions are simulated estimates and do not replace laboratory release testing.`, 36, doc.internal.pageSize.getHeight() - 18);
    doc.text(`Page ${p} of ${pages}`, W - 80, doc.internal.pageSize.getHeight() - 18);
  }
  doc.save(`${r.meta[0][1]}-investigation-report.pdf`);
}

