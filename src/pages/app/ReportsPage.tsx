import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { Provenance } from "@/components/shared/Provenance";
import { InvestigationStatusBadge } from "@/components/shared/StatusBadge";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { buildReport, HEADERS, reportToCsv, reportToPdf } from "@/lib/report";
import { downloadBlob } from "@/lib/utils";

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/60"><tr>{headers.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((r, i) => (
            <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${c === "OUT" ? "font-semibold text-red-700" : ""} ${headers[j] === "Note" || headers[j] === "Evidence" ? "min-w-[280px] whitespace-normal" : "whitespace-nowrap"}`}>{c}</td>)}</tr>
          )) : <tr><td colSpan={headers.length} className="px-3 py-3 text-muted-foreground">None recorded.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Section({ n, title, kind, note, children }: { n: number; title: string; kind?: "measured" | "predicted" | "decided"; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] font-semibold text-forest-800">{n}. {title}</h3>
        {kind && <Provenance kind={kind} />}
      </div>
      {note && <p className="text-xs italic text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}

export default function ReportsPage() {
  const store = useStore();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const invId = params.get("inv") ?? store.investigations[0].id;
  const inv = store.investigations.find((i) => i.id === invId)!;
  const [busy, setBusy] = useState(false);

  const report = useMemo(
    () =>
      buildReport({
        investigation: inv,
        batches: inv.batchIds.map((id) => store.batches.find((b) => b.id === id)!).filter(Boolean),
        allBatches: store.batches,
        lots: store.lots,
        materials: store.materials,
        suppliers: store.suppliers,
        equipment: store.equipment,
        predictions: store.predictions,
        specFor: store.specFor,
        generatedBy: user?.name ?? "User",
      }),
    [inv, store, user]
  );

  const pdf = async () => {
    setBusy(true);
    try {
      await reportToPdf(report);
      toast.success("PDF report downloaded");
    } finally {
      setBusy(false);
    }
  };
  const csv = () => {
    downloadBlob(reportToCsv(report), `${inv.id}-investigation-report.csv`, "text/csv");
    toast.success("CSV report downloaded");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Step 06 · Document findings"
        title="Investigation reports"
        description="Generate traceable reports containing batch information, genealogy, conditions, measurements, predictions, patterns, notes and approved conclusions."
        actions={
          <>
            <Button variant="outline" onClick={csv}><FileSpreadsheet /> Export CSV</Button>
            <Button onClick={pdf} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />} Export PDF</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Select investigation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={invId} onValueChange={(v) => setParams({ inv: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{store.investigations.map((i) => <SelectItem key={i.id} value={i.id}>{i.id}</SelectItem>)}</SelectContent>
            </Select>
            <div className="space-y-2">
              {store.investigations.map((i) => (
                <button key={i.id} onClick={() => setParams({ inv: i.id })} className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted/50 ${i.id === invId ? "border-forest-400 bg-forest-50/60" : ""}`}>
                  <div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{i.id}</span><InvestigationStatusBadge status={i.status} /></div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.title}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between bg-forest-950 px-6 py-5 text-white">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-mint-300">BlendQuoin · Investigation report</div>
              <div className="mt-1 text-lg font-semibold">{report.title}</div>
            </div>
            <FileText className="h-8 w-8 text-mint-300/70" />
          </div>
          <CardContent className="space-y-8 p-6">
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              {report.meta.map(([k, v]) => <div key={k}><dt className="text-[11px] text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
            <Section n={1} title="Batch information"><ReportTable headers={HEADERS.batchInfo} rows={report.batchInfo} /></Section>
            <Section n={2} title="Ingredient genealogy" note="CoA values are supplier-reported."><ReportTable headers={HEADERS.genealogy} rows={report.genealogy} /></Section>
            <Section n={3} title="Production conditions"><ReportTable headers={HEADERS.conditions} rows={report.conditions} /></Section>
            <Section n={4} title="Laboratory measurements" kind="measured"><ReportTable headers={HEADERS.lab} rows={report.lab} /></Section>
            <Section n={5} title="Predicted deviations" kind="predicted" note="Simulated model estimates. Not laboratory results and not a basis for release decisions."><ReportTable headers={HEADERS.predictions} rows={report.predictions} /></Section>
            <Section n={6} title="Observed patterns" note="Statistical associations — not proven causes.">
              <ul className="space-y-1.5 text-sm">{report.patterns.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-forest-500" />{p}</li>)}</ul>
            </Section>
            <Section n={7} title="Investigation notes"><ReportTable headers={HEADERS.notes} rows={report.notes} /></Section>
            <Section n={8} title="Suspected contributing factors" note="Team assessment."><ReportTable headers={HEADERS.factors} rows={report.factors} /></Section>
            <Section n={9} title="Quality team conclusion" kind="decided">
              {report.conclusion ? (
                <div className={`space-y-2 rounded-md border-2 p-4 text-sm ${report.conclusion.approval.startsWith("Approved") ? "border-forest-200 bg-forest-50/40" : "border-amber-200 bg-amber-50/50"}`}>
                  <div><span className="text-muted-foreground">Root cause status:</span> <strong>{report.conclusion.status}</strong></div>
                  <p>{report.conclusion.summary}</p>
                  <p><span className="text-muted-foreground">Actions:</span> {report.conclusion.actions}</p>
                  <p className="font-medium">{report.conclusion.approval}</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">No conclusion documented.</p>}
            </Section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
