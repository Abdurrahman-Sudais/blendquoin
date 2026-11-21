import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Boxes, Building2, Cpu, ExternalLink, FlaskConical, GitFork, Package, Thermometer, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { BatchStatusBadge, LotStatusBadge } from "@/components/shared/StatusBadge";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import { inSpecAppearance, inSpecViscosity } from "@/lib/analytics";

type Kind = "supplier" | "material" | "lot" | "batch" | "equipment" | "process" | "lab";
interface GNode {
  id: string;
  kind: Kind;
  title: string;
  sub: string;
  tone?: "ok" | "warn" | "alert" | "focus";
  nav?: { param: "batch" | "lot" | "supplier"; value: string };
}
interface GEdge { from: string; to: string; tone?: "warn" }

const KIND_META: Record<Kind, { icon: typeof Boxes; label: string; cls: string }> = {
  supplier: { icon: Truck, label: "Supplier", cls: "border-sky-200 bg-sky-50/60" },
  material: { icon: Package, label: "Raw material", cls: "border-teal-200 bg-teal-50/60" },
  lot: { icon: Boxes, label: "Ingredient lot", cls: "border-emerald-200 bg-emerald-50/60" },
  batch: { icon: GitFork, label: "Finished batch", cls: "border-forest-300 bg-white" },
  equipment: { icon: Cpu, label: "Equipment", cls: "border-slate-200 bg-slate-50" },
  process: { icon: Thermometer, label: "Process conditions", cls: "border-slate-200 bg-slate-50" },
  lab: { icon: FlaskConical, label: "Lab result", cls: "border-navy-200 bg-navy-50/60" },
};

const COL_W = 196;
const GAP_X = 52;
const NODE_H = 64;
const GAP_Y = 12;

