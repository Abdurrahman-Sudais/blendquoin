import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { Provenance } from "@/components/shared/Provenance";
import { FACILITIES, PRODUCTS, PRODUCT_FAMILIES } from "@/data/seed";
import type { Batch } from "@/data/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const num = (label: string, min: number, max: number) =>
  z.coerce.number({ invalid_type_error: `${label} is required` }).min(min, `${label} must be ≥ ${min}`).max(max, `${label} must be ≤ ${max}`);

const schema = z
  .object({
    productFamily: z.string().min(1, "Select a product family"),
    productName: z.string().min(1, "Select a product"),
    productionDate: z.string().min(1, "Production date is required"),
    facility: z.string().min(1, "Select a facility"),
    equipmentId: z.string().min(1, "Select equipment"),
    sizeKg: num("Batch size", 10, 5000),
    lots: z.array(z.object({ lotId: z.string().min(1, "Select a lot"), quantityKg: num("Quantity", 0.01, 2000) })).min(1, "Connect at least one ingredient lot"),
    mixingSpeedRpm: num("Mixing speed", 500, 6000),
    homogenizerRpm: num("Homogeniser speed", 0, 10000),
    mixingDurationMin: num("Mixing duration", 1, 600),
    emulsificationTempC: num("Temperature", 20, 95),
    coolingRateCPerMin: num("Cooling rate", 0.1, 5),
    processingDurationMin: num("Processing duration", 1, 1440),
    recordLab: z.boolean(),
    viscosityCps: z.coerce.number().optional(),
    appearanceDeltaE: z.coerce.number().optional(),
    pH: z.coerce.number().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.recordLab) {
      if (!d.viscosityCps || d.viscosityCps < 100) ctx.addIssue({ code: "custom", path: ["viscosityCps"], message: "Enter measured viscosity" });
      if (d.appearanceDeltaE === undefined || isNaN(d.appearanceDeltaE) || d.appearanceDeltaE < 0) ctx.addIssue({ code: "custom", path: ["appearanceDeltaE"], message: "Enter measured ΔE" });
    }
    if (new Set(d.lots.map((l) => l.lotId)).size !== d.lots.length) ctx.addIssue({ code: "custom", path: ["lots"], message: "Each lot can only be added once" });
  });
type Values = z.infer<typeof schema>;

