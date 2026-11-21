// Realistic demonstration data for BlendQuoin.
// All data is generated deterministically from a seeded RNG so every demo looks identical.
import type {
  Batch,
  BatchStatus,
  Equipment,
  IngredientLot,
  Investigation,
  LabMeasurement,
  RawMaterial,
  Specification,
  Supplier,
  TeamMember,
} from "./types";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261121);
const gauss = () => {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return iso(x);
};

export const TEAM: TeamMember[] = [
  { name: "Adaeze Okafor", role: "Quality Manager", initials: "AO" },
  { name: "Daniel Mensah", role: "Process Engineer", initials: "DM" },
  { name: "Priya Raman", role: "QC Laboratory Lead", initials: "PR" },
  { name: "Tom Whitfield", role: "QC Analyst", initials: "TW" },
  { name: "Grace Eze", role: "Supplier Quality Specialist", initials: "GE" },
];

export const FACILITIES = ["Ikeja Plant, Lagos", "Stourton Plant, Leeds"];

export const PRODUCT_FAMILIES = ["Face Creams", "Body Lotions"] as const;

export const PRODUCTS: Record<string, string[]> = {
  "Face Creams": ["Hydra Silk Day Cream", "Barrier Repair Night Cream", "Calm Botanics Face Cream"],
  "Body Lotions": ["Daily Glow Body Lotion", "Shea Comfort Body Lotion"],
};

export const SUPPLIERS: Supplier[] = [
  { id: "SUP-01", name: "Lumina Polymers GmbH", country: "Germany", approvedSince: "2019-03-11", qualificationScore: 94, contact: "quality@lumina-polymers.example" },
  { id: "SUP-02", name: "Orbis Polymer Trading", country: "India", approvedSince: "2026-05-20", qualificationScore: 78, contact: "qa@orbis-polymer.example" },
  { id: "SUP-03", name: "Kestrel Specialty Chemicals", country: "Netherlands", approvedSince: "2018-09-02", qualificationScore: 91, contact: "coa@kestrel-chem.example" },
  { id: "SUP-04", name: "Atlantic Naturals SA", country: "Spain", approvedSince: "2020-01-15", qualificationScore: 88, contact: "quality@atlantic-naturals.example" },
  { id: "SUP-05", name: "Sahel Shea Cooperative", country: "Ghana", approvedSince: "2021-06-30", qualificationScore: 83, contact: "export@sahelshea.example" },
  { id: "SUP-06", name: "Nordic Gums AB", country: "Sweden", approvedSince: "2017-11-21", qualificationScore: 96, contact: "support@nordicgums.example" },
];

export const RAW_MATERIALS: RawMaterial[] = [
  { id: "RM-CARB", name: "Carbomer 940", inci: "Carbomer", role: "Thickener", criticalProperty: "Neutralised viscosity (0.5%)" },
  { id: "RM-XAN", name: "Xanthan Gum", inci: "Xanthan Gum", role: "Stabiliser", criticalProperty: "Viscosity (1% sol.)" },
  { id: "RM-CET", name: "Cetearyl Alcohol", inci: "Cetearyl Alcohol", role: "Co-emulsifier", criticalProperty: "Melting point" },
  { id: "RM-SHEA", name: "Shea Butter (refined)", inci: "Butyrospermum Parkii Butter", role: "Emollient", criticalProperty: "Colour (Lovibond Y)" },
  { id: "RM-SQU", name: "Squalane", inci: "Squalane", role: "Emollient", criticalProperty: "Colour (APHA)" },
  { id: "RM-GLY", name: "Glycerin 99.5%", inci: "Glycerin", role: "Humectant", criticalProperty: "Assay" },
];

const lot = (
  id: string,
  materialId: string,
  supplierId: string,
  receivedDate: string,
  coaValue: number,
  coaUnit: string,
  status: IngredientLot["status"] = "Released",
  alert?: string
): IngredientLot => ({ id, materialId, supplierId, receivedDate, expiryDate: addDays(receivedDate, 540), quantityKg: 400 + Math.round(rand() * 800), status, coaValue, coaUnit, alert });

