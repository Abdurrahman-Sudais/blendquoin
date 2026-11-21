import { Link } from "react-router-dom";
import { Area, AreaChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ArrowRight, Boxes, FileText, FlaskConical, GitFork, Network, ScanSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WORKFLOW = [
  { icon: Boxes, title: "Register batches", text: "Capture product, facility, equipment, mixing conditions and processing time for every production batch." },
  { icon: GitFork, title: "Connect ingredient lots", text: "Link each batch to the supplier lots it consumed, with certificate-of-analysis values." },
  { icon: Network, title: "Analyse production data", text: "Explore statistical associations between materials, process settings and lab results." },
  { icon: Sparkles, title: "Identify potential deviations", text: "Estimate viscosity and appearance risk against your own specifications before results arrive." },
  { icon: ScanSearch, title: "Investigate evidence", text: "Open a structured investigation with genealogy, lab data, notes and suspected factors." },
  { icon: FileText, title: "Document findings", text: "Record human-approved conclusions and export traceable reports as PDF or CSV." },
];

export function Section({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("py-20 sm:py-24", className)}>
      <div className="container">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, text, center, dark }: { eyebrow?: string; title: string; text?: string; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <div className={cn("eyebrow mb-3", dark && "text-mint-300")}>{eyebrow}</div>}
      <h2 className={cn("text-3xl font-semibold tracking-tight sm:text-[38px] sm:leading-[1.15]", dark ? "text-white" : "text-navy-900")}>{title}</h2>
      {text && <p className={cn("mt-4 text-[16.5px] leading-relaxed", dark ? "text-navy-200" : "text-navy-500")}>{text}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="relative overflow-hidden border-b border-navy-100 bg-gradient-to-b from-mint-50 to-white">
      <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container relative py-20 sm:py-24">
        <div className="eyebrow mb-3">{eyebrow}</div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl sm:leading-[1.1]">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-500">{text}</p>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-forest-950">
      <div className="grid-bg-dark absolute inset-0" />
      <div className="container relative flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center">
        <div>
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white">See what is changing between your batches.</h2>
          <p className="mt-3 max-w-xl text-forest-100/80">Start with one product family and your existing batch records. Most pilots are analysing data within two weeks.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" variant="mint" asChild><Link to="/#demo">Request a demo <ArrowRight /></Link></Button>
          <Button size="lg" variant="outline" className="border-forest-700 bg-transparent text-white hover:bg-forest-900 hover:text-white" asChild><Link to="/login">Explore the demo</Link></Button>
        </div>
      </div>
    </section>
  );
}

const trend = [17900, 18200, 17600, 18400, 18100, 17300, 16200, 15100, 14600, 14900, 16800, 17900, 18300, 18000].map((v, i) => ({ i, v }));

/** Stylised product preview used on marketing pages. */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-navy-200/70 bg-white shadow-[0_30px_80px_-20px_rgba(9,17,29,0.35)]", className)}>
      <div className="flex items-center gap-1.5 border-b bg-navy-50/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-navy-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-navy-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-navy-200" />
        <span className="ml-3 font-mono text-[11px] text-navy-400">app.blendquoin.top/dashboard</span>
      </div>
      <div className="grid grid-cols-[120px_1fr] text-left">
        <div className="hidden space-y-1.5 bg-navy-950 p-3 sm:block">
          {["Dashboard", "Batches", "Genealogy", "Patterns", "Predictions", "Investigations"].map((l, i) => (
            <div key={l} className={cn("rounded px-2 py-1.5 text-[10px] font-medium", i === 0 ? "bg-forest-900 text-white" : "text-navy-300")}>{l}</div>
          ))}
        </div>
        <div className="col-span-2 space-y-3 p-4 sm:col-span-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Batches (90d)", "72"],
              ["Under investigation", "7"],
              ["Predicted deviations", "3"],
              ["Consistency", "91%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-[9px] text-navy-400">{k}</div>
                <div className="tabular text-base font-semibold text-navy-900">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-md border p-2">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-navy-800">Viscosity · Face Creams</span>
              <span className="text-navy-400">spec 15,000–21,000 cP</span>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#25805b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#25805b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" hide />
                  <YAxis domain={[13000, 22000]} hide />
                  <ReferenceArea ifOverflow="hidden" y1={15000} y2={21000} fill="#bfe9d3" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="v" stroke="#1a6648" strokeWidth={2} fill="url(#pv)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              ["FC26-0193", "Potential deviation", "bg-orange-100 text-orange-800", "Carbomer lot OP-CB-2609"],
              ["FC26-0196", "Monitor", "bg-amber-100 text-amber-800", "Emulsification temp 78.4 °C"],
              ["FC26-0198", "Within specification", "bg-emerald-100 text-emerald-800", "—"],
            ].map(([id, s, c, f]) => (
              <div key={id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-[10px]">
                <span className="font-mono font-medium text-navy-800">{id}</span>
                <span className="hidden flex-1 truncate text-navy-400 sm:block">{f}</span>
                <span className={cn("rounded px-1.5 py-0.5 font-medium", c)}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Horizontal manufacturing data-flow illustration. */
export function DataFlowIllustration({ dark }: { dark?: boolean }) {
  const nodes = [
    { label: "Suppliers", sub: "6 approved", icon: Boxes },
    { label: "Ingredient lots", sub: "CoA values", icon: FlaskConical },
    { label: "Production batch", sub: "Mixing · temp · time", icon: GitFork },
    { label: "Lab results", sub: "Viscosity · ΔE", icon: FlaskConical },
    { label: "Patterns & risk", sub: "Associations", icon: Network },
  ];
  return (
    <div className="relative">
      <div className={cn("absolute left-[10%] right-[10%] top-7 hidden h-px md:block", dark ? "bg-gradient-to-r from-mint-300/0 via-mint-300/60 to-mint-300/0" : "bg-gradient-to-r from-forest-300/0 via-forest-400 to-forest-300/0")} />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
        {nodes.map((n, i) => (
          <div key={n.label} className="relative flex flex-col items-center text-center animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
            <div className={cn("relative z-10 flex h-14 w-14 items-center justify-center rounded-xl border shadow-sm", dark ? "border-forest-700 bg-forest-900 text-mint-300" : "border-forest-200 bg-white text-forest-700")}>
              <n.icon className="h-6 w-6" />
            </div>
            <div className={cn("mt-3 text-sm font-semibold", dark ? "text-white" : "text-navy-900")}>{n.label}</div>
            <div className={cn("text-xs", dark ? "text-navy-300" : "text-navy-400")}>{n.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
