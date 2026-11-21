import { ContactForm } from "@/kit/LeadForms";
import { SITE } from "@/kit/site";

import { Mail, MapPin, MessageSquare } from "lucide-react";

import { PageHero, Section } from "@/components/marketing/Marketing";

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to the BlendQuoin team" text="Tell us about your product family and the variation you’re seeing. We’ll show you what BlendQuoin can do with your own batch data." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {[
              { icon: MessageSquare, t: "Pilot programme", d: "A focused 8-week pilot on one product family and site." },
              { icon: Mail, t: "Email", d: SITE.email },
              { icon: MapPin, t: "Offices", d: "Lagos · London" },
            ].map((x) => (
              <div key={x.t} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><x.icon className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold text-navy-900">{x.t}</div>
                  <div className="text-sm text-navy-500">{x.d}</div>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
