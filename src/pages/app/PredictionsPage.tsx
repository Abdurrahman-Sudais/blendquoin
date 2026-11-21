import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Cpu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { PRED_COLORS, PredictionBadge } from "@/components/shared/StatusBadge";
import { SimulatedNotice } from "@/components/shared/Provenance";
import { PredictionCard } from "@/components/shared/PredictionPanel";
import type { PredictionStatus } from "@/data/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { awsConfig } from "@/services/aws/config";
import { getPredictions, toFeatureVector } from "@/services/aws/sagemaker";
import { recordMetric } from "@/services/aws/monitoring";
import { SIMULATED_MODEL_VERSION } from "@/services/prediction/simulatedModel";

const STATUSES: PredictionStatus[] = ["Within specification", "Monitor", "Potential deviation", "Requires quality review"];

export default function PredictionsPage() {
  const { batches, predictions, specFor, lots } = useStore();
  const [property, setProperty] = useState<"viscosity" | "appearance">("viscosity");
  const [status, setStatus] = useState("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [family, setFamily] = useState("Face Creams");
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const rows = useMemo(
    () =>
      batches
        .filter((b) => b.productFamily === family)
        .filter((b) => !pendingOnly || !b.lab)
        .map((b) => ({ b, p: predictions[b.id].find((x) => x.property === property)! }))
        .filter(({ p }) => status === "all" || p.status === status)
        .sort((a, b) => b.b.productionDate.localeCompare(a.b.productionDate)),
    [batches, predictions, property, status, pendingOnly, family]
  );

  const sel = rows.find((r) => r.b.id === selected) ?? rows[0];
  const spec = specFor(family);
  const counts = STATUSES.map((s) => rows.filter((r) => r.p.status === s).length);

  // Agreement between simulated predictions and measured results on batches that have lab data.
  const measured = batches.filter((b) => b.productFamily === family && b.lab);
  const mae = measured.length ? Math.round(measured.reduce((s, b) => s + Math.abs(predictions[b.id][0].predicted - b.lab!.viscosityCps), 0) / measured.length) : 0;

  const rerun = async () => {
    setRunning(true);
    const t0 = performance.now();
    const pending = batches.filter((b) => !b.lab);
    await Promise.all(pending.map((b) => getPredictions(b, specFor(b.productFamily), lots)));
    await new Promise((r) => setTimeout(r, 700));
    recordMetric("PredictionBatchLatencyMs", Math.round(performance.now() - t0), "Milliseconds");
    setRunning(false);
    toast.success(`Re-scored ${pending.length} batches awaiting lab`, { description: awsConfig.enabled ? `SageMaker endpoint ${awsConfig.sagemakerEndpoint}` : "Simulated model — SageMaker endpoint not connected" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 04 · Identify potential deviations"
        title="Deviation prediction"
        description="Estimated likelihood of deviation against your viscosity and appearance specifications. Use these estimates to prioritise testing and investigation."
        actions={<Button variant="outline" onClick={rerun} disabled={running}><RefreshCw className={cn(running && "animate-spin")} /> {running ? "Scoring…" : "Re-run predictions"}</Button>}
      />
      <SimulatedNotice className="mb-6" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((s, i) => (
          <button key={s} onClick={() => setStatus(status === s ? "all" : s)} className={cn("text-left", status === s && "ring-2 ring-forest-500 rounded-lg")}>
            <StatCard label={s} value={counts[i]} sub={<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PRED_COLORS[s] }} />{property === "viscosity" ? "Viscosity" : "Appearance"} · {family}</span>} />
          </button>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 border-b p-4">
            <Tabs value={property} onValueChange={(v) => setProperty(v as typeof property)}>
              <TabsList><TabsTrigger value="viscosity">Viscosity</TabsTrigger><TabsTrigger value="appearance">Appearance</TabsTrigger></TabsList>
            </Tabs>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Face Creams">Face Creams</SelectItem><SelectItem value="Body Lotions">Body Lotions</SelectItem></SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={pendingOnly} onCheckedChange={(c) => setPendingOnly(c === true)} /> Awaiting lab only</label>
          </CardContent>
          <div className="max-h-[640px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="pl-5">Batch</TableHead>
                  <TableHead className="text-right">Measured</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="text-right">Conf.</TableHead>
                  <TableHead>Top contributor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ b, p }) => {
                  const isV = property === "viscosity";
                  const m = isV ? b.lab?.viscosityCps : b.lab?.appearanceDeltaE;
                  return (
                    <TableRow key={b.id} onClick={() => setSelected(b.id)} className={cn("cursor-pointer", sel?.b.id === b.id && "bg-forest-50/70 hover:bg-forest-50")}>
                      <TableCell className="pl-5"><div className="font-mono text-[13px] font-medium text-forest-700">{b.id}</div><div className="text-[11px] text-muted-foreground">{b.productName}</div></TableCell>
                      <TableCell className="tabular text-right">{m === undefined ? <span className="text-xs text-muted-foreground">awaiting</span> : isV ? m.toLocaleString() : m.toFixed(2)}</TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">{isV ? spec.viscosity.target.toLocaleString() : `≤${spec.appearance.maxDeltaE}`}</TableCell>
                      <TableCell className="tabular text-right font-medium text-violet-700">{isV ? p.predicted.toLocaleString() : p.predicted.toFixed(2)}</TableCell>
                      <TableCell className="tabular text-right font-semibold" style={{ color: PRED_COLORS[p.status] }}>{Math.round(p.risk * 100)}%</TableCell>
                      <TableCell className="tabular text-right">{Math.round(p.confidence * 100)}%</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{p.contributors[0]?.variable}</TableCell>
                      <TableCell><PredictionBadge status={p.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-4">
          {sel ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Selected: <span className="font-mono">{sel.b.id}</span></div>
                <Button variant="link" size="sm" asChild><Link to={`/app/batches/${sel.b.id}`}>Open batch profile</Link></Button>
              </div>
              <PredictionCard prediction={sel.p} batch={sel.b} spec={spec} />
            </>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">No batches match the filters.</Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Model &amp; integration</CardTitle>
              <CardDescription>Amazon SageMaker AI integration layer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Active model</div><div className="font-mono text-xs">{SIMULATED_MODEL_VERSION}</div></div>
                <div><div className="text-xs text-muted-foreground">Mode</div><div className="font-medium">{awsConfig.enabled ? "SageMaker endpoint" : "Simulated locally"}</div></div>
                <div><div className="text-xs text-muted-foreground">Target endpoint</div><div className="font-mono text-xs">{awsConfig.sagemakerEndpoint}</div></div>
                <div><div className="text-xs text-muted-foreground">Back-test MAE (viscosity)</div><div className="tabular font-medium">{mae.toLocaleString()} cP <span className="text-xs text-muted-foreground">n={measured.length}</span></div></div>
              </div>
              {sel && (
                <details className="rounded-md border bg-muted/30 p-2">
                  <summary className="cursor-pointer text-xs font-medium">Feature vector sent for {sel.b.id}</summary>
                  <pre className="mt-2 overflow-x-auto font-mono text-[10.5px] leading-relaxed">{JSON.stringify(toFeatureVector(sel.b, lots), null, 2)}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
