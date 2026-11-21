import { ClipboardCheck, Factory, Truck, FlaskConical } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "@/components/marketing/Marketing";

const ROLES = [
  { icon: ClipboardCheck, t: "Quality assurance", q: "Why did this batch fail viscosity when the last ten passed?", pts: ["Open investigations with all upstream context attached", "Document conclusions with clear approval", "Export audit-ready reports"] },
  { icon: Factory, t: "Process engineering", q: "Is it the material, the mixer, or the temperature profile?", pts: ["Compare process conditions across batches", "See equipment-specific offsets", "Review associations between settings and outcomes"] },
  { icon: Truck, t: "Supplier quality", q: "Which finished batches used this lot?", pts: ["Where-used genealogy for every ingredient lot", "Compare suppliers on downstream outcomes", "Flag and quarantine lots with evidence"] },
  { icon: FlaskConical, t: "QC laboratory", q: "Which batches should we test first?", pts: ["Prioritise by predicted deviation risk", "Record measurements with method and analyst", "Attach and extract lab reports"] },
];

export default function SolutionsPage() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="For every team that touches batch quality" text="BlendQuoin starts with one cosmetics product family — creams, lotions and emulsions where viscosity and appearance matter most — and grows with your portfolio." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.t} className="rounded-xl border border-navy-100 p-7">
              <r.icon className="h-7 w-7 text-forest-600" />
              <div className="mt-4 text-lg font-semibold text-navy-900">{r.t}</div>
              <p className="mt-2 border-l-2 border-mint-300 pl-3 text-[15px] italic text-navy-500">“{r.q}”</p>
              <ul className="mt-5 space-y-2 text-sm text-navy-600">
                {r.pts.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-forest-500" />{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section className="bg-navy-950">
        <SectionHeading dark eyebrow="Product focus" title="Starting where variation costs the most" text="Emulsion-based skin care is sensitive to thickener lots, emollient colour, emulsification temperature and shear. BlendQuoin’s initial model focuses on viscosity and appearance for one product family, with specifications you define." />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[["Face creams", "O/W emulsions, 15–21k cP"], ["Body lotions", "Low-viscosity emulsions"], ["Gels & serums", "On the roadmap"]].map(([a, b]) => (
            <div key={a} className="rounded-lg border border-navy-800 bg-navy-900 p-5">
              <div className="font-semibold text-white">{a}</div>
              <div className="text-sm text-navy-300">{b}</div>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
