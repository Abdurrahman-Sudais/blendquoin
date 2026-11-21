import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "./AuthShell";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    try {
      await login(v.email, v.password);
      navigate(from, { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AuthShell title="Sign in to BlendQuoin" subtitle="Welcome back. Continue your quality investigations.">
      <Button variant="secondary" className="w-full" size="lg" onClick={() => { loginDemo(); navigate(from, { replace: true }); }}>
        <Sparkles /> Continue with demo workspace
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" />or sign in with email<Separator className="flex-1" /></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Work email" error={errors.email?.message} htmlFor="email"><Input id="email" type="email" autoComplete="email" {...register("email")} /></FormField>
        <FormField label="Password" error={errors.password?.message} htmlFor="password"><Input id="password" type="password" autoComplete="current-password" {...register("password")} /></FormField>
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>Sign in <ArrowRight /></Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">New to BlendQuoin? <Link to="/register" className="font-medium text-forest-700 hover:underline">Create an account</Link></p>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">Authentication runs locally in demo mode and is prepared for Amazon Cognito.</p>
    </AuthShell>
  );
}
