import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { BatchStatusBadge, PredictionBadge } from "@/components/shared/StatusBadge";
import { PRODUCT_FAMILIES, FACILITIES } from "@/data/seed";
import type { BatchStatus } from "@/data/types";
import { useStore } from "@/lib/store";
import { downloadBlob, formatDate } from "@/lib/utils";
import { toCsv } from "@/lib/csv";
import { inSpecAppearance, inSpecViscosity } from "@/lib/analytics";
import { worstStatus } from "@/services/prediction/simulatedModel";

const STATUSES: BatchStatus[] = ["In production", "Awaiting lab", "Released", "Quality review", "Under investigation", "On hold"];

export default function BatchesPage() {
  const { batches, predictions, specFor, lots } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [family, setFamily] = useState("all");
  const [status, setStatus] = useState("all");
  const [facility, setFacility] = useState("all");

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return batches
      .filter((b) => !term || b.id.toLowerCase().includes(term) || b.productName.toLowerCase().includes(term) || b.lots.some((l) => l.lotId.toLowerCase().includes(term)))
      .filter((b) => family === "all" || b.productFamily === family)
      .filter((b) => status === "all" || b.status === status)
      .filter((b) => facility === "all" || b.facility === facility)
      .sort((a, b) => b.productionDate.localeCompare(a.productionDate));
  }, [batches, q, family, status, facility]);

  const exportCsv = () => {
    const data = rows.map((b) => ({
      batch_id: b.id,
      product: b.productName,
      family: b.productFamily,
      production_date: b.productionDate,
      facility: b.facility,
      equipment: b.equipmentId,
      size_kg: b.sizeKg,
      ingredient_lots: b.lots.map((l) => l.lotId).join(" | "),
      mixing_speed_rpm: b.mixing.mixingSpeedRpm,
      mixing_duration_min: b.mixing.mixingDurationMin,
      emulsification_temp_c: b.mixing.emulsificationTempC,
      cooling_rate_c_min: b.mixing.coolingRateCPerMin,
      processing_duration_min: b.processingDurationMin,
      measured_viscosity_cp: b.lab?.viscosityCps ?? "",
      measured_delta_e: b.lab?.appearanceDeltaE ?? "",
      predicted_viscosity_cp_SIMULATED: predictions[b.id]?.[0]?.predicted ?? "",
      predicted_delta_e_SIMULATED: predictions[b.id]?.[1]?.predicted ?? "",
      predicted_status_SIMULATED: worstStatus(predictions[b.id] ?? []),
      batch_status: b.status,
      quality_decision: b.decision?.decision ?? "",
      decision_by: b.decision?.by ?? "",
    }));
    downloadBlob(toCsv(data), `blendquoin-batches-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 01 · Register batches"
        title="Production batches"
        description="Every batch with its ingredient lots, process conditions, laboratory measurements and status."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
            <Button asChild><Link to="/app/batches/new"><Plus /> Register batch</Link></Button>
          </>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-3 border-b p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search batch ID, product or ingredient lot…" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} />
          </div>
          <Select value={family} onValueChange={setFamily}>
            <SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All families</SelectItem>{PRODUCT_FAMILIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={facility} onValueChange={setFacility}>
            <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All facilities</SelectItem>{FACILITIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Batch ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Produced</TableHead>
              <TableHead>Facility · Equip.</TableHead>
              <TableHead className="text-right">Lots</TableHead>
              <TableHead className="text-right">Temp °C</TableHead>
              <TableHead className="text-right">Visc. cP (lab)</TableHead>
              <TableHead className="text-right">ΔE (lab)</TableHead>
              <TableHead>Predicted (sim.)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => {
              const s = specFor(b.productFamily);
              const flagged = b.lots.some((u) => lots.find((l) => l.id === u.lotId)?.status !== "Released");
              return (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/app/batches/${b.id}`)}>
                  <TableCell className="pl-5 font-mono text-[13px] font-medium text-forest-700">{b.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.productName}</div>
                    <div className="text-xs text-muted-foreground">{b.productFamily}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(b.productionDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.facility.split(",")[0]} · {b.equipmentId}</TableCell>
                  <TableCell className="tabular text-right">{b.lots.length}{flagged && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-orange-500" title="Includes a flagged or quarantined lot" />}</TableCell>
                  <TableCell className="tabular text-right">{b.mixing.emulsificationTempC}</TableCell>
                  <TableCell className={`tabular text-right font-medium ${b.lab && !inSpecViscosity(b, s) ? "text-red-700" : ""}`}>{b.lab ? b.lab.viscosityCps.toLocaleString() : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className={`tabular text-right font-medium ${b.lab && !inSpecAppearance(b, s) ? "text-red-700" : ""}`}>{b.lab ? b.lab.appearanceDeltaE.toFixed(2) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><PredictionBadge status={worstStatus(predictions[b.id] ?? [])} /></TableCell>
                  <TableCell><BatchStatusBadge status={b.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">{rows.length} of {batches.length} batches</div>
      </Card>
    </div>
  );
}
