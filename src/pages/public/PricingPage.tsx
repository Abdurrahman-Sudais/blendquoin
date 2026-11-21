import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, PageHero, Section } from "@/components/marketing/Marketing";
import { cn } from "@/lib/utils";

const PLANS = [
  { name: "Pilot", price: "£2,400", per: "/ month", d: "Prove value on one product family.", cta: "Request a pilot", features: ["1 product family", "1 manufacturing site", "Up to 300 batches", "Viscosity & appearance prediction", "Batch genealogy", "5 users"] },
  { name: "Plant", price: "£6,800", per: "/ month", d: "Full investigation workflow for a site.", cta: "Talk to sales", featured: true, features: ["Up to 4 product families", "1 manufacturing site", "Unlimited batches", "Investigation workspace & AI assistant", "Document extraction", "PDF & CSV reports", "25 users"] },
  { name: "Enterprise", price: "Custom", per: "", d: "Multi-site quality intelligence.", cta: "Contact us", features: ["Unlimited product families & sites", "Custom specifications & models", "Deployment in your AWS account", "SSO via Cognito federation", "Validation support", "Dedicated success manager"] },
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Start focused. Expand when it’s proven." text="Every plan includes onboarding, historical data import and model calibration on your own batches." />
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn("relative flex flex-col rounded-2xl border p-8", p.featured ? "border-forest-700 bg-forest-950 text-white shadow-xl" : "border-navy-100 bg-white")}>
              {p.featured && <span className="absolute -top-3 left-8 rounded-full bg-mint-300 px-3 py-1 text-xs font-semibold text-forest-950">Most popular</span>}
              <div className={cn("font-semibold", p.featured ? "text-mint-300" : "text-forest-700")}>{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className={p.featured ? "text-forest-100/70" : "text-navy-400"}>{p.per}</span>
              </div>
              <p className={cn("mt-2 text-sm", p.featured ? "text-forest-100/80" : "text-navy-500")}>{p.d}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className={cn("h-4 w-4 shrink-0", p.featured ? "text-mint-300" : "text-forest-500")} />{f}</li>
                ))}
              </ul>
              <Button className="mt-8" variant={p.featured ? "mint" : "outline"} asChild><Link to={p.name === "Pilot" ? "/register" : "/contact"}>{p.cta}</Link></Button>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-navy-400">Prices exclude VAT. Annual agreements available.</p>
      </Section>
      <CtaBand />
    </>
  );
}