export const LOTS: IngredientLot[] = [
  // Carbomer — Orbis lot 2609 carries a weaker effective viscosity than its CoA suggests.
  lot("LP-CB-2605", "RM-CARB", "SUP-01", "2026-05-12", 45800, "cP"),
  lot("LP-CB-2607", "RM-CARB", "SUP-01", "2026-07-08", 45200, "cP"),
  lot("OP-CB-2609", "RM-CARB", "SUP-02", "2026-09-04", 41900, "cP", "Flagged", "Associated with 6 low-viscosity batches; CoA value 7% below Lumina lots"),
  lot("LP-CB-2610", "RM-CARB", "SUP-01", "2026-10-14", 45500, "cP"),
  // Xanthan
  lot("NG-XG-2604", "RM-XAN", "SUP-06", "2026-04-20", 1420, "cP"),
  lot("NG-XG-2608", "RM-XAN", "SUP-06", "2026-08-11", 1390, "cP"),
  // Cetearyl alcohol
  lot("KS-CA-2605", "RM-CET", "SUP-03", "2026-05-02", 50.4, "°C"),
  lot("KS-CA-2609", "RM-CET", "SUP-03", "2026-09-01", 50.1, "°C"),
  // Shea — Sahel lot 2608 is darker (higher Lovibond Y).
  lot("AN-SH-2605", "RM-SHEA", "SUP-04", "2026-05-18", 5.8, "Y"),
  lot("SC-SH-2608", "RM-SHEA", "SUP-05", "2026-08-03", 9.4, "Y", "Quarantine", "Colour above internal alert limit (8.0 Y); 3 appearance deviations under review"),
  lot("AN-SH-2610", "RM-SHEA", "SUP-04", "2026-10-02", 6.1, "Y"),
  // Squalane
  lot("AN-SQ-2604", "RM-SQU", "SUP-04", "2026-04-28", 18, "APHA"),
  lot("AN-SQ-2609", "RM-SQU", "SUP-04", "2026-09-09", 21, "APHA"),
  // Glycerin
  lot("KS-GL-2605", "RM-GLY", "SUP-03", "2026-05-05", 99.7, "%"),
  lot("KS-GL-2609", "RM-GLY", "SUP-03", "2026-09-12", 99.6, "%"),
];

export const EQUIPMENT: Equipment[] = [
  { id: "MX-01", name: "Vacuum Emulsifier 500 L", type: "Vacuum homogenising mixer", facility: FACILITIES[0], lastCalibrated: "2026-08-14" },
  { id: "MX-02", name: "Vacuum Emulsifier 1000 L", type: "Vacuum homogenising mixer", facility: FACILITIES[0], lastCalibrated: "2026-06-02" },
  { id: "MX-03", name: "Process Vessel 750 L", type: "Jacketed mixing vessel + inline homogeniser", facility: FACILITIES[1], lastCalibrated: "2026-09-21" },
];

export const SEED_SPECS: Specification[] = [
  { productFamily: "Face Creams", viscosity: { target: 18000, min: 15000, max: 21000, unit: "cP" }, appearance: { maxDeltaE: 1.5, monitorDeltaE: 1.0 }, updatedBy: "Adaeze Okafor", updatedAt: "2026-05-30" },
  { productFamily: "Body Lotions", viscosity: { target: 8000, min: 6500, max: 9500, unit: "cP" }, appearance: { maxDeltaE: 1.8, monitorDeltaE: 1.2 }, updatedBy: "Adaeze Okafor", updatedAt: "2026-05-30" },
];

// --- Batch generation -------------------------------------------------------

const lotsFor = (materialId: string) => LOTS.filter((l) => l.materialId === materialId).sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));

