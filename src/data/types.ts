// Domain model for BlendQuoin.
// Three kinds of quality information are kept strictly apart:
//  1. MEASURED — laboratory results recorded by an analyst (LabMeasurement)
//  2. PREDICTED — model estimates, never a substitute for lab results (Prediction)
//  3. DECIDED — human-approved quality decisions (QualityDecision / InvestigationConclusion)

export type BatchStatus =
  | "In production"
  | "Awaiting lab"
  | "Released"
  | "Quality review"
  | "Under investigation"
  | "On hold";

export type PredictionStatus = "Within specification" | "Monitor" | "Potential deviation" | "Requires quality review";

export type LotStatus = "Released" | "Quarantine" | "Flagged";

export interface Supplier {
  id: string;
  name: string;
  country: string;
  approvedSince: string;
  qualificationScore: number; // 0-100 internal audit score
  contact: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  inci: string;
  role: string; // e.g. "Thickener", "Emollient"
  criticalProperty: string;
}

export interface IngredientLot {
  id: string; // lot code
  materialId: string;
  supplierId: string;
  receivedDate: string;
  expiryDate: string;
  quantityKg: number;
  status: LotStatus;
  /** Certificate of analysis value for the material's critical property (supplier-reported). */
  coaValue: number;
  coaUnit: string;
  alert?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  facility: string;
  lastCalibrated: string;
}

export interface MixingConditions {
  mixingSpeedRpm: number;
  homogenizerRpm: number;
  mixingDurationMin: number;
  emulsificationTempC: number;
  coolingRateCPerMin: number;
}

export interface LabMeasurement {
  viscosityCps: number;
  appearanceDeltaE: number; // colour difference vs. reference standard
  appearanceGrade: "Conforms" | "Slight variation" | "Non-conforming";
  pH: number;
  specificGravity: number;
  measuredAt: string;
  analyst: string;
  method: string;
}

export interface QualityDecision {
  decision: "Approved for release" | "Rework" | "Rejected";
  by: string;
  date: string;
  note: string;
}

export interface BatchLotUsage {
  lotId: string;
  quantityKg: number;
}

export interface Batch {
  id: string;
  productName: string;
  productFamily: string;
  productionDate: string;
  facility: string;
  equipmentId: string;
  sizeKg: number;
  lots: BatchLotUsage[];
  mixing: MixingConditions;
  processingDurationMin: number;
  lab: LabMeasurement | null;
  status: BatchStatus;
  decision?: QualityDecision;
}

export interface Specification {
  productFamily: string;
  viscosity: { target: number; min: number; max: number; unit: "cP" };
  appearance: { maxDeltaE: number; monitorDeltaE: number };
  updatedBy: string;
  updatedAt: string;
}

export interface ContributingVariable {
  variable: string;
  value: string;
  impact: number; // signed contribution to predicted value, in spec units
  direction: "increases" | "decreases";
}

export interface Prediction {
  batchId: string;
  property: "viscosity" | "appearance";
  predicted: number;
  intervalLow: number;
  intervalHigh: number;
  risk: number; // probability (0-1) of falling outside specification
  confidence: number; // 0-1
  status: PredictionStatus;
  contributors: ContributingVariable[];
  actions: string[];
  modelVersion: string;
  source: "simulated" | "sagemaker";
  generatedAt: string;
}

export type InvestigationStatus = "Open" | "In progress" | "Pending approval" | "Closed";

export interface InvestigationNote {
  id: string;
  author: string;
  date: string;
  text: string;
  category?: string; // assigned by AI classification (suggested) — editable by user
}

export interface Attachment {
  id: string;
  name: string;
  kind: "Lab report" | "Certificate of analysis" | "Batch record" | "Other";
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
  extracted?: Record<string, string>; // fields extracted (simulated Textract)
}

export interface SuspectedFactor {
  id: string;
  factor: string;
  evidence: string;
  likelihood: "Low" | "Medium" | "High";
}

export interface InvestigationConclusion {
  summary: string;
  rootCauseStatus: "Confirmed by testing" | "Probable — not confirmed" | "Inconclusive";
  correctiveActions: string;
  approvedBy: string;
  approvedAt: string;
}

export interface Investigation {
  id: string;
  title: string;
  status: InvestigationStatus;
  priority: "Low" | "Medium" | "High";
  owner: string;
  createdAt: string;
  property: "Viscosity" | "Appearance" | "Viscosity & appearance";
  batchIds: string[];
  attachments: Attachment[];
  notes: InvestigationNote[];
  factors: SuspectedFactor[];
  conclusion?: InvestigationConclusion;
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
}
