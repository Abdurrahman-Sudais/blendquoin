import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Bot, Check, FileUp, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimulatedNotice } from "@/components/shared/Provenance";
import type { Attachment } from "@/data/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { ASSISTANT_TASKS, runAssistant, type AssistantResponse, type AssistantTask } from "@/services/ai/assistant";
import { classifyDocument, extractDocument } from "@/services/aws/textract";
import { awsConfig } from "@/services/aws/config";

type Msg = { role: "user"; text: string } | { role: "assistant"; res: AssistantResponse } | { role: "doc"; name: string; fields: Record<string, string> };

function routeQuestion(q: string): AssistantTask {
  const t = q.toLowerCase();
  if (/(classif|categor|tag)/.test(t)) return "classify";
  if (/(lab|measure|result|viscosity|δe|colour|color)/.test(t)) return "summarizeLab";
  if (/(related|other batch|shared|same lot|which batch)/.test(t)) return "relatedBatches";
  if (/(evidence|organi[sz]e|support)/.test(t)) return "organizeEvidence";
  if (/(missing|gap|incomplete|need)/.test(t)) return "missingInfo";
  return "summary";
}

export default function AssistantPage() {
  const { investigations, batches, lots, specs, updateInvestigation } = useStore();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const invId = params.get("inv") ?? investigations.find((i) => i.status !== "Closed")?.id ?? investigations[0].id;
  const inv = investigations.find((i) => i.id === invId)!;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs([]);
  }, [invId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  const run = async (task: AssistantTask, userText?: string) => {
    setMsgs((m) => [...m, { role: "user", text: userText ?? ASSISTANT_TASKS.find((t) => t.id === task)!.label }]);
    setBusy(true);
    try {
      const res = await runAssistant(task, { investigation: inv, batches: inv.batchIds.map((id) => batches.find((b) => b.id === id)!).filter(Boolean), allBatches: batches, lots, specs });
      setMsgs((m) => [...m, { role: "assistant", res }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyClassifications = (res: AssistantResponse) => {
    if (!res.classifications) return;
    updateInvestigation(inv.id, (i) => ({ notes: i.notes.map((n) => ({ ...n, category: res.classifications!.find((c) => c.noteId === n.id)?.category ?? n.category })) }));
    toast.success("Categories applied to investigation notes");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      setMsgs((m) => [...m, { role: "user", text: `Uploaded ${f.name}` }]);
      const fields = await extractDocument(f, { batchIds: inv.batchIds });
      setMsgs((m) => [...m, { role: "doc", name: f.name, fields }]);
      const att: Attachment = { id: crypto.randomUUID(), name: f.name, kind: classifyDocument(f.name), sizeKb: Math.max(1, Math.round(f.size / 1024)), uploadedAt: new Date().toISOString().slice(0, 10), uploadedBy: user?.name ?? "User", extracted: fields };
      updateInvestigation(inv.id, (i) => ({ attachments: [...i.attachments, att] }));
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI investigation assistant"
        title="Investigation assistant"
        description="Classify notes, summarise lab observations, find related batches, organise evidence and highlight gaps. The assistant organises information — conclusions remain with your quality team."
      />
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Investigation context</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={invId} onValueChange={(v) => setParams({ inv: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{investigations.map((i) => <SelectItem key={i.id} value={i.id}>{i.id} · {i.status}</SelectItem>)}</SelectContent>
              </Select>
              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <div className="font-medium text-navy-900">{inv.title}</div>
                <div className="mt-1 text-muted-foreground">{inv.batchIds.length} batches · {inv.notes.length} notes · {inv.attachments.length} documents · {inv.factors.length} factors</div>
                <Link to={`/app/investigations/${inv.id}`} className="mt-2 inline-block font-medium text-forest-700 hover:underline">Open workspace →</Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {ASSISTANT_TASKS.map((t) => (
                <button key={t.id} disabled={busy} onClick={() => run(t.id)} className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:border-forest-300 hover:bg-forest-50 disabled:opacity-50">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-[11.5px] text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upload documents</CardTitle><CardDescription className="text-xs">Lab reports, CoAs and batch records — extracted with simulated Amazon Textract and attached to the investigation.</CardDescription></CardHeader>
            <CardContent>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={busy}><FileUp /> Choose files</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-[640px] flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></div>
              <div>
                <CardTitle className="text-sm">BlendQuoin Assistant</CardTitle>
                <CardDescription className="text-xs">{awsConfig.enabled ? `Amazon Bedrock · ${awsConfig.bedrockModelId}` : "Simulated responses · Amazon Bedrock-ready"}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <SimulatedNotice>
              <strong>Simulated assistant.</strong> Responses are generated from this investigation’s records using rules, not a language model. Always verify against source records.
            </SimulatedNotice>
            {msgs.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-violet-400" />
                Choose a task or ask a question about <span className="font-mono">{inv.id}</span>.
              </div>
            )}
            {msgs.map((m, idx) =>
              m.role === "user" ? (
                <div key={idx} className="flex justify-end gap-2">
                  <div className="max-w-[80%] rounded-lg rounded-tr-sm bg-forest-900 px-3 py-2 text-sm text-white">{m.text}</div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-800"><User className="h-3.5 w-3.5" /></div>
                </div>
              ) : m.role === "doc" ? (
                <div key={idx} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-3.5 w-3.5" /></div>
                  <div className="max-w-[85%] rounded-lg rounded-tl-sm border border-dashed border-violet-300 bg-violet-50/50 p-3 text-sm">
                    <div className="mb-2 font-medium">Extracted from {m.name} <span className="text-xs font-normal text-violet-700">(simulated Textract)</span></div>
                    <dl className="space-y-1">{Object.entries(m.fields).map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-40 shrink-0 text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
                    <div className="mt-2 text-xs text-muted-foreground">Attached to {inv.id}.</div>
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Bot className="h-3.5 w-3.5" /></div>
                  <div className="max-w-[85%] rounded-lg rounded-tl-sm border bg-white p-4 text-sm shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="font-semibold text-navy-900">{m.res.title}</div>
                      <span className="rounded border border-dashed border-violet-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">{m.res.source}</span>
                    </div>
                    <div className="space-y-3">
                      {m.res.sections.map((s) => (
                        <div key={s.heading}>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-forest-700">{s.heading}</div>
                          <ul className="mt-1 space-y-1">{s.items.map((it, i) => <li key={i} className="flex gap-2 text-navy-700"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy-300" />{it}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                    {m.res.classifications && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => applyClassifications(m.res)}><Check /> Apply categories to notes</Button>
                    )}
                  </div>
                </div>
              )
            )}
            {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Working…</div>}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!q.trim()) return;
              run(routeQuestion(q), q.trim());
              setQ("");
            }}
          >
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What information is still missing?" disabled={busy} />
            <Button type="submit" disabled={busy || !q.trim()}><Send /> Ask</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