/** Pick the lot in use on a given date. Optional override lets us plant realistic patterns. */
function activeLot(materialId: string, date: string, prefer?: (l: IngredientLot) => boolean): IngredientLot {
  const candidates = lotsFor(materialId).filter((l) => l.receivedDate <= date);
  const preferred = prefer ? candidates.filter(prefer) : [];
  if (preferred.length) return preferred[preferred.length - 1];
  return candidates[candidates.length - 1] ?? lotsFor(materialId)[0];
}

/** Hidden effective strength of each carbomer lot (the CoA does not tell the whole story). */
const EFFECTIVE_CARBOMER: Record<string, number> = { "LP-CB-2605": 45800, "LP-CB-2607": 45100, "OP-CB-2609": 37600, "LP-CB-2610": 45600 };
const EQUIPMENT_OFFSET: Record<string, number> = { "MX-01": 0, "MX-02": -250, "MX-03": 420 };

function generateBatches(): Batch[] {
  const batches: Batch[] = [];
  const start = new Date("2026-06-01");
  const total = 72;
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + Math.round(i * 2.4));
    const date = iso(d);
    const family = rand() < 0.74 ? "Face Creams" : "Body Lotions";
    const products = PRODUCTS[family];
    const productName = products[Math.floor(rand() * products.length)];
    const facility = rand() < 0.68 ? FACILITIES[0] : FACILITIES[1];
    const equipmentId = facility === FACILITIES[1] ? "MX-03" : rand() < 0.55 ? "MX-01" : "MX-02";
    const sizeKg = equipmentId === "MX-02" ? 900 : equipmentId === "MX-03" ? 700 : 450;

    // Planted pattern 1: Orbis carbomer used at Ikeja between mid-Sep and late Oct.
    const useOrbis = date >= "2026-09-10" && date <= "2026-10-24" && facility === FACILITIES[0] && rand() < 0.8;
    const carb = activeLot("RM-CARB", date, useOrbis ? (l) => l.supplierId === "SUP-02" : (l) => l.supplierId === "SUP-01");
    // Planted pattern 2: Sahel shea in Aug–Sep, mainly in botanic products.
    const useSahel = date >= "2026-08-05" && date <= "2026-09-30" && (productName.includes("Botanics") || productName.includes("Shea") || rand() < 0.35);
    const shea = activeLot("RM-SHEA", date, useSahel ? (l) => l.supplierId === "SUP-05" : (l) => l.supplierId === "SUP-04");
    const xan = activeLot("RM-XAN", date);
    const cet = activeLot("RM-CET", date);
    const squ = activeLot("RM-SQU", date);
    const gly = activeLot("RM-GLY", date);

    const mixing = {
      mixingSpeedRpm: Math.round(2800 + gauss() * 160),
      homogenizerRpm: Math.round(3600 + gauss() * 220),
      mixingDurationMin: Math.round(45 + gauss() * 4),
      emulsificationTempC: round(75 + gauss() * 2.4 + (equipmentId === "MX-02" ? 1.4 : 0), 1),
      coolingRateCPerMin: round(Math.max(0.5, 1.3 + gauss() * 0.28), 2),
    };
    const processingDurationMin = mixing.mixingDurationMin + Math.round(95 + gauss() * 12);

    const familyScale = family === "Face Creams" ? 1 : 8000 / 18000;
    const viscosityTrue =
      familyScale *
      (18000 * (1 + 0.62 * (EFFECTIVE_CARBOMER[carb.id] / 45500 - 1)) +
        (mixing.mixingSpeedRpm - 2800) * -1.1 +
        (mixing.mixingDurationMin - 45) * 70 +
        (mixing.emulsificationTempC - 75) * -160 +
        EQUIPMENT_OFFSET[equipmentId] +
        gauss() * 520);
    const deltaETrue = Math.max(
      0.15,
      0.55 + 0.17 * (shea.coaValue - 6) + Math.max(0, mixing.emulsificationTempC - 77.5) * 0.22 + (mixing.coolingRateCPerMin < 1.0 ? 0.25 : 0) + gauss() * 0.13
    );

    const seq = String(140 + i).padStart(4, "0");
    const id = `${family === "Face Creams" ? "FC" : "BL"}26-${seq}`;
    const recent = i >= total - 6;
    let lab: LabMeasurement | null = null;
    if (!recent) {
      const grade: LabMeasurement["appearanceGrade"] = deltaETrue > 1.6 ? "Non-conforming" : deltaETrue > 1.0 ? "Slight variation" : "Conforms";
      lab = {
        viscosityCps: Math.round(viscosityTrue / 10) * 10,
        appearanceDeltaE: round(deltaETrue, 2),
        appearanceGrade: grade,
        pH: round(5.6 + gauss() * 0.12, 2),
        specificGravity: round(0.985 + gauss() * 0.006, 3),
        measuredAt: addDays(date, 1),
        analyst: rand() < 0.5 ? "Priya Raman" : "Tom Whitfield",
        method: "Brookfield RV, spindle 6, 10 rpm, 25 °C · Spectrophotometer CIE ΔE*ab vs. ref. std.",
      };
    }

    batches.push({
      id,
      productName,
      productFamily: family,
      productionDate: date,
      facility,
      equipmentId,
      sizeKg,
      lots: [
        { lotId: carb.id, quantityKg: round(sizeKg * 0.005, 2) },
        { lotId: xan.id, quantityKg: round(sizeKg * 0.002, 2) },
        { lotId: cet.id, quantityKg: round(sizeKg * 0.035, 1) },
        { lotId: shea.id, quantityKg: round(sizeKg * (productName.includes("Shea") ? 0.06 : 0.03), 1) },
        { lotId: squ.id, quantityKg: round(sizeKg * 0.04, 1) },
        { lotId: gly.id, quantityKg: round(sizeKg * 0.05, 1) },
      ],
      mixing,
      processingDurationMin,
      lab,
      status: "Released",
    });
  }

  // Planted pattern 3: remaining Orbis carbomer stock and a hot, slow-cooled run among
  // batches still awaiting laboratory results — these drive the predicted-deviation demo.
  const pending = batches.slice(-6);
  const forceFaceCream = (b: Batch, product: string, equipmentId: string) => {
    b.productFamily = "Face Creams";
    b.productName = product;
    b.id = b.id.replace(/^BL/, "FC");
    b.facility = FACILITIES[0];
    b.equipmentId = equipmentId;
  };
  forceFaceCream(pending[1], "Hydra Silk Day Cream", "MX-02");
  pending[1].lots[0].lotId = "OP-CB-2609";
  pending[1].mixing.emulsificationTempC = 77.1;
  forceFaceCream(pending[3], "Hydra Silk Day Cream", "MX-01");
  pending[3].lots[0].lotId = "OP-CB-2609";
  pending[3].mixing.mixingSpeedRpm = 3020;
  forceFaceCream(pending[4], "Calm Botanics Face Cream", "MX-02");
  pending[4].mixing.emulsificationTempC = 80.2;
  pending[4].mixing.coolingRateCPerMin = 0.82;
  return batches;
}

