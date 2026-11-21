import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, FlaskConical, GitFork, LineChart, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, DataFlowIllustration, ProductPreview, Section, SectionHeading, WORKFLOW } from "@/components/marketing/Marketing";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint-50 via-white to-white">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="container relative grid items-center gap-14 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white px-3 py-1 text-xs font-medium text-forest-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" /> Production analytics for cosmetics &amp; personal care
            </div>
            <h1 className="mt-6 text-[42px] font-semibold leading-[1.06] tracking-tight text-navy-900 sm:text-[56px]">
              Understand What’s Changing Between Your Production Batches.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">
              BlendQuoin connects ingredient lots, manufacturing conditions, and laboratory results to help quality teams identify patterns behind inconsistent production outcomes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/register">Request a pilot <ArrowRight /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/login">Explore the live demo</Link></Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-navy-100 pt-6">
              {[
                ["Viscosity", "& appearance specs"],
                ["Lot-level", "genealogy"],
                ["Human-approved", "conclusions"],
              ].map(([a, b]) => (
                <div key={a}>
                  <div className="text-sm font-semibold text-navy-900">{a}</div>
                  <div className="text-xs text-navy-400">{b}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-forest-200/40 via-mint-100/40 to-transparent blur-2xl" />
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section className="border-y border-navy-100 bg-white py-16 sm:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            ["Same formula, different batch", "Viscosity drifts and colour shifts appear even when the formula and SOP haven’t changed."],
            ["Data lives in silos", "Supplier CoAs, batch records and lab results sit in different systems, so root-cause work starts from scratch."],
            ["Waste is found too late", "Out-of-specification results trigger rework, holds and disposal after the batch is already made."],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <div className="font-mono text-sm font-medium text-forest-500">0{i + 1}</div>
              <div>
                <div className="font-semibold text-navy-900">{t}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section>
        <SectionHeading eyebrow="Platform" title="One traceable record from supplier lot to lab result" text="BlendQuoin brings together the information quality teams need to explain batch variation — and keeps measured, predicted and approved information clearly separate." />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: GitFork, t: "Batch genealogy", d: "Trace every finished batch to its ingredient lots, suppliers, equipment and process conditions — and find every batch that used a given lot." },
            { icon: Sparkles, t: "Deviation prediction", d: "Estimate viscosity and appearance risk against your specifications, with confidence and contributing variables." },
            { icon: LineChart, t: "Pattern discovery", d: "Correlation, trend and batch-comparison views that separate statistical association from proven cause." },
            { icon: ScanSearch, t: "Investigation workspace", d: "Structured investigations with affected batches, lab attachments, notes, suspected factors and owners." },
            { icon: FlaskConical, t: "AI investigation assistant", d: "Classify notes, summarise lab observations, find related batches and highlight missing information." },
            { icon: ShieldCheck, t: "Traceable reports", d: "Export investigation reports with genealogy, conditions, measurements and approved conclusions as PDF or CSV." },
          ].map((f) => (
            <div key={f.t} className="group rounded-xl border border-navy-100 bg-white p-6 transition-shadow hover:shadow-[0_12px_30px_-12px_rgba(15,61,46,0.25)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700 group-hover:bg-forest-900 group-hover:text-mint-300"><f.icon className="h-5 w-5" /></div>
              <div className="mt-5 font-semibold text-navy-900">{f.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data flow */}
      <section className="relative overflow-hidden bg-navy-950 py-20 sm:py-24">
        <div className="grid-bg-dark absolute inset-0" />
        <div className="container relative">
          <SectionHeading dark center eyebrow="Connected data" title="From raw material to release decision" text="Every batch carries its upstream context, so a laboratory result can always be read alongside the lots and conditions that produced it." />
          <div className="mt-16"><DataFlowIllustration dark /></div>
        </div>
      </section>

      {/* Workflow */}
      <Section>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading eyebrow="Workflow" title="Built around how quality investigations actually run" text="Six steps, one record. Each step adds evidence to the next, so conclusions are documented with the data behind them." />
            <Button className="mt-8" variant="outline" asChild><Link to="/how-it-works">See how it works <ArrowRight /></Link></Button>
          </div>
          <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-forest-200">
            {WORKFLOW.map((s, i) => (
              <li key={s.title} className="relative flex gap-5 rounded-xl border border-navy-100 bg-white p-5">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-forest-200 bg-white text-forest-700"><s.icon className="h-4.5 w-4.5" /></div>
                <div>
                  <div className="font-mono text-[11px] text-forest-500">STEP 0{i + 1}</div>
                  <div className="font-semibold text-navy-900">{s.title}</div>
                  <p className="mt-1 text-sm text-navy-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Trust / separation */}
      <Section className="bg-mint-50/60">
        <SectionHeading center eyebrow="Scientific integrity" title="Measured, predicted and decided — never confused" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {[
            { icon: FlaskConical, t: "Measured", c: "border-navy-200", d: "Laboratory values recorded by your analysts with method and date. The only basis for release." },
            { icon: Sparkles, t: "Predicted", c: "border-dashed border-violet-300", d: "Model estimates with confidence and intervals. Used to prioritise testing and investigation — never as results." },
            { icon: BadgeCheck, t: "Decided", c: "border-forest-300", d: "Quality decisions and investigation conclusions, approved and attributed to a named person." },
          ].map((x) => (
            <div key={x.t} className={`rounded-xl border-2 bg-white p-6 ${x.c}`}>
              <x.icon className="h-6 w-6 text-forest-700" />
              <div className="mt-4 text-lg font-semibold text-navy-900">{x.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{x.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
