// Amazon Textract integration for laboratory reports and certificates of analysis.
import type { Attachment } from "@/data/types";
import { apiRequest } from "./apiClient";
import { awsConfig } from "./config";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function classifyDocument(name: string): Attachment["kind"] {
  const n = name.toLowerCase();
  if (n.includes("coa") || n.includes("certificate")) return "Certificate of analysis";
  if (n.includes("batch") || n.includes("bmr") || n.includes("record")) return "Batch record";
  if (n.includes("lab") || n.includes("qc") || n.includes("visc") || n.includes("colour") || n.includes("color") || n.includes("report")) return "Lab report";
  return "Other";
}

/** Returns key/value pairs extracted from a document. Simulated output is clearly marked by the caller. */
export async function extractDocument(file: File, context: { batchIds: string[] }): Promise<Record<string, string>> {
  if (awsConfig.enabled) {
    // 1. POST /documents → pre-signed S3 PUT URL; 2. upload; 3. POST /documents/{id}/extract (Textract AnalyzeDocument FORMS+TABLES)
    const { uploadUrl, documentId } = await apiRequest<{ uploadUrl: string; documentId: string }>("/documents", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    await fetch(uploadUrl, { method: "PUT", body: file });
    return apiRequest<Record<string, string>>(`/documents/${documentId}/extract`, { method: "POST" });
  }
  await delay(900);
  const kind = classifyDocument(file.name);
  const batch = context.batchIds[0] ?? "—";
  switch (kind) {
    case "Certificate of analysis":
      return { "Document type": "Certificate of analysis", "Lot number": "detected in header", "Critical property": "Viscosity / colour value present", "Supplier signature": "Present", "Review needed": "Confirm values against incoming inspection" };
    case "Batch record":
      return { "Document type": "Batch manufacturing record", Batch: batch, "Mixing speed": "2,790 rpm", "Emulsification temp.": "76.2 °C", "Hold time": "18 min", "Operator sign-off": "Present" };
    case "Lab report":
      return { "Document type": "QC laboratory report", Batch: batch, "Viscosity (Brookfield)": "14,880 cP", "Appearance": "Slight variation vs. standard", "pH": "5.62", "Analyst": "Signature present" };
    default:
      return { "Document type": "Unclassified", Pages: String(1 + Math.floor(file.size / 60000)), Note: "No structured fields recognised" };
  }
}