function Graph({ columns, edges, onNavigate }: { columns: { title: string; nodes: GNode[] }[]; edges: GEdge[]; onNavigate: (n: GNode) => void }) {
  const maxRows = Math.max(...columns.map((c) => c.nodes.length));
  const height = Math.max(maxRows * (NODE_H + GAP_Y) - GAP_Y, NODE_H);
  const width = columns.length * COL_W + (columns.length - 1) * GAP_X;
  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((col, ci) => {
    const colH = col.nodes.length * (NODE_H + GAP_Y) - GAP_Y;
    const offset = (height - colH) / 2;
    col.nodes.forEach((n, ri) => pos.set(n.id, { x: ci * (COL_W + GAP_X), y: offset + ri * (NODE_H + GAP_Y) }));
  });

  return (
    <div className="overflow-x-auto pb-2">
      <div style={{ width }} className="mx-auto">
        <div className="mb-3 flex" style={{ gap: GAP_X }}>
          {columns.map((c) => <div key={c.title} style={{ width: COL_W }} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</div>)}
        </div>
        <div className="relative" style={{ height }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
            {edges.map((e) => {
              const a = pos.get(e.from);
              const b = pos.get(e.to);
              if (!a || !b) return null;
              const x1 = a.x + COL_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return <path key={`${e.from}-${e.to}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={e.tone === "warn" ? "#ea8a4f" : "#9fb8ad"} strokeWidth={e.tone === "warn" ? 2 : 1.4} strokeDasharray={e.tone === "warn" ? "0" : "0"} />;
            })}
          </svg>
          {columns.flatMap((c) => c.nodes).map((n) => {
            const p = pos.get(n.id)!;
            const meta = KIND_META[n.kind];
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onNavigate(n)}
                disabled={!n.nav}
                className={cn(
                  "absolute flex items-center gap-2.5 rounded-lg border px-3 text-left shadow-sm transition-all",
                  meta.cls,
                  n.nav && "hover:-translate-y-px hover:shadow-md",
                  !n.nav && "cursor-default",
                  n.tone === "focus" && "border-2 border-forest-700 bg-forest-950 text-white shadow-lg",
                  n.tone === "alert" && "border-red-300 bg-red-50",
                  n.tone === "warn" && "border-orange-300 bg-orange-50"
                )}
                style={{ left: p.x, top: p.y, width: COL_W, height: NODE_H }}
              >
                <Icon className={cn("h-4 w-4 shrink-0", n.tone === "focus" ? "text-mint-300" : "text-navy-500")} />
                <div className="min-w-0">
                  <div className={cn("truncate text-[13px] font-semibold", n.kind === "lot" || n.kind === "batch" ? "font-mono" : "", n.tone === "focus" ? "text-white" : "text-navy-900")}>{n.title}</div>
                  <div className={cn("truncate text-[11px]", n.tone === "focus" ? "text-forest-100/80" : "text-muted-foreground")}>{n.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GenealogyPage() {
  const { batches, lots, materials, suppliers, equipment, specFor } = useStore();
  const [params, setParams] = useSearchParams();
  const lotParam = params.get("lot");
  const supplierParam = params.get("supplier");
  const batchParam = params.get("batch");
  const mode: "batch" | "lot" | "supplier" = lotParam ? "lot" : supplierParam ? "supplier" : "batch";

  const sortedBatches = useMemo(() => [...batches].sort((a, b) => b.productionDate.localeCompare(a.productionDate)), [batches]);
  const mat = (id: string) => materials.find((m) => m.id === id)!;
  const sup = (id: string) => suppliers.find((s) => s.id === id)!;
  const lotTone = (status: string) => (status === "Flagged" ? "alert" : status === "Quarantine" ? "warn" : undefined) as GNode["tone"];

  const labNode = (bId: string): GNode => {
    const b = batches.find((x) => x.id === bId)!;
    if (!b.lab) return { id: `lab-${b.id}`, kind: "lab", title: "Awaiting lab", sub: "No measurement yet" };
    const s = specFor(b.productFamily);
    const ok = inSpecViscosity(b, s) && inSpecAppearance(b, s);
    return { id: `lab-${b.id}`, kind: "lab", title: `${b.lab.viscosityCps.toLocaleString()} cP · ΔE ${b.lab.appearanceDeltaE.toFixed(2)}`, sub: ok ? "Within specification" : "Outside specification", tone: ok ? undefined : "alert" };
  };

  const graph = useMemo(() => {
    if (mode === "batch") {
      const b = batches.find((x) => x.id === batchParam) ?? sortedBatches.find((x) => x.status === "Under investigation") ?? sortedBatches[0];
      const used = b.lots.map((u) => lots.find((l) => l.id === u.lotId)!);
      const supIds = [...new Set(used.map((l) => l.supplierId))];
      const eq = equipment.find((e) => e.id === b.equipmentId)!;
      const columns = [
        { title: "Suppliers", nodes: supIds.map<GNode>((id) => ({ id, kind: "supplier", title: sup(id).name, sub: sup(id).country, nav: { param: "supplier", value: id } })) },
        { title: "Raw materials", nodes: used.map<GNode>((l) => ({ id: `m-${l.materialId}`, kind: "material", title: mat(l.materialId).name, sub: mat(l.materialId).role })) },
        { title: "Ingredient lots", nodes: used.map<GNode>((l) => ({ id: l.id, kind: "lot", title: l.id, sub: `CoA ${l.coaValue.toLocaleString()} ${l.coaUnit} · ${l.status}`, tone: lotTone(l.status), nav: { param: "lot", value: l.id } })) },
        { title: "Finished batch", nodes: [{ id: b.id, kind: "batch", title: b.id, sub: b.productName, tone: "focus" } as GNode] },
        {
          title: "Equipment & process",
          nodes: [
            { id: eq.id, kind: "equipment", title: `${eq.id} · ${eq.name}`, sub: eq.facility } as GNode,
            { id: "proc", kind: "process", title: `${b.mixing.emulsificationTempC} °C · ${b.mixing.mixingSpeedRpm} rpm`, sub: `${b.mixing.mixingDurationMin} min mix · ${b.mixing.coolingRateCPerMin} °C/min cool` } as GNode,
          ],
        },
        { title: "Laboratory results", nodes: [labNode(b.id)] },
      ];
      const edges: GEdge[] = [
        ...used.map((l) => ({ from: l.supplierId, to: `m-${l.materialId}` })),
        ...used.map((l) => ({ from: `m-${l.materialId}`, to: l.id })),
        ...used.map((l) => ({ from: l.id, to: b.id, tone: l.status !== "Released" ? ("warn" as const) : undefined })),
        { from: b.id, to: eq.id },
        { from: b.id, to: "proc" },
        { from: eq.id, to: `lab-${b.id}` },
        { from: "proc", to: `lab-${b.id}` },
      ];
      return { columns, edges, focus: { type: "batch" as const, batch: b } };
    }
    if (mode === "lot") {
      const l = lots.find((x) => x.id === lotParam) ?? lots[0];
      const users = batches.filter((b) => b.lots.some((u) => u.lotId === l.id)).sort((a, b) => a.productionDate.localeCompare(b.productionDate));
      const columns = [
        { title: "Supplier", nodes: [{ id: l.supplierId, kind: "supplier", title: sup(l.supplierId).name, sub: sup(l.supplierId).country, nav: { param: "supplier", value: l.supplierId } } as GNode] },
        { title: "Raw material", nodes: [{ id: `m-${l.materialId}`, kind: "material", title: mat(l.materialId).name, sub: mat(l.materialId).criticalProperty } as GNode] },
        { title: "Ingredient lot", nodes: [{ id: l.id, kind: "lot", title: l.id, sub: `CoA ${l.coaValue.toLocaleString()} ${l.coaUnit} · ${l.status}`, tone: "focus" } as GNode] },
        { title: `Finished batches (${users.length})`, nodes: users.map<GNode>((b) => ({ id: b.id, kind: "batch", title: b.id, sub: `${b.productName} · ${formatDate(b.productionDate, { day: "2-digit", month: "short" })}`, nav: { param: "batch", value: b.id } })) },
        { title: "Laboratory results", nodes: users.map((b) => labNode(b.id)) },
      ];
      const edges: GEdge[] = [
        { from: l.supplierId, to: `m-${l.materialId}` },
        { from: `m-${l.materialId}`, to: l.id },
        ...users.map((b) => ({ from: l.id, to: b.id, tone: l.status !== "Released" ? ("warn" as const) : undefined })),
        ...users.map((b) => ({ from: b.id, to: `lab-${b.id}` })),
      ];
      return { columns, edges, focus: { type: "lot" as const, lot: l, users } };
    }
    const s = sup(supplierParam!) ?? suppliers[0];
    const sLots = lots.filter((l) => l.supplierId === s.id);
    const users = batches.filter((b) => b.lots.some((u) => sLots.some((l) => l.id === u.lotId))).sort((a, b) => a.productionDate.localeCompare(b.productionDate));
    const shown = users.slice(-14);
    const columns = [
      { title: "Supplier", nodes: [{ id: s.id, kind: "supplier", title: s.name, sub: `${s.country} · score ${s.qualificationScore}`, tone: "focus" } as GNode] },
      { title: "Ingredient lots", nodes: sLots.map<GNode>((l) => ({ id: l.id, kind: "lot", title: l.id, sub: `${mat(l.materialId).name} · ${l.status}`, tone: lotTone(l.status), nav: { param: "lot", value: l.id } })) },
      { title: `Finished batches (latest ${shown.length} of ${users.length})`, nodes: shown.map<GNode>((b) => ({ id: b.id, kind: "batch", title: b.id, sub: b.productName, nav: { param: "batch", value: b.id } })) },
      { title: "Laboratory results", nodes: shown.map((b) => labNode(b.id)) },
    ];
    const edges: GEdge[] = [
      ...sLots.map((l) => ({ from: s.id, to: l.id })),
      ...shown.flatMap((b) => b.lots.filter((u) => sLots.some((l) => l.id === u.lotId)).map((u) => ({ from: u.lotId, to: b.id, tone: lots.find((l) => l.id === u.lotId)!.status !== "Released" ? ("warn" as const) : undefined }))),
      ...shown.map((b) => ({ from: b.id, to: `lab-${b.id}` })),
    ];
    return { columns, edges, focus: { type: "supplier" as const, supplier: s, users } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, batchParam, lotParam, supplierParam, batches, lots]);

  const go = (n: GNode) => n.nav && setParams({ [n.nav.param]: n.nav.value });

  return (
    <div>
      <PageHeader
        eyebrow="Step 02 · Connect ingredient lots"
        title="Batch genealogy"
        description="Trace relationships between suppliers, raw materials, ingredient lots, finished batches, equipment, process conditions and laboratory results. Click a node to navigate."
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <Tabs value={mode} onValueChange={(v) => setParams(v === "batch" ? { batch: sortedBatches[0].id } : v === "lot" ? { lot: "OP-CB-2609" } : { supplier: "SUP-02" })}>
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="batch"><GitFork /> Trace a batch</TabsTrigger>
              <TabsTrigger value="lot"><Boxes /> Where-used (lot)</TabsTrigger>
              <TabsTrigger value="supplier"><Building2 /> Supplier</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex-1 lg:max-w-sm">
            {mode === "batch" && (
              <Select value={graph.focus.type === "batch" ? graph.focus.batch.id : ""} onValueChange={(v) => setParams({ batch: v })}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>{sortedBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.id} · {b.productName}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {mode === "lot" && (
              <Select value={graph.focus.type === "lot" ? graph.focus.lot.id : ""} onValueChange={(v) => setParams({ lot: v })}>
                <SelectTrigger><SelectValue placeholder="Select ingredient lot" /></SelectTrigger>
                <SelectContent>{lots.map((l) => <SelectItem key={l.id} value={l.id}>{l.id} · {mat(l.materialId).name}{l.status !== "Released" ? ` · ${l.status}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {mode === "supplier" && (
              <Select value={graph.focus.type === "supplier" ? graph.focus.supplier.id : ""} onValueChange={(v) => setParams({ supplier: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground lg:ml-auto">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-forest-700 bg-forest-950" /> Focus</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-red-300 bg-red-50" /> Flagged / out of spec</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-orange-300 bg-orange-50" /> Quarantine</span>
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-4 bg-[#ea8a4f]" /> Uses non-released lot</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5"><Graph columns={graph.columns} edges={graph.edges} onNavigate={go} /></CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {graph.focus.type === "batch" && (
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div><CardTitle className="font-mono">{graph.focus.batch.id}</CardTitle><CardDescription>{graph.focus.batch.productName} · {graph.focus.batch.facility}</CardDescription></div>
              <div className="flex items-center gap-2"><BatchStatusBadge status={graph.focus.batch.status} /><Button variant="outline" size="sm" asChild><Link to={`/app/batches/${graph.focus.batch.id}`}>Batch profile <ExternalLink /></Link></Button></div>
            </CardHeader>
          </Card>
        )}
        {(graph.focus.type === "lot" || graph.focus.type === "supplier") && (
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>{graph.focus.type === "lot" ? <>Finished batches that used <span className="font-mono">{graph.focus.lot.id}</span></> : <>Batches using lots from {graph.focus.supplier.name}</>}</CardTitle>
                <CardDescription>
                  {graph.focus.users.length} batches · {graph.focus.users.filter((b) => !b.lab).length} without laboratory results · {graph.focus.users.filter((b) => b.lab && !(inSpecViscosity(b, specFor(b.productFamily)) && inSpecAppearance(b, specFor(b.productFamily)))).length} outside specification
                </CardDescription>
              </div>
              {graph.focus.type === "lot" && <LotStatusBadge status={graph.focus.lot.status} />}
            </CardHeader>
            <CardContent>
              {graph.focus.type === "lot" && graph.focus.lot.alert && <p className="mb-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">{graph.focus.lot.alert}</p>}
              <div className="flex flex-wrap gap-2">
                {graph.focus.users.map((b) => (
                  <Link key={b.id} to={`/app/batches/${b.id}`} className="rounded-md border px-2.5 py-1.5 font-mono text-xs font-medium text-forest-700 hover:bg-muted">{b.id}</Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