export default function NewBatchPage() {
  const { batches, lots, materials, suppliers, equipment, addBatch } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      productFamily: "Face Creams",
      productName: "",
      productionDate: new Date().toISOString().slice(0, 10),
      facility: FACILITIES[0],
      equipmentId: "MX-01",
      sizeKg: 450,
      lots: [{ lotId: "LP-CB-2610", quantityKg: 2.25 }, { lotId: "AN-SH-2610", quantityKg: 13.5 }],
      mixingSpeedRpm: 2800,
      homogenizerRpm: 3600,
      mixingDurationMin: 45,
      emulsificationTempC: 75,
      coolingRateCPerMin: 1.3,
      processingDurationMin: 140,
      recordLab: false,
    },
  });
  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lots" });
  const family = watch("productFamily");
  const facility = watch("facility");
  const recordLab = watch("recordLab");

  const nextId = useMemo(() => {
    const prefix = family === "Body Lotions" ? "BL" : "FC";
    const max = Math.max(...batches.map((b) => Number(b.id.split("-")[1]) || 0));
    return `${prefix}26-${String(max + 1).padStart(4, "0")}`;
  }, [batches, family]);

  const lotLabel = (id: string) => {
    const l = lots.find((x) => x.id === id)!;
    return `${l.id} · ${materials.find((m) => m.id === l.materialId)?.name} · ${suppliers.find((s) => s.id === l.supplierId)?.name}`;
  };

  const onSubmit = (v: Values) => {
    const batch: Batch = {
      id: nextId,
      productName: v.productName,
      productFamily: v.productFamily,
      productionDate: v.productionDate,
      facility: v.facility,
      equipmentId: v.equipmentId,
      sizeKg: v.sizeKg,
      lots: v.lots,
      mixing: {
        mixingSpeedRpm: v.mixingSpeedRpm,
        homogenizerRpm: v.homogenizerRpm,
        mixingDurationMin: v.mixingDurationMin,
        emulsificationTempC: v.emulsificationTempC,
        coolingRateCPerMin: v.coolingRateCPerMin,
      },
      processingDurationMin: v.processingDurationMin,
      lab: v.recordLab
        ? {
            viscosityCps: v.viscosityCps!,
            appearanceDeltaE: v.appearanceDeltaE!,
            appearanceGrade: v.appearanceDeltaE! > 1.6 ? "Non-conforming" : v.appearanceDeltaE! > 1.0 ? "Slight variation" : "Conforms",
            pH: v.pH || 5.6,
            specificGravity: 0.985,
            measuredAt: new Date().toISOString().slice(0, 10),
            analyst: user?.name ?? "Analyst",
            method: "Brookfield RV, spindle 6, 10 rpm, 25 °C · Spectrophotometer CIE ΔE*ab vs. ref. std.",
          }
        : null,
      status: v.recordLab ? "Quality review" : "Awaiting lab",
    };
    addBatch(batch);
    toast.success(`Batch ${batch.id} registered`, { description: "Simulated deviation risk has been estimated." });
    navigate(`/app/batches/${batch.id}`);
  };

  const sel = (name: keyof Values, value: string, options: string[], placeholder: string, onChange?: (v: string) => void) => (
    <Select value={value} onValueChange={(v) => { setValue(name, v as never, { shouldValidate: true }); onChange?.(v); }}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild><Link to="/app/batches"><ArrowLeft /> Batches</Link></Button>
      <PageHeader eyebrow="Step 01 · Register batch" title="Register production batch" description={<>New batch ID <span className="font-mono font-semibold text-navy-900">{nextId}</span> will be assigned on save.</>} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader><CardTitle>Product &amp; production</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Product family" error={errors.productFamily?.message}>{sel("productFamily", family, [...PRODUCT_FAMILIES], "Select", () => setValue("productName", ""))}</FormField>
            <FormField label="Product name" error={errors.productName?.message}>{sel("productName", watch("productName"), PRODUCTS[family] ?? [], "Select product")}</FormField>
            <FormField label="Production date" error={errors.productionDate?.message} htmlFor="pd"><Input id="pd" type="date" {...register("productionDate")} /></FormField>
            <FormField label="Manufacturing facility" error={errors.facility?.message}>{sel("facility", facility, FACILITIES, "Select", (f) => setValue("equipmentId", equipment.find((e) => e.facility === f)!.id))}</FormField>
            <FormField label="Equipment" error={errors.equipmentId?.message}>
              <Select value={watch("equipmentId")} onValueChange={(v) => setValue("equipmentId", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{equipment.filter((e) => e.facility === facility).map((e) => <SelectItem key={e.id} value={e.id}>{e.id} · {e.name}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Batch size (kg)" error={errors.sizeKg?.message} htmlFor="size"><Input id="size" type="number" {...register("sizeKg")} /></FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Ingredient lots</CardTitle>
              <CardDescription>Step 02 · Connect the supplier lots consumed by this batch</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ lotId: "", quantityKg: 1 })}><Plus /> Add lot</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f, i) => {
              const lotId = watch(`lots.${i}.lotId`);
              const lot = lots.find((l) => l.id === lotId);
              return (
                <div key={f.id} className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto]">
                  <div>
                    <Select value={lotId} onValueChange={(v) => setValue(`lots.${i}.lotId`, v, { shouldValidate: true })}>
                      <SelectTrigger><SelectValue placeholder="Select ingredient lot" /></SelectTrigger>
                      <SelectContent>{lots.map((l) => <SelectItem key={l.id} value={l.id}>{lotLabel(l.id)}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.lots?.[i]?.lotId && <p className="mt-1 text-xs text-destructive">{errors.lots[i]!.lotId!.message}</p>}
                    {lot && lot.status !== "Released" && <p className="mt-1 text-xs font-medium text-orange-700">⚠ {lot.status}: {lot.alert}</p>}
                  </div>
                  <div>
                    <Input type="number" step="0.01" placeholder="kg" {...register(`lots.${i}.quantityKg`)} />
                    {errors.lots?.[i]?.quantityKg && <p className="mt-1 text-xs text-destructive">{errors.lots[i]!.quantityKg!.message}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove lot"><Trash2 /></Button>
                </div>
              );
            })}
            {errors.lots?.message && <p className="text-xs text-destructive">{errors.lots.message}</p>}
            {errors.lots?.root?.message && <p className="text-xs text-destructive">{errors.lots.root.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mixing &amp; processing conditions</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Mixing speed (rpm)" error={errors.mixingSpeedRpm?.message}><Input type="number" {...register("mixingSpeedRpm")} /></FormField>
            <FormField label="Homogeniser speed (rpm)" error={errors.homogenizerRpm?.message}><Input type="number" {...register("homogenizerRpm")} /></FormField>
            <FormField label="Mixing duration (min)" error={errors.mixingDurationMin?.message}><Input type="number" {...register("mixingDurationMin")} /></FormField>
            <FormField label="Emulsification temperature (°C)" error={errors.emulsificationTempC?.message}><Input type="number" step="0.1" {...register("emulsificationTempC")} /></FormField>
            <FormField label="Cooling rate (°C/min)" error={errors.coolingRateCPerMin?.message}><Input type="number" step="0.01" {...register("coolingRateCPerMin")} /></FormField>
            <FormField label="Total processing duration (min)" error={errors.processingDurationMin?.message}><Input type="number" {...register("processingDurationMin")} /></FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Laboratory measurements</CardTitle>
              <CardDescription>Optional now — results can be recorded later from the batch profile.</CardDescription>
            </div>
            <Provenance kind="measured" />
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={recordLab} onCheckedChange={(c) => setValue("recordLab", c === true)} /> Record laboratory results now
            </label>
            {recordLab && (
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Viscosity (cP)" error={errors.viscosityCps?.message}><Input type="number" {...register("viscosityCps")} /></FormField>
                <FormField label="Appearance ΔE*ab" error={errors.appearanceDeltaE?.message}><Input type="number" step="0.01" {...register("appearanceDeltaE")} /></FormField>
                <FormField label="pH"><Input type="number" step="0.01" {...register("pH")} /></FormField>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild><Link to="/app/batches">Cancel</Link></Button>
          <Button type="submit" disabled={isSubmitting}>Register batch</Button>
        </div>
      </form>
    </div>
  );
}
