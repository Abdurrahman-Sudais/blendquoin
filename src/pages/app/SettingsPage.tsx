import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Activity, Brain, Cloud, Cpu, Database, FileSearch, Lock, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { AWS_SERVICES, awsConfig } from "@/services/aws/config";
import { recentMetrics } from "@/services/aws/monitoring";
import type { Specification } from "@/data/types";

const specSchema = z
  .object({
    target: z.coerce.number().positive(),
    min: z.coerce.number().positive(),
    max: z.coerce.number().positive(),
    monitorDeltaE: z.coerce.number().positive(),
    maxDeltaE: z.coerce.number().positive(),
  })
  .refine((d) => d.min < d.target && d.target < d.max, { path: ["target"], message: "Target must lie between min and max" })
  .refine((d) => d.monitorDeltaE < d.maxDeltaE, { path: ["monitorDeltaE"], message: "Alert level must be below the limit" });

function SpecForm({ spec }: { spec: Specification }) {
  const { updateSpec } = useStore();
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<z.infer<typeof specSchema>>({ resolver: zodResolver(specSchema) });
  useEffect(() => reset({ target: spec.viscosity.target, min: spec.viscosity.min, max: spec.viscosity.max, monitorDeltaE: spec.appearance.monitorDeltaE, maxDeltaE: spec.appearance.maxDeltaE }), [spec, reset]);
  const onSubmit = handleSubmit((v) => {
    updateSpec({ ...spec, viscosity: { target: v.target, min: v.min, max: v.max, unit: "cP" }, appearance: { monitorDeltaE: v.monitorDeltaE, maxDeltaE: v.maxDeltaE }, updatedBy: user?.name ?? "User", updatedAt: new Date().toISOString().slice(0, 10) });
    toast.success(`${spec.productFamily} specification updated`, { description: "Deviation risk has been re-evaluated for all batches." });
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{spec.productFamily}</CardTitle>
        <CardDescription>Last updated {formatDate(spec.updatedAt)} by {spec.updatedBy}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3" noValidate>
          <FormField label="Viscosity min (cP)" error={errors.min?.message}><Input type="number" {...register("min")} /></FormField>
          <FormField label="Viscosity target (cP)" error={errors.target?.message}><Input type="number" {...register("target")} /></FormField>
          <FormField label="Viscosity max (cP)" error={errors.max?.message}><Input type="number" {...register("max")} /></FormField>
          <FormField label="Appearance ΔE alert" hint="Monitor above this" error={errors.monitorDeltaE?.message}><Input type="number" step="0.1" {...register("monitorDeltaE")} /></FormField>
          <FormField label="Appearance ΔE limit" hint="Out of specification above this" error={errors.maxDeltaE?.message}><Input type="number" step="0.1" {...register("maxDeltaE")} /></FormField>
          <div className="flex items-end"><Button type="submit" disabled={!isDirty} className="w-full">Save specification</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

const ICONS = [Cpu, Brain, FileSearch, Cloud, Database, Server, Lock, Activity];

export default function SettingsPage() {
  const { specs } = useStore();
  const metrics = recentMetrics();
  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Specifications & AWS integration" description="Manufacturer-defined specifications drive deviation risk. The AWS layer is prepared for production services." />
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product specifications</h2>
          <div className="grid gap-6 xl:grid-cols-2">{specs.map((s) => <SpecForm key={s.productFamily} spec={s} />)}</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AWS architecture</CardTitle>
            <CardDescription>
              Mode: <strong>{awsConfig.enabled ? "Connected" : "Local simulation"}</strong> · region {awsConfig.region}. Set <code className="rounded bg-muted px-1 font-mono text-xs">VITE_USE_AWS=true</code> and the API base URL to route calls through API Gateway → Lambda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-navy-950 p-5 text-navy-100">
              <div className="grid gap-3 text-center text-xs md:grid-cols-[1fr_auto_1fr_auto_1.6fr]">
                <div className="rounded-md border border-navy-700 p-3"><div className="font-semibold text-white">React SPA</div><div className="text-navy-300">Cognito auth</div></div>
                <div className="self-center text-mint-300">→</div>
                <div className="rounded-md border border-navy-700 p-3"><div className="font-semibold text-white">API Gateway</div><div className="text-navy-300">AWS Lambda handlers</div></div>
                <div className="self-center text-mint-300">→</div>
                <div className="grid grid-cols-2 gap-2">
                  {["SageMaker AI", "Bedrock", "Textract", "S3", "DynamoDB", "CloudWatch"].map((s) => <div key={s} className="rounded border border-forest-700 bg-forest-900/50 p-2 font-medium text-mint-200">{s}</div>)}
                </div>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead className="pl-0">Service</TableHead><TableHead>Purpose</TableHead><TableHead>Integration point</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {AWS_SERVICES.map((s, i) => {
                  const Icon = ICONS[i];
                  return (
                    <TableRow key={s.service}>
                      <TableCell className="pl-0 font-medium"><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-forest-600" />{s.service}</span></TableCell>
                      <TableCell>{s.purpose}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.endpoint}</TableCell>
                      <TableCell><span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${s.status === "Connected" ? "border-forest-200 bg-forest-50 text-forest-800" : "border-dashed border-violet-300 bg-violet-50 text-violet-800"}`}>{s.status}</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monitoring events</CardTitle><CardDescription>Metrics recorded this session (forwarded to Amazon CloudWatch when connected)</CardDescription></CardHeader>
          <CardContent>
            {metrics.length ? (
              <div className="space-y-1 font-mono text-xs">{metrics.map((m, i) => <div key={i} className="flex gap-4"><span className="text-muted-foreground">{m.at.slice(11, 19)}</span><span>{m.name}</span><span className="font-semibold">{m.value} {m.unit}</span></div>)}</div>
            ) : <p className="text-sm text-muted-foreground">No events yet — run predictions or the assistant to generate metrics.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
