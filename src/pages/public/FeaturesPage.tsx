import { Check, FileText, FlaskConical, GitFork, LineChart, ScanSearch, Sparkles, Boxes, Bot } from "lucide-react";
import { CtaBand, PageHero, Section } from "@/components/marketing/Marketing";

const FEATURES = [
  { icon: Boxes, t: "Batch management", d: "A complete production record for every batch.", pts: ["Product, family, facility and equipment", "Mixing speed, duration, temperature and cooling rate", "Ingredient lots and quantities consumed", "Laboratory measurements with method and analyst"] },
  { icon: GitFork, t: "Batch genealogy", d: "Interactive traceability across your supply chain.", pts: ["Supplier → material → lot → batch → lab result", "Where-used search for any ingredient lot", "Click through between related records", "Flagged and quarantined lots highlighted"] },
  { icon: Sparkles, t: "Deviation prediction", d: "Risk estimates against manufacturer-defined specifications.", pts: ["Viscosity and appearance deviation risk", "Predicted value with interval and model confidence", "Contributing variables for each estimate", "Recommended investigation actions"] },
  { icon: LineChart, t: "Pattern discovery", d: "Explore associations across materials and process.", pts: ["Correlation matrix across process variables", "Supplier and equipment comparisons", "Trend analysis with specification bands", "Side-by-side batch comparison"] },
  { icon: ScanSearch, t: "Quality investigations", d: "A structured workspace for every inconsistency.", pts: ["Affected batches, owners and priority", "Lab attachments and investigation notes", "Suspected factors with likelihood", "Documented, approved conclusions"] },
  { icon: Bot, t: "AI investigation assistant", d: "Help organising evidence — not making decisions.", pts: ["Classify investigation notes", "Summarise laboratory observations", "Identify related batches by shared lots", "Highlight missing information"] },
  { icon: FileText, t: "Reports & exports", d: "Traceable documentation for audits and reviews.", pts: ["Investigation reports as PDF", "Batch and lab data as CSV", "Genealogy, conditions and conclusions", "Predicted vs measured clearly labelled"] },
  { icon: FlaskConical, t: "Configurable specifications", d: "Your targets, your limits.", pts: ["Viscosity target and range per product family", "Appearance ΔE alert and limit", "Changes attributed and dated", "Predictions re-evaluated instantly"] },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="Everything a quality team needs to explain batch variation" text="From registering a batch to documenting an approved conclusion, BlendQuoin keeps the evidence connected and the reasoning traceable." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-xl border border-navy-100 bg-white p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-900 text-mint-300"><f.icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold text-navy-900">{f.t}</div>
                  <div className="text-sm text-navy-500">{f.d}</div>
                </div>
              </div>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {f.pts.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-navy-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
