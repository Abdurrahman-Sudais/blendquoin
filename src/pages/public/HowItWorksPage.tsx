import { CtaBand, DataFlowIllustration, PageHero, Section, SectionHeading, WORKFLOW } from "@/components/marketing/Marketing";
import { Cloud, Database, Lock, Activity, Cpu, FileSearch, Server, Brain } from "lucide-react";

const AWS = [
  { icon: Cpu, t: "Amazon SageMaker AI", d: "Batch deviation prediction" },
  { icon: Brain, t: "Amazon Bedrock", d: "Note classification and summaries" },
  { icon: FileSearch, t: "Amazon Textract", d: "Lab report and CoA extraction" },
  { icon: Cloud, t: "Amazon S3", d: "Datasets and documents" },
  { icon: Database, t: "Amazon DynamoDB", d: "Batch relationships and records" },
  { icon: Server, t: "AWS Lambda", d: "Processing workflows" },
  { icon: Lock, t: "Amazon Cognito", d: "Authentication" },
  { icon: Activity, t: "Amazon CloudWatch", d: "Monitoring" },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="How it works" title="Register, connect, analyse, investigate, document" text="BlendQuoin follows the natural order of a quality investigation, so each step builds on traceable evidence from the one before." />
      <Section>
        <div className="space-y-6">
          {WORKFLOW.map((s, i) => (
            <div key={s.title} className="grid items-center gap-6 rounded-xl border border-navy-100 p-6 md:grid-cols-[80px_1fr_1.2fr]">
              <div className="font-mono text-4xl font-medium text-forest-200">0{i + 1}</div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><s.icon className="h-5 w-5" /></div>
                <div className="text-lg font-semibold text-navy-900">{s.title}</div>
              </div>
              <p className="text-navy-500">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section className="bg-mint-50/60">
        <SectionHeading center eyebrow="Data model" title="Connected records, end to end" />
        <div className="mt-14"><DataFlowIllustration /></div>
      </Section>
      <Section>
        <SectionHeading eyebrow="Architecture" title="Designed for AWS" text="BlendQuoin is designed to run inside a secure AWS architecture, with managed AI services for prediction, language and document understanding." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AWS.map((a) => (
            <div key={a.t} className="rounded-lg border border-navy-100 p-5">
              <a.icon className="h-5 w-5 text-forest-600" />
              <div className="mt-3 text-sm font-semibold text-navy-900">{a.t}</div>
              <div className="text-sm text-navy-500">{a.d}</div>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
