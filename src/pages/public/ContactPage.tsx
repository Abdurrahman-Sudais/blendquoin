import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHero, Section } from "@/components/marketing/Marketing";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Company is required"),
  topic: z.string().min(1, "Choose a topic"),
  message: z.string().min(20, "Tell us a little more (20 characters minimum)"),
});
type Values = z.infer<typeof schema>;

export default function ContactPage() {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { topic: "" } });
  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Thanks — we’ll be in touch within one business day.");
    reset();
  };
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to the BlendQuoin team" text="Tell us about your product family and the variation you’re seeing. We’ll show you what BlendQuoin can do with your own batch data." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {[
              { icon: MessageSquare, t: "Pilot programme", d: "A focused 8-week pilot on one product family and site." },
              { icon: Mail, t: "Email", d: "hello@blendquoin.com" },
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
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 rounded-2xl border border-navy-100 bg-white p-8 shadow-sm sm:grid-cols-2" noValidate>
            <FormField label="Full name" error={errors.name?.message} htmlFor="name"><Input id="name" {...register("name")} /></FormField>
            <FormField label="Work email" error={errors.email?.message} htmlFor="email"><Input id="email" type="email" {...register("email")} /></FormField>
            <FormField label="Company" error={errors.company?.message} htmlFor="company"><Input id="company" {...register("company")} /></FormField>
            <FormField label="Topic" error={errors.topic?.message}>
              <Select value={watch("topic")} onValueChange={(v) => setValue("topic", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                <SelectContent>
                  {["Pilot programme", "Pricing", "Technical / AWS deployment", "Partnership", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Message" error={errors.message?.message} className="sm:col-span-2" htmlFor="message"><Textarea id="message" rows={5} {...register("message")} /></FormField>
            <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send message"}</Button></div>
          </form>
        </div>
      </Section>
    </>
  );
}
