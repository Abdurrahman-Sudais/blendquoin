import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid work email"),
    organisation: z.string().min(2, "Organisation is required"),
    role: z.string().min(1, "Select your role"),
    password: z.string().min(8, "At least 8 characters").regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: "" } });

  const onSubmit = async (v: Values) => {
    try {
      await signUp({ name: v.name, email: v.email, organisation: v.organisation, role: v.role });
      toast.success("Workspace created");
      navigate("/app");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AuthShell title="Create your workspace" subtitle="Start with one product family. Demo data is preloaded so you can explore immediately.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Full name" error={errors.name?.message} htmlFor="name"><Input id="name" {...register("name")} /></FormField>
        <FormField label="Work email" error={errors.email?.message} htmlFor="email"><Input id="email" type="email" {...register("email")} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Organisation" error={errors.organisation?.message} htmlFor="org"><Input id="org" {...register("organisation")} /></FormField>
          <FormField label="Role" error={errors.role?.message}>
            <Select value={watch("role")} onValueChange={(v) => setValue("role", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Quality Manager", "QA Specialist", "Process Engineer", "QC Analyst", "Supplier Quality", "Operations"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField label="Password" error={errors.password?.message} htmlFor="pw"><Input id="pw" type="password" autoComplete="new-password" {...register("password")} /></FormField>
        <FormField label="Confirm password" error={errors.confirm?.message} htmlFor="pw2"><Input id="pw2" type="password" autoComplete="new-password" {...register("confirm")} /></FormField>
        <div>
          <label className="flex items-start gap-2 text-sm text-navy-600">
            <Checkbox className="mt-0.5" checked={watch("terms") === true} onCheckedChange={(c) => setValue("terms", (c === true) as true, { shouldValidate: true })} />
            I agree to the terms of service and data processing agreement.
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-destructive">{errors.terms.message}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>Create workspace</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-medium text-forest-700 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
