import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Bot, FileText, FileUp, GitFork, Loader2, Paperclip, Plus, Sparkles, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/PageHeader";
import { BatchStatusBadge, InvestigationStatusBadge, LotStatusBadge, PredictionBadge } from "@/components/shared/StatusBadge";
import { Provenance } from "@/components/shared/Provenance";
import { TEAM } from "@/data/seed";
import type { Attachment, InvestigationConclusion, InvestigationStatus, SuspectedFactor } from "@/data/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { inSpecAppearance, inSpecViscosity, mean } from "@/lib/analytics";
import { classifyNote } from "@/services/ai/assistant";
import { classifyDocument, extractDocument } from "@/services/aws/textract";
import { worstStatus } from "@/services/prediction/simulatedModel";

const factorSchema = z.object({ factor: z.string().min(4, "Describe the factor"), evidence: z.string().min(8, "Summarise the evidence"), likelihood: z.enum(["Low", "Medium", "High"]) });
const conclusionSchema = z.object({
  summary: z.string().min(30, "Conclusion should be at least 30 characters"),
  rootCauseStatus: z.enum(["Confirmed by testing", "Probable — not confirmed", "Inconclusive"]),
  correctiveActions: z.string().min(10, "Describe corrective / preventive actions"),
});

const today = () => new Date().toISOString().slice(0, 10);