function assignStatuses(batches: Batch[], specs: Specification[]) {
  batches.forEach((b, idx) => {
    const spec = specs.find((s) => s.productFamily === b.productFamily)!;
    if (!b.lab) {
      b.status = idx >= batches.length - 2 ? "In production" : "Awaiting lab";
      return;
    }
    const v = b.lab.viscosityCps;
    const out = v < spec.viscosity.min || v > spec.viscosity.max || b.lab.appearanceDeltaE > spec.appearance.maxDeltaE;
    const margin = (spec.viscosity.max - spec.viscosity.min) * 0.1;
    const near = v < spec.viscosity.min + margin || v > spec.viscosity.max - margin || b.lab.appearanceDeltaE > spec.appearance.monitorDeltaE;
    const isRecent = b.productionDate >= "2026-10-20";
    if (out) {
      b.status = isRecent ? "Quality review" : "Under investigation";
    } else if ((near && isRecent) || b.productionDate >= "2026-11-06") {
      b.status = "Quality review"; // measured, awaiting a human release decision
    } else {
      b.status = "Released";
      b.decision = {
        decision: "Approved for release",
        by: "Adaeze Okafor",
        date: addDays(b.productionDate, 3),
        note: near ? "Within specification; close to limit — trend noted." : "All release tests within specification.",
      };
    }
  });
  // A few older out-of-spec batches were concluded: one reworked, one put on hold.
  const oos = batches.filter((b) => b.status === "Under investigation");
  if (oos[0]) {
    oos[0].status = "On hold";
  }
}

