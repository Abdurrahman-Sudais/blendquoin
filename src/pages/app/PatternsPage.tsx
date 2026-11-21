import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ComposedChart, ErrorBar, Legend, Line, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { Provenance } from "@/components/shared/Provenance";
import { BatchStatusBadge } from "@/components/shared/StatusBadge";
import type { Batch } from "@/data/types";
import { FEATURES, OUTCOMES, inSpecAppearance, inSpecViscosity, lotFor, mean, pearson, stdev, strengthLabel } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

const PALETTE = ["#1a6648", "#d9622b", "#3a5274", "#c58a1b", "#7c3aed", "#0e7490"];

function AssociationNotice() {
  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
      <div>
        <strong>Statistical associations, not proven causes.</strong> Correlations show how variables move together in historical batches. Confounding factors (e.g. a new lot introduced at the same time as a process change) can create associations without causation. Confirm suspected causes with verification tests in an investigation.
      </div>
    </div>
  );
}

function corrColor(r: number) {
  const a = Math.min(1, Math.abs(r));
  return r >= 0 ? `rgba(217, 98, 43, ${a * 0.85})` : `rgba(26, 102, 72, ${a * 0.85})`;
}

export default function PatternsPage() {
  const { batches, lots, suppliers, specFor } = useStore();
  const [params, setParams] = useSearchParams();
  const [family, setFamily] = useState("Face Creams");
  const [xKey, setXKey] = useState("carbCoa");
  const [yKey, setYKey] = useState("viscosity");
  const [colorBy, setColorBy] = useState<"carbSupplier" | "equipment" | "sheaSupplier">("carbSupplier");
  const [groupBy, setGroupBy] = useState<"carbLot" | "carbSupplier" | "equipment" | "sheaLot" | "facility">("carbLot");
  const compareParam = params.get("compare");
  const [compare, setCompare] = useState<string[]>(() => {
    if (compareParam) return [compareParam];
    const sorted = [...batches].filter((b) => b.productFamily === "Face Creams" && b.lab).sort((a, b) => b.productionDate.localeCompare(a.productionDate));
    const flagged = sorted.find((b) => b.status === "Under investigation");
    const good = sorted.find((b) => b.status === "Released" && b.equipmentId === flagged?.equipmentId);
    return [flagged?.id, good?.id].filter(Boolean) as string[];
  });
  const [tab, setTab] = useState(compareParam ? "compare" : "correlations");

  const data = useMemo(() => batches.filter((b) => b.productFamily === family && b.lab), [batches, family]);
  const spec = specFor(family);
  const supName = (id?: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const groupKey = (b: Batch, by: string) => {
    switch (by) {
      case "carbLot": return lotFor(b, "RM-CARB", lots)?.id ?? "—";
      case "carbSupplier": return supName(lotFor(b, "RM-CARB", lots)?.supplierId);
      case "sheaLot": return lotFor(b, "RM-SHEA", lots)?.id ?? "—";
      case "sheaSupplier": return supName(lotFor(b, "RM-SHEA", lots)?.supplierId);
      case "facility": return b.facility.split(",")[0];
      default: return b.equipmentId;
    }
  };

  const matrix = useMemo(
    () =>
      FEATURES.map((f) => ({
        feature: f,
        values: OUTCOMES.map((o) => {
          const pairs = data.map((b) => [f.get(b, lots), o.get(b)] as const).filter(([x, y]) => x !== undefined && y !== undefined) as [number, number][];
          return { r: pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1])), n: pairs.length };
        }),
      })),
    [data, lots]
  );

  const xF = FEATURES.find((f) => f.key === xKey)!;
  const yO = OUTCOMES.find((o) => o.key === yKey)!;
  const scatterGroups = useMemo(() => {
    const g = new Map<string, { x: number; y: number; id: string }[]>();
    for (const b of data) {
      const x = xF.get(b, lots), y = yO.get(b);
      if (x === undefined || y === undefined) continue;
      const k = groupKey(b, colorBy);
      g.set(k, [...(g.get(k) ?? []), { x, y, id: b.id }]);
    }
    return [...g.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, xF, yO, colorBy, lots]);
  const allPts = scatterGroups.flatMap(([, p]) => p);
  const r = pearson(allPts.map((p) => p.x), allPts.map((p) => p.y));
  const reg = useMemo(() => {
    if (allPts.length < 3) return [];
    const mx = mean(allPts.map((p) => p.x)), my = mean(allPts.map((p) => p.y));
    const slope = allPts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / allPts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const xs = allPts.map((p) => p.x);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    return [{ x: x0, y: my + slope * (x0 - mx) }, { x: x1, y: my + slope * (x1 - mx) }];
  }, [allPts]);

  const groups = useMemo(() => {
    const g = new Map<string, Batch[]>();
    data.forEach((b) => g.set(groupKey(b, groupBy), [...(g.get(groupKey(b, groupBy)) ?? []), b]));
    return [...g.entries()].map(([k, bs]) => {
      const v = bs.map((b) => b.lab!.viscosityCps);
      const de = bs.map((b) => b.lab!.appearanceDeltaE);
      return { group: k, n: bs.length, meanV: Math.round(mean(v)), sdV: Math.round(stdev(v)), meanDE: +mean(de).toFixed(2), sdDE: +stdev(de).toFixed(2), inSpec: bs.filter((b) => inSpecViscosity(b, spec) && inSpecAppearance(b, spec)).length / bs.length };
    }).sort((a, b) => a.group.localeCompare(b.group));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, groupBy, spec, lots]);

  const trend = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.productionDate.localeCompare(b.productionDate));
    return sorted.map((b, i) => {
      const win = sorted.slice(Math.max(0, i - 4), i + 1);
      return { id: b.id, date: formatDate(b.productionDate, { day: "2-digit", month: "short" }), v: b.lab!.viscosityCps, rolling: Math.round(mean(win.map((x) => x.lab!.viscosityCps))), de: b.lab!.appearanceDeltaE, deRolling: +mean(win.map((x) => x.lab!.appearanceDeltaE)).toFixed(2) };
    });
  }, [data]);

  const compared = compare.map((id) => batches.find((b) => b.id === id)!).filter(Boolean);
  const compareRows: { label: string; get: (b: Batch) => string; numeric?: (b: Batch) => number | undefined; section?: string }[] = [
    { section: "Production", label: "Product", get: (b) => b.productName },
    { label: "Production date", get: (b) => formatDate(b.productionDate) },
    { label: "Facility · equipment", get: (b) => `${b.facility.split(",")[0]} · ${b.equipmentId}` },
    { section: "Ingredient lots", label: "Carbomer lot", get: (b) => `${lotFor(b, "RM-CARB", lots)?.id} (${lotFor(b, "RM-CARB", lots)?.coaValue.toLocaleString()} cP)` },
    { label: "Carbomer supplier", get: (b) => supName(lotFor(b, "RM-CARB", lots)?.supplierId) },
    { label: "Shea butter lot", get: (b) => `${lotFor(b, "RM-SHEA", lots)?.id} (${lotFor(b, "RM-SHEA", lots)?.coaValue} Y)` },
    { label: "Xanthan lot", get: (b) => lotFor(b, "RM-XAN", lots)?.id ?? "—" },
    { section: "Process conditions", label: "Mixing speed (rpm)", get: (b) => b.mixing.mixingSpeedRpm.toLocaleString(), numeric: (b) => b.mixing.mixingSpeedRpm },
    { label: "Homogeniser (rpm)", get: (b) => b.mixing.homogenizerRpm.toLocaleString(), numeric: (b) => b.mixing.homogenizerRpm },
    { label: "Mixing duration (min)", get: (b) => String(b.mixing.mixingDurationMin), numeric: (b) => b.mixing.mixingDurationMin },
    { label: "Emulsification temp. (°C)", get: (b) => String(b.mixing.emulsificationTempC), numeric: (b) => b.mixing.emulsificationTempC },
    { label: "Cooling rate (°C/min)", get: (b) => String(b.mixing.coolingRateCPerMin), numeric: (b) => b.mixing.coolingRateCPerMin },
    { label: "Processing duration (min)", get: (b) => String(b.processingDurationMin), numeric: (b) => b.processingDurationMin },
    { section: "Laboratory (measured)", label: "Viscosity (cP)", get: (b) => b.lab?.viscosityCps.toLocaleString() ?? "awaiting", numeric: (b) => b.lab?.viscosityCps },
    { label: "Appearance ΔE", get: (b) => b.lab?.appearanceDeltaE.toFixed(2) ?? "awaiting", numeric: (b) => b.lab?.appearanceDeltaE },
    { label: "pH", get: (b) => b.lab?.pH.toFixed(2) ?? "awaiting" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Step 03 · Analyse production data"
        title="Pattern discovery"
        description="Investigate relationships between suppliers, raw material lots, mixing parameters, equipment and laboratory measurements."
        actions={
          <Select value={family} onValueChange={setFamily}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Face Creams">Face Creams</SelectItem><SelectItem value="Body Lotions">Body Lotions</SelectItem></SelectContent>
          </Select>
        }
      />
      <AssociationNotice />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (compareParam) setParams({}); }}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="correlations">Correlation matrix</TabsTrigger>
          <TabsTrigger value="explore">Relationship explorer</TabsTrigger>
          <TabsTrigger value="groups">Supplier &amp; equipment comparison</TabsTrigger>
          <TabsTrigger value="trends">Trend analysis</TabsTrigger>
          <TabsTrigger value="compare">Batch comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="correlations">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div><CardTitle>Correlation with measured outcomes</CardTitle><CardDescription>Pearson r across {data.length} batches with laboratory results · {family}</CardDescription></div>
              <Provenance kind="measured" label="Based on lab data" />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variable</th>
                      {OUTCOMES.map((o) => <th key={o.key} className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{o.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row) => (
                      <tr key={row.feature.key}>
                        <td className="whitespace-nowrap pr-3 font-medium">{row.feature.label} <span className="text-xs text-muted-foreground">({row.feature.unit})</span></td>
                        {row.values.map((v, i) => (
                          <td key={i} className="p-0">
                            <button
                              onClick={() => { setXKey(row.feature.key); setYKey(OUTCOMES[i].key); setTab("explore"); }}
                              className="flex h-14 w-full flex-col items-center justify-center rounded-md border border-white/40 transition-transform hover:scale-[1.02]"
                              style={{ background: corrColor(v.r), color: Math.abs(v.r) > 0.45 ? "white" : "#0f1a2b" }}
                            >
                              <span className="tabular text-base font-semibold">{v.r >= 0 ? "+" : ""}{v.r.toFixed(2)}</span>
                              <span className="text-[10.5px] opacity-90">{strengthLabel(v.r)} · n={v.n}</span>
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded" style={{ background: corrColor(-0.8) }} /> Negative association</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-6 rounded" style={{ background: corrColor(0.8) }} /> Positive association</span>
                <span>Click a cell to explore the relationship.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="explore">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">X variable</div>
                  <Select value={xKey} onValueChange={setXKey}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{FEATURES.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outcome</div>
                  <Select value={yKey} onValueChange={setYKey}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{OUTCOMES.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Colour by</div>
                  <Select value={colorBy} onValueChange={(v) => setColorBy(v as typeof colorBy)}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="carbSupplier">Carbomer supplier</SelectItem><SelectItem value="sheaSupplier">Shea supplier</SelectItem><SelectItem value="equipment">Equipment</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="ml-auto rounded-lg border bg-muted/40 px-4 py-2 text-right">
                  <div className="tabular text-xl font-semibold">r = {r.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{strengthLabel(r)} {r < 0 ? "negative" : "positive"} association · n={allPts.length}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid stroke="#e7ecf2" />
                  <XAxis type="number" dataKey="x" name={xF.label} domain={["auto", "auto"]} tick={{ fontSize: 11 }} label={{ value: `${xF.label} (${xF.unit})`, position: "insideBottom", offset: -12, fontSize: 12 }} />
                  <YAxis type="number" dataKey="y" name={yO.label} domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={60} />
                  <ZAxis range={[48, 48]} />
                  {yKey === "viscosity" && <ReferenceArea ifOverflow="hidden" y1={spec.viscosity.min} y2={spec.viscosity.max} fill="#bfe9d3" fillOpacity={0.5} />}
                  {yKey === "deltaE" && <ReferenceArea ifOverflow="hidden" y1={0} y2={spec.appearance.maxDeltaE} fill="#bfe9d3" fillOpacity={0.5} />}
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => v.toLocaleString()} labelFormatter={() => ""} content={({ payload }) => payload?.[0] ? (
                    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow"><div className="font-mono font-semibold">{(payload[0].payload as { id: string }).id}</div><div>{xF.label}: {(payload[0].payload as { x: number }).x.toLocaleString()}</div><div>{yO.label}: {(payload[0].payload as { y: number }).y.toLocaleString()}</div></div>
                  ) : null} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                  {scatterGroups.map(([k, pts], i) => <Scatter key={k} name={k} data={pts} fill={PALETTE[i % PALETTE.length]} />)}
                  <Scatter name="Linear fit" data={reg} line={{ stroke: "#0f1a2b", strokeDasharray: "5 4", strokeWidth: 1.5 }} shape={() => <g />} legendType="plainline" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
              <div><CardTitle>Outcome by group</CardTitle><CardDescription>Mean measured viscosity ± 1 SD, and in-specification rate</CardDescription></div>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carbLot">Carbomer lot</SelectItem>
                  <SelectItem value="carbSupplier">Carbomer supplier</SelectItem>
                  <SelectItem value="sheaLot">Shea butter lot</SelectItem>
                  <SelectItem value="equipment">Manufacturing equipment</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groups} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e7ecf2" vertical={false} />
                    <XAxis dataKey="group" tick={{ fontSize: 10.5 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} width={56} domain={[Math.min(spec.viscosity.min * 0.8, ...groups.map((g) => g.meanV - g.sdV * 1.5)), "auto"]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <ReferenceArea ifOverflow="hidden" y1={spec.viscosity.min} y2={spec.viscosity.max} fill="#bfe9d3" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v.toLocaleString()} cP`} />
                    <Bar dataKey="meanV" name="Mean viscosity" fill="#1a6648" radius={[3, 3, 0, 0]}>
                      <ErrorBar dataKey="sdV" width={6} stroke="#0f1a2b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-right">n</TableHead><TableHead className="text-right">Visc. mean ± SD</TableHead><TableHead className="text-right">ΔE mean</TableHead><TableHead className="text-right">In spec</TableHead></TableRow></TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.group}>
                      <TableCell className="font-medium">{g.group}</TableCell>
                      <TableCell className="tabular text-right">{g.n}</TableCell>
                      <TableCell className="tabular text-right">{g.meanV.toLocaleString()} ± {g.sdV.toLocaleString()}</TableCell>
                      <TableCell className="tabular text-right">{g.meanDE.toFixed(2)}</TableCell>
                      <TableCell className={cn("tabular text-right font-semibold", g.inSpec < 0.8 ? "text-red-700" : "text-forest-700")}>{Math.round(g.inSpec * 100)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground lg:col-span-2">Small groups (n &lt; 5) produce unstable estimates. Differences between groups indicate where to look, not what caused the variation.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="grid gap-6 xl:grid-cols-2">
          {[
            { key: "v", roll: "rolling", title: "Viscosity over time", unit: "cP", band: [spec.viscosity.min, spec.viscosity.max] as [number, number] },
            { key: "de", roll: "deRolling", title: "Appearance ΔE over time", unit: "ΔE", band: [0, spec.appearance.maxDeltaE] as [number, number] },
          ].map((c) => (
            <Card key={c.key}>
              <CardHeader><CardTitle>{c.title}</CardTitle><CardDescription>Measured values with 5-batch rolling mean · shaded band = specification</CardDescription></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e7ecf2" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11 }} width={52} domain={["auto", "auto"]} />
                    <ReferenceArea ifOverflow="hidden" y1={c.band[0]} y2={c.band[1]} fill="#bfe9d3" fillOpacity={0.55} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(_, p) => p?.[0]?.payload?.id ?? ""} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Scatter dataKey={c.key} name="Measured" fill="#3a5274" />
                    <Line dataKey={c.roll} name="Rolling mean (5)" stroke="#d9622b" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="compare">
          <Card>
            <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
              <div><CardTitle>Batch comparison</CardTitle><CardDescription>Compare up to four batches side by side. Differing values are highlighted.</CardDescription></div>
              {compared.length < 4 && (
                <Select value="" onValueChange={(v) => setCompare((c) => [...c, v])}>
                  <SelectTrigger className="w-64"><Plus className="h-4 w-4" /><SelectValue placeholder="Add batch to compare" /></SelectTrigger>
                  <SelectContent>{[...batches].sort((a, b) => b.productionDate.localeCompare(a.productionDate)).filter((b) => !compare.includes(b.id)).map((b) => <SelectItem key={b.id} value={b.id}>{b.id} · {b.productName}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-56 px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Attribute</th>
                    {compared.map((b) => (
                      <th key={b.id} className="px-3 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <Link to={`/app/batches/${b.id}`} className="font-mono text-[13px] font-semibold text-forest-700 hover:underline">{b.id}</Link>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCompare((c) => c.filter((x) => x !== b.id))} aria-label="Remove"><X className="h-3 w-3" /></Button>
                        </div>
                        <div className="mt-1"><BatchStatusBadge status={b.status} /></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => {
                    const vals = compared.map(row.get);
                    const differs = new Set(vals).size > 1;
                    const nums = row.numeric ? compared.map(row.numeric) : [];
                    const valid = nums.filter((n): n is number => n !== undefined);
                    const spread = valid.length > 1 ? Math.max(...valid) - Math.min(...valid) : 0;
                    return [
                      row.section ? (
                        <tr key={`s-${row.section}`} className="bg-muted/50"><td colSpan={compared.length + 1} className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-forest-700">{row.section}</td></tr>
                      ) : null,
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="px-5 py-2 text-muted-foreground">{row.label}{row.numeric && spread > 0 && <span className="ml-1 text-[10.5px]">(Δ {+spread.toFixed(2)})</span>}</td>
                        {vals.map((v, i) => <td key={i} className={cn("tabular px-3 py-2 font-medium", differs && "bg-amber-50 text-amber-950")}>{v}</td>)}
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
