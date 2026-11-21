import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Boxes, ClipboardCheck, Gauge, Search, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { BatchStatusBadge, LotStatusBadge, PRED_COLORS, PredictionBadge } from "@/components/shared/StatusBadge";
import { Provenance } from "@/components/shared/Provenance";
import { PRODUCT_FAMILIES } from "@/data/seed";
import type { BatchStatus, PredictionStatus } from "@/data/types";
import { batchSuppliers, consistencyScore, inSpecAppearance, inSpecViscosity, mean } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { worstStatus } from "@/services/prediction/simulatedModel";

const STATUSES: BatchStatus[] = ["In production", "Awaiting lab", "Released", "Quality review", "Under investigation", "On hold"];

export default function DashboardPage() {
  const { batches, lots, suppliers, predictions, specFor, materials, investigations } = useStore();
  const [family, setFamily] = useState<string>("Face Creams");
  const [supplier, setSupplier] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-11-30");

  const filtered = useMemo(
    () =>
      batches
        .filter((b) => family === "all" || b.productFamily === family)
        .filter((b) => status === "all" || b.status === status)
        .filter((b) => b.productionDate >= from && b.productionDate <= to)
        .filter((b) => supplier === "all" || batchSuppliers(b, lots).has(supplier))
        .sort((a, b) => a.productionDate.localeCompare(b.productionDate)),
    [batches, family, status, from, to, supplier, lots]
  );

  const spec = specFor(family === "all" ? "Face Creams" : family);
  const measured = filtered.filter((b) => b.lab);
  const predStatus = (id: string) => worstStatus(predictions[id] ?? []);
  const predictedDeviations = filtered.filter((b) => !b.lab && ["Potential deviation", "Requires quality review"].includes(predStatus(b.id)));
  const consistency = mean(measured.map((b) => consistencyScore(b, specFor(b.productFamily)) ?? 0));
  const inSpecRate = measured.length ? measured.filter((b) => inSpecViscosity(b, specFor(b.productFamily)) && inSpecAppearance(b, specFor(b.productFamily))).length / measured.length : 0;

  const trend = filtered.map((b) => {
    const p = predictions[b.id]?.find((x) => x.property === "viscosity");
    return {
      id: b.id,
      date: formatDate(b.productionDate, { day: "2-digit", month: "short" }),
      measured: b.lab?.viscosityCps,
      predicted: !b.lab ? p?.predicted : undefined,
      deltaE: b.lab?.appearanceDeltaE,
    };
  });

  // weekly batch counts by status
  const weekly = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const b of filtered) {
      const d = new Date(b.productionDate);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key) ?? { week: formatDate(key, { day: "2-digit", month: "short" }), Released: 0, Review: 0, Investigation: 0, Pending: 0 };
      const bucket = b.status === "Released" ? "Released" : b.status === "Quality review" ? "Review" : b.status === "Under investigation" || b.status === "On hold" ? "Investigation" : "Pending";
      row[bucket] = (row[bucket] as number) + 1;
      map.set(key, row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filtered]);

  const predDist = (["Within specification", "Monitor", "Potential deviation", "Requires quality review"] as PredictionStatus[]).map((s) => ({
    status: s,
    count: filtered.filter((b) => predStatus(b.id) === s).length,
  }));

  const recentLab = [...measured].sort((a, b) => b.lab!.measuredAt.localeCompare(a.lab!.measuredAt)).slice(0, 7);
  const lotAlerts = lots.filter((l) => l.status !== "Released");
  const resetFilters = () => { setFamily("all"); setSupplier("all"); setStatus("all"); setFrom("2026-06-01"); setTo("2026-11-30"); };

  return (
    <div>
      <PageHeader
        eyebrow="Production overview"
        title="Quality dashboard"
        description="Measured laboratory outcomes and simulated deviation risk across your production batches."
        actions={<Button asChild><Link to="/app/batches/new"><Boxes /> Register batch</Link></Button>}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product family</label>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                {PRODUCT_FAMILIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button variant="ghost" onClick={resetFilters}><X /> Clear</Button></div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Total production batches" value={filtered.length} sub={`${measured.length} with lab results`} icon={<Boxes />} />
        <StatCard label="Under investigation" value={filtered.filter((b) => b.status === "Under investigation" || b.status === "On hold").length} sub={`${investigations.filter((i) => i.status !== "Closed").length} open investigations`} icon={<Search />} tone="warn" />
        <StatCard label="Predicted deviations" value={predictedDeviations.length} sub={<span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-500" /> Simulated · batches awaiting lab</span>} icon={<AlertTriangle />} tone="alert" />
        <StatCard label="Requiring quality review" value={filtered.filter((b) => b.status === "Quality review").length} sub="Awaiting a human decision" icon={<ClipboardCheck />} tone="warn" />
        <StatCard label="Average batch consistency" value={measured.length ? `${Math.round(consistency)}` : "—"} sub={`${Math.round(inSpecRate * 100)}% of measured batches in spec`} icon={<Gauge />} tone="good" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Viscosity trend</CardTitle>
              <CardDescription>
                {family === "all" ? "Spec band shown for Face Creams" : `${family}`} · specification {spec.viscosity.min.toLocaleString()}–{spec.viscosity.max.toLocaleString()} cP
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5"><Provenance kind="measured" /><Provenance kind="predicted" /></div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e7ecf2" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={52} domain={["dataMin - 1500", "dataMax + 1500"]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                {family !== "all" && <ReferenceArea ifOverflow="hidden" y1={spec.viscosity.min} y2={spec.viscosity.max} fill="#bfe9d3" fillOpacity={0.55} />}
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, n: string) => [`${v.toLocaleString()} cP`, n]} labelFormatter={(_, p) => (p?.[0]?.payload?.id ? `${p[0].payload.id} · ${p[0].payload.date}` : "")} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="measured" name="Measured viscosity" stroke="#1a6648" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                <Scatter dataKey="predicted" name="Predicted (simulated)" fill="#7c3aed" shape="diamond" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Predicted status distribution</CardTitle>
            <CardDescription className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-500" /> Simulated model · worst of viscosity / appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {predDist.map((d) => (
              <div key={d.status}>
                <div className="mb-1 flex justify-between text-sm"><PredictionBadge status={d.status} /><span className="tabular font-medium">{d.count}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${filtered.length ? (d.count / filtered.length) * 100 : 0}%`, background: PRED_COLORS[d.status] }} /></div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2 w-full" asChild><Link to="/app/predictions">Open deviation prediction <ArrowRight /></Link></Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Recent laboratory results</CardTitle>
              <CardDescription>Latest measured values against specification</CardDescription>
            </div>
            <Provenance kind="measured" />
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Viscosity (cP)</TableHead>
                  <TableHead className="text-right">ΔE</TableHead>
                  <TableHead>Measured</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLab.map((b) => {
                  const s = specFor(b.productFamily);
                  const vOk = inSpecViscosity(b, s);
                  const aOk = inSpecAppearance(b, s);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="pl-5"><Link to={`/app/batches/${b.id}`} className="font-mono text-[13px] font-medium text-forest-700 hover:underline">{b.id}</Link></TableCell>
                      <TableCell className="max-w-[180px] truncate">{b.productName}</TableCell>
                      <TableCell className={`tabular text-right font-medium ${vOk ? "" : "text-red-700"}`}>{b.lab!.viscosityCps.toLocaleString()}</TableCell>
                      <TableCell className={`tabular text-right font-medium ${aOk ? "" : "text-red-700"}`}>{b.lab!.appearanceDeltaE.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(b.lab!.measuredAt)}</TableCell>
                      <TableCell><BatchStatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingredient lot alerts</CardTitle>
            <CardDescription>Lots flagged or quarantined</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lotAlerts.map((l) => {
              const used = batches.filter((b) => b.lots.some((u) => u.lotId === l.id)).length;
              return (
                <div key={l.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold text-navy-900">{l.id}</span>
                    <LotStatusBadge status={l.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {materials.find((m) => m.id === l.materialId)?.name} · {suppliers.find((s) => s.id === l.supplierId)?.name}
                  </div>
                  <p className="mt-2 text-[13px] text-navy-700">{l.alert}</p>
                  <Link to={`/app/genealogy?lot=${l.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:underline">
                    Used in {used} batches — view genealogy <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Production volume by week</CardTitle>
          <CardDescription>Batches produced, grouped by current status</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#e7ecf2" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "#f1f5f9" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Released" stackId="a" fill="#1a6648" />
              <Bar dataKey="Review" name="Quality review" stackId="a" fill="#c58a1b" />
              <Bar dataKey="Investigation" name="Investigation / hold" stackId="a" fill="#d9622b" />
              <Bar dataKey="Pending" name="In production / awaiting lab" stackId="a" fill="#aebdd2" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
