import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, StatCard } from "@/components/shared/PageHeader";
import { InvestigationStatusBadge } from "@/components/shared/StatusBadge";
import { TEAM } from "@/data/seed";
import type { Investigation } from "@/data/types";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(8, "Give the investigation a descriptive title"),
  property: z.enum(["Viscosity", "Appearance", "Viscosity & appearance"]),
  priority: z.enum(["Low", "Medium", "High"]),
  owner: z.string().min(1, "Assign an owner"),
  batchIds: z.array(z.string()).min(1, "Select at least one affected batch"),
});
type Values = z.infer<typeof schema>;

export default function InvestigationsPage() {
  const { investigations, batches, addInvestigation, updateBatch } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("active");

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", property: "Viscosity", priority: "Medium", owner: TEAM[0].name, batchIds: [] } });
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;

  useEffect(() => {
    const pre = params.get("new");
    if (pre) {
      const b = batches.find((x) => x.id === pre);
      reset({ title: b ? `Variation in ${b.productName} batch ${b.id}` : "", property: "Viscosity", priority: "Medium", owner: TEAM[0].name, batchIds: [pre] });
      setOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, batches, reset, setParams]);

  const nextId = `INV-2026-${String(Math.max(...investigations.map((i) => Number(i.id.split("-")[2]))) + 1).padStart(3, "0")}`;

  const onSubmit = (v: Values) => {
    const inv: Investigation = { id: nextId, ...v, status: "Open", createdAt: new Date().toISOString().slice(0, 10), attachments: [], notes: [], factors: [] };
    addInvestigation(inv);
    v.batchIds.forEach((id) => {
      const b = batches.find((x) => x.id === id);
      if (b && b.status !== "On hold") updateBatch(id, { status: "Under investigation" });
    });
    toast.success(`${inv.id} opened`);
    setOpen(false);
    navigate(`/app/investigations/${inv.id}`);
  };

  const list = investigations.filter((i) => (filter === "active" ? i.status !== "Closed" : filter === "all" ? true : i.status === filter));
  const selectedBatches = watch("batchIds");
  const candidates = [...batches].sort((a, b) => b.productionDate.localeCompare(a.productionDate)).slice(0, 40);

  return (
    <div>
      <PageHeader
        eyebrow="Step 05 · Investigate evidence"
        title="Quality investigations"
        description="Structured workspaces for investigating inconsistent batches — affected batches, lab evidence, notes, suspected factors and conclusions."
        actions={<Button onClick={() => { reset({ title: "", property: "Viscosity", priority: "Medium", owner: TEAM[0].name, batchIds: [] }); setOpen(true); }}><Plus /> Open investigation</Button>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Open" value={investigations.filter((i) => i.status === "Open").length} />
        <StatCard label="In progress" value={investigations.filter((i) => i.status === "In progress").length} tone="warn" />
        <StatCard label="Pending approval" value={investigations.filter((i) => i.status === "Pending approval").length} tone="warn" />
        <StatCard label="Closed" value={investigations.filter((i) => i.status === "Closed").length} tone="good" />
      </div>
      <Card>
        <div className="flex items-center justify-between border-b p-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem><SelectItem value="all">All</SelectItem>
              {["Open", "In progress", "Pending approval", "Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{list.length} investigations</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">ID</TableHead><TableHead>Title</TableHead><TableHead>Property</TableHead><TableHead>Priority</TableHead>
              <TableHead className="text-right">Batches</TableHead><TableHead>Owner</TableHead><TableHead>Opened</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((i) => (
              <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/app/investigations/${i.id}`)}>
                <TableCell className="pl-5 font-mono text-[13px] font-medium text-forest-700">{i.id}</TableCell>
                <TableCell className="max-w-[340px] truncate font-medium">{i.title}</TableCell>
                <TableCell>{i.property}</TableCell>
                <TableCell><span className={i.priority === "High" ? "font-semibold text-red-700" : i.priority === "Medium" ? "text-amber-700" : "text-muted-foreground"}>{i.priority}</span></TableCell>
                <TableCell className="tabular text-right">{i.batchIds.length}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{TEAM.find((t) => t.name === i.owner)?.initials ?? "?"}</AvatarFallback></Avatar>{i.owner}</div></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(i.createdAt)}</TableCell>
                <TableCell><InvestigationStatusBadge status={i.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanSearch className="h-5 w-5 text-forest-600" /> Open investigation <span className="font-mono text-sm text-muted-foreground">{nextId}</span></DialogTitle>
            <DialogDescription>Select affected batches and assign an owner. You can add evidence after opening.</DialogDescription>
          </DialogHeader>
          <form id="inv-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3" noValidate>
            <FormField label="Title" className="sm:col-span-3" error={errors.title?.message}><Input {...register("title")} /></FormField>
            <FormField label="Property">
              <Select value={watch("property")} onValueChange={(v) => setValue("property", v as Values["property"])}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Viscosity", "Appearance", "Viscosity & appearance"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </FormField>
            <FormField label="Priority">
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as Values["priority"])}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low", "Medium", "High"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            </FormField>
            <FormField label="Owner" error={errors.owner?.message}>
              <Select value={watch("owner")} onValueChange={(v) => setValue("owner", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEAM.map((t) => <SelectItem key={t.name} value={t.name}>{t.name} — {t.role}</SelectItem>)}</SelectContent></Select>
            </FormField>
            <div className="sm:col-span-3">
              <div className="mb-1.5 text-sm font-medium">Affected batches <span className="font-normal text-muted-foreground">({selectedBatches.length} selected)</span></div>
              <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                {candidates.map((b) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={selectedBatches.includes(b.id)} onCheckedChange={(c) => setValue("batchIds", c ? [...selectedBatches, b.id] : selectedBatches.filter((x) => x !== b.id), { shouldValidate: true })} />
                    <span className="font-mono text-xs font-medium">{b.id}</span>
                    <span className="truncate text-xs text-muted-foreground">{b.productName}</span>
                  </label>
                ))}
              </div>
              {errors.batchIds && <p className="mt-1 text-xs text-destructive">{errors.batchIds.message}</p>}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="inv-form">Open investigation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="mt-4 text-xs text-muted-foreground">Tip: open an investigation directly from a <Link to="/app/batches" className="underline">batch profile</Link>.</p>
    </div>
  );
}
