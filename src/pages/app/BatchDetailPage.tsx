import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Cpu, Factory, FlaskConical, GitFork, ScanSearch, Thermometer, Timer, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/PageHeader";
import { BatchStatusBadge, LotStatusBadge, PredictionBadge } from "@/components/shared/StatusBadge";
import { Provenance, SimulatedNotice } from "@/components/shared/Provenance";
import { PredictionCard } from "@/components/shared/PredictionPanel";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { consistencyScore, inSpecAppearance, inSpecViscosity } from "@/lib/analytics";
import { worstStatus } from "@/services/prediction/simulatedModel";
import type { QualityDecision } from "@/data/types";

const labSchema = z.object({
  viscosityCps: z.coerce.number().min(100, "Enter a valid viscosity").max(200000),
  appearanceDeltaE: z.coerce.number().min(0, "ΔE cannot be negative").max(20),
  pH: z.coerce.number().min(0).max(14),
  specificGravity: z.coerce.number().min(0.5).max(2),
  method: z.string().min(3, "Record the method"),
});
const decisionSchema = z.object({
  decision: z.enum(["Approved for release", "Rework", "Rejected"]),
  note: z.string().min(10, "Provide a justification (10+ characters)"),
});

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { batches, lots, materials, suppliers, equipment, predictions, specFor, investigations, updateBatch } = useStore();
  const { user } = useAuth();
  const batch = batches.find((b) => b.id === id);

  const labForm = useForm<z.infer<typeof labSchema>>({ resolver: zodResolver(labSchema), defaultValues: { pH: 5.6, specificGravity: 0.985, method: "Brookfield RV, spindle 6, 10 rpm, 25 °C · Spectrophotometer CIE ΔE*ab vs. ref. std." } });
  const decisionForm = useForm<z.infer<typeof decisionSchema>>({ resolver: zodResolver(decisionSchema), defaultValues: { decision: "Approved for release", note: "" } });

  if (!batch) return <EmptyState title="Batch not found" description={`No batch with ID ${id}.`} />;

  const spec = specFor(batch.productFamily);
  const preds = predictions[batch.id] ?? [];
  const eq = equipment.find((e) => e.id === batch.equipmentId);
  const related = investigations.filter((i) => i.batchIds.includes(batch.id));
  const score = consistencyScore(batch, spec);

  const saveLab = labForm.handleSubmit((v) => {
    updateBatch(batch.id, {
      lab: {
        ...v,
        appearanceGrade: v.appearanceDeltaE > 1.6 ? "Non-conforming" : v.appearanceDeltaE > 1.0 ? "Slight variation" : "Conforms",
        measuredAt: new Date().toISOString().slice(0, 10),
        analyst: user?.name ?? "Analyst",
      },
      status: "Quality review",
    });
    toast.success("Laboratory results recorded", { description: "Batch moved to quality review." });
  });

  const saveDecision = decisionForm.handleSubmit((v) => {
    const decision: QualityDecision = { decision: v.decision, note: v.note, by: user?.name ?? "Quality", date: new Date().toISOString().slice(0, 10) };
    updateBatch(batch.id, { decision, status: v.decision === "Approved for release" ? "Released" : "On hold" });
    toast.success(`Decision recorded: ${v.decision}`);
  });

  const conditions = [
    { icon: Wind, label: "Mixing speed", value: `${batch.mixing.mixingSpeedRpm.toLocaleString()} rpm` },
    { icon: Cpu, label: "Homogeniser speed", value: `${batch.mixing.homogenizerRpm.toLocaleString()} rpm` },
    { icon: Timer, label: "Mixing duration", value: `${batch.mixing.mixingDurationMin} min` },
    { icon: Thermometer, label: "Emulsification temp.", value: `${batch.mixing.emulsificationTempC} °C` },
    { icon: Thermometer, label: "Cooling rate", value: `${batch.mixing.coolingRateCPerMin} °C/min` },
    { icon: Timer, label: "Processing duration", value: `${batch.processingDurationMin} min` },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild><Link to="/app/batches"><ArrowLeft /> Batches</Link></Button>

      <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-navy-900">{batch.id}</h1>
            <BatchStatusBadge status={batch.status} />
            <PredictionBadge status={worstStatus(preds)} />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {batch.productName} · {batch.productFamily} · produced {formatDate(batch.productionDate)} · {batch.sizeKg} kg
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to={`/app/genealogy?batch=${batch.id}`}><GitFork /> Genealogy</Link></Button>
          <Button variant="outline" asChild><Link to={`/app/patterns?compare=${batch.id}`}>Compare</Link></Button>
          <Button onClick={() => navigate(`/app/investigations?new=${batch.id}`)}><ScanSearch /> Open investigation</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Viscosity</div><Provenance kind="measured" /></div>
          <div className={`tabular mt-2 text-2xl font-semibold ${batch.lab && !inSpecViscosity(batch, spec) ? "text-red-700" : "text-navy-900"}`}>{batch.lab ? `${batch.lab.viscosityCps.toLocaleString()} cP` : "—"}</div>
          <div className="text-xs text-muted-foreground">spec {spec.viscosity.min.toLocaleString()}–{spec.viscosity.max.toLocaleString()} cP</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Appearance ΔE</div><Provenance kind="measured" /></div>
          <div className={`tabular mt-2 text-2xl font-semibold ${batch.lab && !inSpecAppearance(batch, spec) ? "text-red-700" : "text-navy-900"}`}>{batch.lab ? batch.lab.appearanceDeltaE.toFixed(2) : "—"}</div>
          <div className="text-xs text-muted-foreground">{batch.lab?.appearanceGrade ?? "Not measured"} · limit {spec.appearance.maxDeltaE}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Predicted viscosity</div><Provenance kind="predicted" label="Simulated" /></div>
          <div className="tabular mt-2 text-2xl font-semibold text-violet-700">{preds[0]?.predicted.toLocaleString()} cP</div>
          <div className="text-xs text-muted-foreground">risk {Math.round((preds[0]?.risk ?? 0) * 100)}% · confidence {Math.round((preds[0]?.confidence ?? 0) * 100)}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">Consistency score</div><Provenance kind="measured" label="From lab" /></div>
          <div className="tabular mt-2 text-2xl font-semibold text-navy-900">{score ?? "—"}</div>
          <div className="text-xs text-muted-foreground">0–100, closeness to target</div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredient lots</TabsTrigger>
          <TabsTrigger value="process">Process conditions</TabsTrigger>
          <TabsTrigger value="lab">Laboratory</TabsTrigger>
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="decision">Quality decision</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Production record</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                {[
                  ["Batch ID", batch.id],
                  ["Product", batch.productName],
                  ["Product family", batch.productFamily],
                  ["Production date", formatDate(batch.productionDate)],
                  ["Manufacturing facility", batch.facility],
                  ["Equipment", `${eq?.id} · ${eq?.name}`],
                  ["Batch size", `${batch.sizeKg} kg`],
                  ["Ingredient lots", `${batch.lots.length} connected`],
                ].map(([k, v]) => (
                  <div key={k} className="border-b pb-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium text-navy-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Related investigations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {related.length ? related.map((i) => (
                <Link key={i.id} to={`/app/investigations/${i.id}`} className="block rounded-lg border p-3 hover:bg-muted/40">
                  <div className="font-mono text-xs text-muted-foreground">{i.id} · {i.status}</div>
                  <div className="text-sm font-medium">{i.title}</div>
                </Link>
              )) : <p className="text-sm text-muted-foreground">No investigations reference this batch.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader><CardTitle>Ingredient lots &amp; suppliers</CardTitle><CardDescription>CoA values are supplier-reported.</CardDescription></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Lot</TableHead><TableHead>Material</TableHead><TableHead>Role</TableHead><TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead><TableHead>CoA critical property</TableHead><TableHead>Received</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.lots.map((u) => {
                  const l = lots.find((x) => x.id === u.lotId)!;
                  const m = materials.find((x) => x.id === l.materialId)!;
                  const s = suppliers.find((x) => x.id === l.supplierId)!;
                  return (
                    <TableRow key={u.lotId}>
                      <TableCell className="pl-5"><Link to={`/app/genealogy?lot=${l.id}`} className="font-mono text-[13px] font-medium text-forest-700 hover:underline">{l.id}</Link></TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.role}</TableCell>
                      <TableCell>{s.name}<div className="text-xs text-muted-foreground">{s.country}</div></TableCell>
                      <TableCell className="tabular text-right">{u.quantityKg}</TableCell>
                      <TableCell className="tabular">{l.coaValue.toLocaleString()} {l.coaUnit}<div className="text-xs text-muted-foreground">{m.criticalProperty}</div></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(l.receivedDate)}</TableCell>
                      <TableCell><LotStatusBadge status={l.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="process">
          <Card>
            <CardHeader><CardTitle>Mixing &amp; processing conditions</CardTitle><CardDescription><Factory className="mr-1 inline h-3.5 w-3.5" />{eq?.name} ({eq?.type}) · last calibrated {eq && formatDate(eq.lastCalibrated)}</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {conditions.map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="rounded-md bg-forest-50 p-2 text-forest-700"><c.icon className="h-4 w-4" /></div>
                  <div>
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                    <div className="tabular text-lg font-semibold text-navy-900">{c.value}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab">
          {batch.lab ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div><CardTitle>Laboratory measurements</CardTitle><CardDescription>Measured {formatDate(batch.lab.measuredAt)} by {batch.lab.analyst}</CardDescription></div>
                <Provenance kind="measured" />
              </CardHeader>
              <Table>
                <TableHeader><TableRow><TableHead className="pl-5">Parameter</TableHead><TableHead className="text-right">Result</TableHead><TableHead>Specification</TableHead><TableHead>Assessment</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="pl-5">Viscosity</TableCell><TableCell className="tabular text-right font-medium">{batch.lab.viscosityCps.toLocaleString()} cP</TableCell><TableCell>{spec.viscosity.min.toLocaleString()}–{spec.viscosity.max.toLocaleString()} cP</TableCell><TableCell>{inSpecViscosity(batch, spec) ? <span className="text-forest-700">Within specification</span> : <span className="font-medium text-red-700">Out of specification</span>}</TableCell></TableRow>
                  <TableRow><TableCell className="pl-5">Appearance ΔE*ab</TableCell><TableCell className="tabular text-right font-medium">{batch.lab.appearanceDeltaE.toFixed(2)}</TableCell><TableCell>≤ {spec.appearance.maxDeltaE}</TableCell><TableCell>{inSpecAppearance(batch, spec) ? <span className="text-forest-700">{batch.lab.appearanceGrade}</span> : <span className="font-medium text-red-700">{batch.lab.appearanceGrade}</span>}</TableCell></TableRow>
                  <TableRow><TableCell className="pl-5">pH</TableCell><TableCell className="tabular text-right font-medium">{batch.lab.pH}</TableCell><TableCell>5.0–6.5</TableCell><TableCell className="text-forest-700">Within specification</TableCell></TableRow>
                  <TableRow><TableCell className="pl-5">Specific gravity</TableCell><TableCell className="tabular text-right font-medium">{batch.lab.specificGravity}</TableCell><TableCell>0.96–1.01</TableCell><TableCell className="text-forest-700">Within specification</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="border-t px-5 py-3 text-xs text-muted-foreground">Method: {batch.lab.method}</div>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div><CardTitle>Record laboratory results</CardTitle><CardDescription>No measurements recorded yet. Predictions are not a substitute for these results.</CardDescription></div>
                <Provenance kind="measured" />
              </CardHeader>
              <CardContent>
                <form onSubmit={saveLab} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
                  <FormField label="Viscosity (cP)" error={labForm.formState.errors.viscosityCps?.message}><Input type="number" {...labForm.register("viscosityCps")} /></FormField>
                  <FormField label="Appearance ΔE*ab" error={labForm.formState.errors.appearanceDeltaE?.message}><Input type="number" step="0.01" {...labForm.register("appearanceDeltaE")} /></FormField>
                  <FormField label="pH" error={labForm.formState.errors.pH?.message}><Input type="number" step="0.01" {...labForm.register("pH")} /></FormField>
                  <FormField label="Specific gravity" error={labForm.formState.errors.specificGravity?.message}><Input type="number" step="0.001" {...labForm.register("specificGravity")} /></FormField>
                  <FormField label="Method" className="sm:col-span-2 lg:col-span-4" error={labForm.formState.errors.method?.message}><Input {...labForm.register("method")} /></FormField>
                  <div className="sm:col-span-2 lg:col-span-4"><Button type="submit"><FlaskConical /> Save measurements</Button></div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <SimulatedNotice />
          <div className="grid gap-4 xl:grid-cols-2">
            {preds.map((p) => <PredictionCard key={p.property} prediction={p} batch={batch} spec={spec} />)}
          </div>
        </TabsContent>

        <TabsContent value="decision">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div><CardTitle>Quality decision</CardTitle><CardDescription>Release decisions are made by people, based on measured laboratory results.</CardDescription></div>
              <Provenance kind="decided" />
            </CardHeader>
            <CardContent>
              {batch.decision ? (
                <div className="rounded-lg border-2 border-forest-200 bg-forest-50/50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-forest-800"><BadgeCheck className="h-5 w-5" /> {batch.decision.decision}</div>
                  <div className="mt-1 text-sm text-navy-600">{batch.decision.note}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Approved by {batch.decision.by} on {formatDate(batch.decision.date)}</div>
                </div>
              ) : !batch.lab ? (
                <p className="text-sm text-muted-foreground">A decision can be recorded once laboratory results are available.</p>
              ) : (
                <form onSubmit={saveDecision} className="grid max-w-2xl gap-4" noValidate>
                  <FormField label="Decision">
                    <Select value={decisionForm.watch("decision")} onValueChange={(v) => decisionForm.setValue("decision", v as QualityDecision["decision"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Approved for release", "Rework", "Rejected"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Justification" error={decisionForm.formState.errors.note?.message}><Textarea rows={3} {...decisionForm.register("note")} /></FormField>
                  <div><Button type="submit"><BadgeCheck /> Record decision as {user?.name}</Button></div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