export default function InvestigationDetailPage() {
  const { id } = useParams();
  const { investigations, batches, lots, materials, suppliers, predictions, specFor, updateInvestigation } = useStore();
  const { user } = useAuth();
  const inv = investigations.find((i) => i.id === id);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addBatch, setAddBatch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const factorForm = useForm<z.infer<typeof factorSchema>>({ resolver: zodResolver(factorSchema), defaultValues: { factor: "", evidence: "", likelihood: "Medium" } });
  const conclusionForm = useForm<z.infer<typeof conclusionSchema>>({
    resolver: zodResolver(conclusionSchema),
    values: inv?.conclusion ? { summary: inv.conclusion.summary, rootCauseStatus: inv.conclusion.rootCauseStatus, correctiveActions: inv.conclusion.correctiveActions } : { summary: "", rootCauseStatus: "Probable — not confirmed", correctiveActions: "" },
  });

  if (!inv) return <EmptyState title="Investigation not found" />;

  const affected = inv.batchIds.map((bid) => batches.find((b) => b.id === bid)!).filter(Boolean);
  const me = user?.name ?? "Quality";
  const update = (patch: Parameters<typeof updateInvestigation>[1]) => updateInvestigation(inv.id, patch);
  const closed = inv.status === "Closed";

  // Shared lots across affected batches (genealogy review)
  const lotCounts = new Map<string, number>();
  affected.forEach((b) => b.lots.forEach((u) => lotCounts.set(u.lotId, (lotCounts.get(u.lotId) ?? 0) + 1)));
  const sharedLots = [...lotCounts.entries()].sort((a, b) => b[1] - a[1]).map(([lotId, count]) => ({ lot: lots.find((l) => l.id === lotId)!, count }));

  // Reference: in-spec released batches of same family(s)
  const families = new Set(affected.map((b) => b.productFamily));
  const reference = batches.filter((b) => families.has(b.productFamily) && b.lab && b.status === "Released" && !inv.batchIds.includes(b.id));
  const condRows = [
    { label: "Mixing speed (rpm)", get: (b: (typeof batches)[number]) => b.mixing.mixingSpeedRpm, d: 0 },
    { label: "Homogeniser (rpm)", get: (b: (typeof batches)[number]) => b.mixing.homogenizerRpm, d: 0 },
    { label: "Mixing duration (min)", get: (b: (typeof batches)[number]) => b.mixing.mixingDurationMin, d: 0 },
    { label: "Emulsification temp. (°C)", get: (b: (typeof batches)[number]) => b.mixing.emulsificationTempC, d: 1 },
    { label: "Cooling rate (°C/min)", get: (b: (typeof batches)[number]) => b.mixing.coolingRateCPerMin, d: 2 },
    { label: "Processing duration (min)", get: (b: (typeof batches)[number]) => b.processingDurationMin, d: 0 },
  ];

  const addNote = () => {
    if (note.trim().length < 5) return toast.error("Note is too short");
    const n = { id: crypto.randomUUID(), author: me, date: today(), text: note.trim() };
    const c = classifyNote(n);
    update((i) => ({ notes: [...i.notes, { ...n, category: c.category }], status: i.status === "Open" ? "In progress" : i.status }));
    setNote("");
    toast.success("Note added", { description: `Suggested category: ${c.category} (simulated classification)` });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const extracted = await extractDocument(f, { batchIds: inv.batchIds });
        const att: Attachment = { id: crypto.randomUUID(), name: f.name, kind: classifyDocument(f.name), sizeKb: Math.max(1, Math.round(f.size / 1024)), uploadedAt: today(), uploadedBy: me, extracted };
        update((i) => ({ attachments: [...i.attachments, att] }));
      }
      toast.success(`${files.length} document(s) attached`, { description: "Fields extracted (simulated Textract) — verify before use." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addFactor = factorForm.handleSubmit((v) => {
    const f: SuspectedFactor = { id: crypto.randomUUID(), ...v };
    update((i) => ({ factors: [...i.factors, f] }));
    factorForm.reset({ factor: "", evidence: "", likelihood: "Medium" });
  });

  const saveConclusion = conclusionForm.handleSubmit((v) => {
    const c: InvestigationConclusion = { ...v, approvedBy: "", approvedAt: "" };
    update({ conclusion: c, status: "Pending approval" });
    toast.success("Conclusion documented — pending quality approval");
  });

  const approve = () => {
    if (!inv.conclusion) return;
    update({ conclusion: { ...inv.conclusion, approvedBy: me, approvedAt: today() }, status: "Closed" });
    toast.success("Conclusion approved and investigation closed");
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild><Link to="/app/investigations"><ArrowLeft /> Investigations</Link></Button>
      <div className="mb-6 rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{inv.id}</span>
              <InvestigationStatusBadge status={inv.status} />
              <span className={cn("text-xs font-semibold", inv.priority === "High" ? "text-red-700" : "text-amber-700")}>{inv.priority} priority</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-navy-900">{inv.title}</h1>
            <div className="mt-1 text-sm text-muted-foreground">{inv.property} · opened {formatDate(inv.createdAt)} · {affected.length} affected batches</div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</div>
              <Select value={inv.owner} onValueChange={(v) => { update({ owner: v }); toast.success(`Assigned to ${v}`); }} disabled={closed}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{TEAM.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
              <Select value={inv.status} onValueChange={(v) => update({ status: v as InvestigationStatus })} disabled={closed}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{["Open", "In progress", "Pending approval"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" asChild><Link to={`/app/assistant?inv=${inv.id}`}><Bot /> AI assistant</Link></Button>
            <Button variant="outline" asChild><Link to={`/app/reports?inv=${inv.id}`}><FileText /> Report</Link></Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="batches">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="batches">Affected batches ({affected.length})</TabsTrigger>
          <TabsTrigger value="evidence">Lab evidence ({inv.attachments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({inv.notes.length})</TabsTrigger>
          <TabsTrigger value="genealogy">Ingredient genealogy</TabsTrigger>
          <TabsTrigger value="conditions">Production conditions</TabsTrigger>
          <TabsTrigger value="factors">Suspected factors ({inv.factors.length})</TabsTrigger>
          <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card>
            <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
              <div><CardTitle>Affected batches</CardTitle><CardDescription>Measured results and simulated risk side by side</CardDescription></div>
              {!closed && (
                <div className="flex gap-2">
                  <Select value={addBatch} onValueChange={setAddBatch}>
                    <SelectTrigger className="w-60"><SelectValue placeholder="Add a batch" /></SelectTrigger>
                    <SelectContent>{[...batches].sort((a, b) => b.productionDate.localeCompare(a.productionDate)).filter((b) => !inv.batchIds.includes(b.id)).map((b) => <SelectItem key={b.id} value={b.id}>{b.id} · {b.productName}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" disabled={!addBatch} onClick={() => { update((i) => ({ batchIds: [...i.batchIds, addBatch] })); setAddBatch(""); }}><Plus /> Add</Button>
                </div>
              )}
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Batch</TableHead><TableHead>Product</TableHead><TableHead>Produced</TableHead><TableHead>Equip.</TableHead>
                  <TableHead className="text-right">Visc. (lab)</TableHead><TableHead className="text-right">ΔE (lab)</TableHead><TableHead>Predicted (sim.)</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {affected.map((b) => {
                  const s = specFor(b.productFamily);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="pl-5"><Link to={`/app/batches/${b.id}`} className="font-mono text-[13px] font-medium text-forest-700 hover:underline">{b.id}</Link></TableCell>
                      <TableCell>{b.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(b.productionDate)}</TableCell>
                      <TableCell>{b.equipmentId}</TableCell>
                      <TableCell className={cn("tabular text-right font-medium", b.lab && !inSpecViscosity(b, s) && "text-red-700")}>{b.lab?.viscosityCps.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className={cn("tabular text-right font-medium", b.lab && !inSpecAppearance(b, s) && "text-red-700")}>{b.lab?.appearanceDeltaE.toFixed(2) ?? "—"}</TableCell>
                      <TableCell><PredictionBadge status={worstStatus(predictions[b.id] ?? [])} /></TableCell>
                      <TableCell><BatchStatusBadge status={b.status} /></TableCell>
                      <TableCell>{!closed && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove batch" onClick={() => update((i) => ({ batchIds: i.batchIds.filter((x) => x !== b.id) }))}><X className="h-3.5 w-3.5" /></Button>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div><CardTitle>Laboratory results &amp; documents</CardTitle><CardDescription>Upload lab reports, CoAs or batch records. Key fields are extracted automatically (simulated Amazon Textract).</CardDescription></div>
              <div>
                <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx" onChange={(e) => onFiles(e.target.files)} />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading || closed}>{uploading ? <Loader2 className="animate-spin" /> : <FileUp />} {uploading ? "Extracting…" : "Attach documents"}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {inv.attachments.length === 0 && <EmptyState icon={<Paperclip />} title="No documents attached" description="Attach the laboratory report and the CoA for the suspected ingredient lot." />}
              {inv.attachments.map((a) => (
                <div key={a.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-500" />
                      <span className="font-medium">{a.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{a.kind}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {a.sizeKb} KB · {a.uploadedBy} · {formatDate(a.uploadedAt)}
                      {!closed && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove" onClick={() => update((i) => ({ attachments: i.attachments.filter((x) => x.id !== a.id) }))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                  {a.extracted && (
                    <div className="mt-3 rounded-md border border-dashed border-violet-300 bg-violet-50/40 p-3">
                      <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700"><Sparkles className="h-3 w-3" /> Extracted fields · simulated · verify against source</div>
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        {Object.entries(a.extracted).map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-violet-100 py-1"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
                      </dl>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader><CardTitle>Investigation notes</CardTitle><CardDescription>Categories are suggested by the assistant (simulated) and can be changed.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <ol className="relative space-y-4 border-l pl-6">
                {inv.notes.map((n) => (
                  <li key={n.id} className="relative">
                    <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-forest-500 ring-1 ring-forest-200" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-navy-900">{n.author}</span>· {formatDate(n.date)}
                      <Select value={n.category ?? "General"} onValueChange={(v) => update((i) => ({ notes: i.notes.map((x) => (x.id === n.id ? { ...x, category: v } : x)) }))} disabled={closed}>
                        <SelectTrigger className="h-6 w-auto gap-1 border-dashed px-2 text-[11px]"><Tag className="h-3 w-3" /><SelectValue /></SelectTrigger>
                        <SelectContent>{["Laboratory observation", "Raw material", "Process", "Equipment", "Lab method", "Verification test", "General"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-navy-800">{n.text}</p>
                  </li>
                ))}
              </ol>
              {!closed && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <Textarea placeholder="Add an observation, test result or decision…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="bg-white" />
                  <div className="mt-2 flex justify-end"><Button onClick={addNote}><Plus /> Add note</Button></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genealogy">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div><CardTitle>Ingredient lots used by affected batches</CardTitle><CardDescription>Lots shared by many affected batches are worth reviewing first.</CardDescription></div>
              <Button variant="outline" size="sm" asChild><Link to={`/app/genealogy?batch=${inv.batchIds[0]}`}><GitFork /> Open genealogy</Link></Button>
            </CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">Lot</TableHead><TableHead>Material</TableHead><TableHead>Supplier</TableHead><TableHead>CoA</TableHead><TableHead className="text-right">Affected batches using lot</TableHead><TableHead className="text-right">Other batches using lot</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {sharedLots.map(({ lot, count }) => {
                  const others = batches.filter((b) => !inv.batchIds.includes(b.id) && b.lots.some((u) => u.lotId === lot.id)).length;
                  return (
                    <TableRow key={lot.id}>
                      <TableCell className="pl-5"><Link to={`/app/genealogy?lot=${lot.id}`} className="font-mono text-[13px] font-medium text-forest-700 hover:underline">{lot.id}</Link></TableCell>
                      <TableCell>{materials.find((m) => m.id === lot.materialId)?.name}</TableCell>
                      <TableCell>{suppliers.find((s) => s.id === lot.supplierId)?.name}</TableCell>
                      <TableCell className="tabular">{lot.coaValue.toLocaleString()} {lot.coaUnit}</TableCell>
                      <TableCell className="tabular text-right"><span className={cn("font-semibold", count === affected.length && affected.length > 1 && "text-orange-700")}>{count} / {affected.length}</span></TableCell>
                      <TableCell className="tabular text-right">{others}</TableCell>
                      <TableCell><LotStatusBadge status={lot.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader><CardTitle>Production conditions vs. reference</CardTitle><CardDescription>Reference = mean of {reference.length} released batches in the same product family. Large differences are highlighted.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto px-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Condition</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reference</th>
                    {affected.map((b) => <th key={b.id} className="px-3 py-2 text-right font-mono text-xs">{b.id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {condRows.map((r) => {
                    const refVals = reference.map(r.get);
                    const ref = mean(refVals);
                    const sd = Math.sqrt(mean(refVals.map((v) => (v - ref) ** 2))) || 1;
                    return (
                      <tr key={r.label} className="border-b">
                        <td className="px-5 py-2 text-muted-foreground">{r.label}</td>
                        <td className="tabular px-3 py-2 text-right font-medium">{ref.toFixed(r.d)}</td>
                        {affected.map((b) => {
                          const z = (r.get(b) - ref) / sd;
                          return <td key={b.id} className={cn("tabular px-3 py-2 text-right", Math.abs(z) > 1.5 ? "bg-orange-50 font-semibold text-orange-800" : Math.abs(z) > 1 ? "bg-amber-50/60" : "")}>{r.get(b).toFixed(r.d)}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-5 pt-3 text-xs text-muted-foreground">Highlight: orange &gt; 1.5 SD from reference; amber &gt; 1 SD. Within validated ranges does not rule out contribution.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Suspected contributing factors</CardTitle><CardDescription>Team assessment — a factor is suspected until confirmed by a verification test.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {inv.factors.length === 0 && <p className="text-sm text-muted-foreground">No factors recorded yet.</p>}
              {inv.factors.map((f) => (
                <div key={f.id} className="flex gap-3 rounded-lg border p-4">
                  <span className={cn("mt-0.5 h-fit rounded px-2 py-0.5 text-[11px] font-semibold", f.likelihood === "High" ? "bg-red-100 text-red-800" : f.likelihood === "Medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700")}>{f.likelihood}</span>
                  <div className="flex-1">
                    <div className="font-medium text-navy-900">{f.factor}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.evidence}</p>
                  </div>
                  {!closed && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove factor" onClick={() => update((i) => ({ factors: i.factors.filter((x) => x.id !== f.id) }))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              ))}
            </CardContent>
          </Card>
          {!closed && (
            <Card>
              <CardHeader><CardTitle>Record a suspected factor</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addFactor} className="space-y-3" noValidate>
                  <FormField label="Factor" error={factorForm.formState.errors.factor?.message}><Input placeholder="e.g. Carbomer lot OP-CB-2609" {...factorForm.register("factor")} /></FormField>
                  <FormField label="Evidence" error={factorForm.formState.errors.evidence?.message}><Textarea rows={3} {...factorForm.register("evidence")} /></FormField>
                  <FormField label="Likelihood (team assessment)">
                    <Select value={factorForm.watch("likelihood")} onValueChange={(v) => factorForm.setValue("likelihood", v as "Low" | "Medium" | "High")}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Low", "Medium", "High"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                  </FormField>
                  <Button type="submit" className="w-full"><Plus /> Add factor</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conclusion">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div><CardTitle>Quality team conclusion</CardTitle><CardDescription>Step 06 · Document findings. Conclusions are approved by a named person.</CardDescription></div>
              <Provenance kind="decided" />
            </CardHeader>
            <CardContent>
              {inv.conclusion?.approvedBy ? (
                <div className="space-y-3 rounded-lg border-2 border-forest-200 bg-forest-50/40 p-5">
                  <div className="flex items-center gap-2 font-semibold text-forest-800"><BadgeCheck className="h-5 w-5" /> Approved by {inv.conclusion.approvedBy} on {formatDate(inv.conclusion.approvedAt)}</div>
                  <div><div className="text-xs text-muted-foreground">Root cause status</div><div className="font-medium">{inv.conclusion.rootCauseStatus}</div></div>
                  <div><div className="text-xs text-muted-foreground">Conclusion</div><p className="text-sm">{inv.conclusion.summary}</p></div>
                  <div><div className="text-xs text-muted-foreground">Corrective &amp; preventive actions</div><p className="text-sm">{inv.conclusion.correctiveActions}</p></div>
                </div>
              ) : (
                <form onSubmit={saveConclusion} className="grid max-w-3xl gap-4" noValidate>
                  <FormField label="Root cause status">
                    <Select value={conclusionForm.watch("rootCauseStatus")} onValueChange={(v) => conclusionForm.setValue("rootCauseStatus", v as InvestigationConclusion["rootCauseStatus"])}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Confirmed by testing", "Probable — not confirmed", "Inconclusive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                  </FormField>
                  <FormField label="Conclusion" error={conclusionForm.formState.errors.summary?.message}><Textarea rows={4} {...conclusionForm.register("summary")} /></FormField>
                  <FormField label="Corrective & preventive actions" error={conclusionForm.formState.errors.correctiveActions?.message}><Textarea rows={3} {...conclusionForm.register("correctiveActions")} /></FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="outline">Save conclusion draft</Button>
                    {inv.conclusion && <Button type="button" onClick={approve}><BadgeCheck /> Approve &amp; close as {me}</Button>}
                  </div>
                  {inv.conclusion && <p className="text-xs text-muted-foreground">Draft saved — awaiting approval. Approving closes the investigation.</p>}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