export const SEED_BATCHES: Batch[] = generateBatches();
assignStatuses(SEED_BATCHES, SEED_SPECS);

// --- Investigations -----------------------------------------------------------

const orbisBatches = SEED_BATCHES.filter((b) => b.productFamily === "Face Creams" && b.lots.some((l) => l.lotId === "OP-CB-2609") && b.lab).map((b) => b.id);
const sahelBatches = SEED_BATCHES.filter((b) => b.lots.some((l) => l.lotId === "SC-SH-2608") && b.lab && b.lab.appearanceDeltaE > 1.0).map((b) => b.id);
const earlyHighVisc = SEED_BATCHES.filter((b) => b.equipmentId === "MX-03" && b.lab && b.productionDate < "2026-08-15").map((b) => b.id).slice(0, 3);

export const SEED_INVESTIGATIONS: Investigation[] = [
  {
    id: "INV-2026-014",
    title: "Low viscosity across Ikeja face cream batches (Sep–Oct)",
    status: "In progress",
    priority: "High",
    owner: "Daniel Mensah",
    createdAt: "2026-10-08",
    property: "Viscosity",
    batchIds: orbisBatches.slice(0, 6),
    attachments: [
      { id: "att-1", name: "QC_viscosity_report_wk40.pdf", kind: "Lab report", sizeKb: 412, uploadedAt: "2026-10-08", uploadedBy: "Priya Raman", extracted: { "Test method": "Brookfield RV sp.6 10 rpm", "Batches tested": "4", "Mean viscosity": "14,620 cP", "Specification": "15,000–21,000 cP" } },
      { id: "att-2", name: "CoA_OP-CB-2609.pdf", kind: "Certificate of analysis", sizeKb: 188, uploadedAt: "2026-10-09", uploadedBy: "Grace Eze", extracted: { Supplier: "Orbis Polymer Trading", Lot: "OP-CB-2609", "Viscosity (0.5%)": "41,900 cP", "Spec (supplier)": "40,000–60,000 cP" } },
    ],
    notes: [
      { id: "n1", author: "Priya Raman", date: "2026-10-08", text: "Four consecutive Hydra Silk batches measured below 15,000 cP. Re-tested retained samples at 25 °C after 24 h equilibration — results reproducible within ±3%.", category: "Laboratory observation" },
      { id: "n2", author: "Grace Eze", date: "2026-10-09", text: "All affected batches used carbomer lot OP-CB-2609 from Orbis Polymer Trading (new supplier, approved May 2026). CoA value is within supplier spec but ~7% below our historical Lumina lots.", category: "Raw material" },
      { id: "n3", author: "Daniel Mensah", date: "2026-10-11", text: "Mixing speed and emulsification temperature logs reviewed for MX-01 and MX-02 — no excursions outside validated ranges. Neutralisation step timing consistent with SOP-PRD-022.", category: "Process" },
    ],
    factors: [
      { id: "f1", factor: "Carbomer lot OP-CB-2609 (Orbis Polymer Trading)", evidence: "Present in all 6 affected batches; absent in comparable in-spec batches from the same period.", likelihood: "High" },
      { id: "f2", factor: "Emulsification temperature at upper end of range on MX-02", evidence: "Mean 76.6 °C vs 74.9 °C on MX-01; weak negative association with viscosity.", likelihood: "Low" },
    ],
  },
  {
    id: "INV-2026-011",
    title: "Yellow tint in Calm Botanics and Shea Comfort batches",
    status: "Pending approval",
    priority: "Medium",
    owner: "Adaeze Okafor",
    createdAt: "2026-09-02",
    property: "Appearance",
    batchIds: sahelBatches.slice(0, 5),
    attachments: [
      { id: "att-3", name: "Colour_measurement_Aug.xlsx", kind: "Lab report", sizeKb: 96, uploadedAt: "2026-09-02", uploadedBy: "Tom Whitfield", extracted: { Instrument: "Spectrophotometer CM-5", "Max ΔE*ab": "1.94", Illuminant: "D65/10°" } },
    ],
    notes: [
      { id: "n4", author: "Tom Whitfield", date: "2026-09-02", text: "Visual inspection flagged a slight yellow tint versus reference standard. ΔE values 1.2–1.9 on affected batches.", category: "Laboratory observation" },
      { id: "n5", author: "Grace Eze", date: "2026-09-05", text: "Shea butter lot SC-SH-2608 CoA colour 9.4 Lovibond Y, above our internal alert limit of 8.0. Lot moved to quarantine.", category: "Raw material" },
      { id: "n6", author: "Adaeze Okafor", date: "2026-09-20", text: "Lab-scale trial with retained AN-SH-2605 shea produced ΔE 0.6 under identical process conditions. Supports raw material colour as the main contributor.", category: "Verification test" },
    ],
    factors: [
      { id: "f3", factor: "Shea butter lot SC-SH-2608 colour (9.4 Y)", evidence: "Lab-scale substitution trial reduced ΔE from 1.7 to 0.6.", likelihood: "High" },
      { id: "f4", factor: "Emulsification temperature above 78 °C", evidence: "Two of five affected batches ran above 78 °C; association not consistent.", likelihood: "Medium" },
    ],
    conclusion: {
      summary: "Appearance variation is attributed to the colour of shea butter lot SC-SH-2608, confirmed by a lab-scale substitution trial. Process temperature may amplify the effect but was not independently tested.",
      rootCauseStatus: "Confirmed by testing",
      correctiveActions: "Lot SC-SH-2608 rejected. Incoming colour check added for shea butter (alert 8.0 Y). Supplier corrective action requested from Sahel Shea Cooperative.",
      approvedBy: "",
      approvedAt: "",
    },
  },
  {
    id: "INV-2026-008",
    title: "High viscosity drift on Leeds process vessel MX-03",
    status: "Closed",
    priority: "Low",
    owner: "Daniel Mensah",
    createdAt: "2026-07-22",
    property: "Viscosity",
    batchIds: earlyHighVisc,
    attachments: [],
    notes: [
      { id: "n7", author: "Daniel Mensah", date: "2026-07-22", text: "MX-03 batches running ~400 cP above Ikeja average. Still within specification but trending upward.", category: "Process" },
      { id: "n8", author: "Priya Raman", date: "2026-07-29", text: "Viscometer cross-check between sites completed. Difference of 60 cP — instrument not a major contributor.", category: "Lab method" },
    ],
    factors: [{ id: "f5", factor: "Inline homogeniser shear profile on MX-03", evidence: "Equipment-specific offset observed consistently; within validated range.", likelihood: "Medium" }],
    conclusion: {
      summary: "Equipment-specific viscosity offset on MX-03 is within specification and consistent. No product impact. Site-specific target monitoring adopted.",
      rootCauseStatus: "Probable — not confirmed",
      correctiveActions: "Added MX-03 offset to trend monitoring. No change to specification.",
      approvedBy: "Adaeze Okafor",
      approvedAt: "2026-08-12",
    },
  },
];

// Mark investigated batches consistently.
for (const inv of SEED_INVESTIGATIONS) {
  if (inv.status === "Closed") continue;
  for (const id of inv.batchIds) {
    const b = SEED_BATCHES.find((x) => x.id === id);
    if (b && b.status !== "On hold") {
      b.status = "Under investigation" as BatchStatus;
      delete b.decision;
    }
  }
}
