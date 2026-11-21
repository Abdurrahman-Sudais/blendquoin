import { CtaBand, PageHero, Section, SectionHeading } from "@/components/marketing/Marketing";

const FOUNDERS = [
  { name: "Temilola Ogunleye", role: "Founder", initials: "TO", bio: "Leads BlendQuoin’s vision and product direction, focused on giving cosmetics quality teams the connected evidence they need to explain batch variation." },
  { name: "Obinna Nwosu", role: "Co-founder", initials: "ON", bio: "Leads the platform and data foundations behind BlendQuoin — from batch genealogy to the prediction and assistant services." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Less waste. Better answers. Every batch." text="BlendQuoin exists because batch variation is too often explained after the fact — once materials, time and energy are already lost." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Our mission" title="Make batch variation understandable before it becomes waste" />
          <div className="space-y-4 text-[16px] leading-relaxed text-navy-600">
            <p>Cosmetics and personal-care manufacturers work with natural and specialty ingredients whose properties shift from lot to lot. Small differences in a thickener, an emollient’s colour or an emulsification temperature can move a batch out of specification.</p>
            <p>BlendQuoin connects the records that already exist — supplier lots, production conditions and laboratory measurements — so quality teams can see what changed, investigate with evidence, and document conclusions they can stand behind.</p>
            <p>We are deliberate about scientific integrity: predictions are presented as estimates, associations are not presented as causes, and decisions always belong to people.</p>
          </div>
        </div>
      </Section>
      <Section className="bg-mint-50/60">
        <SectionHeading center eyebrow="Leadership" title="Founders" />
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {FOUNDERS.map((f) => (
            <div key={f.name} className="rounded-2xl border border-navy-100 bg-white p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-900 text-xl font-semibold text-mint-300">{f.initials}</div>
              <div className="mt-5 text-xl font-semibold text-navy-900">{f.name}</div>
              <div className="text-sm font-medium text-forest-600">{f.role}</div>
              <p className="mt-3 text-sm leading-relaxed text-navy-500">{f.bio}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {[["Traceability", "Every insight links back to the records behind it."], ["Scientific honesty", "Estimates are labelled as estimates. Associations are not causes."], ["People decide", "AI organises evidence; quality professionals make the call."]].map(([t, d]) => (
            <div key={t} className="border-t-2 border-forest-600 pt-5">
              <div className="font-semibold text-navy-900">{t}</div>
              <p className="mt-2 text-sm text-navy-500">{d}</p>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
