import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  calculateDurationMinutes,
  calculateNetObservationMinutes,
  calculateObservedCycleTime,
  calculateSetupMinutes,
  calculateStandardCycleTime,
} from "@/lib/engineering-calculations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;
type FormState = Record<string, string>;

const initialForm = (): FormState => ({
  study_date: new Date().toISOString().slice(0, 10),
  study_type: "Produksi Normal",
  product_id: "",
  variant_id: "",
  routing_id: "",
  routing_operation_id: "",
  shift_id: "",
  observation_method: "Batch Output",
  setup_start_time: "",
  setup_end_time: "",
  observation_start_time: "",
  observation_end_time: "",
  idle_time_min: "0",
  observed_output: "0",
  manpower: "1",
  performance_rating_pct: "100",
  allowance_pct: "15",
  observation_condition: "Normal",
  notes: "",
});

const relation = (value: unknown) => (value ?? null) as Row | null;
const number = (value: unknown) => Number(value ?? 0) || 0;

export function TimeStudyFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);

  const referenceQuery = useQuery({
    queryKey: ["time-study-reference"],
    enabled: open,
    queryFn: async () => {
      const [products, routings, shifts] = await Promise.all([
        supabase.from("products").select("id,code,name,product_variants(id,name)").order("name"),
        supabase.from("routings").select("id,code,name,product_id,variant_id,version,status,routing_operations(id,seq,operation_name,machine_id,machines:machine_id(code,name))").in("status", ["Draft", "Review", "Active"]).order("code"),
        supabase.from("shifts").select("id,name").order("code"),
      ]);
      const error = products.error ?? routings.error ?? shifts.error;
      if (error) throw new Error(error.message);
      return { products: (products.data ?? []) as Row[], routings: (routings.data ?? []) as Row[], shifts: (shifts.data ?? []) as Row[] };
    },
  });

  const products = referenceQuery.data?.products ?? [];
  const routings = referenceQuery.data?.routings ?? [];
  const shifts = referenceQuery.data?.shifts ?? [];
  const selectedProduct = products.find((row) => String(row.id) === form.product_id);
  const variants = (selectedProduct?.product_variants ?? []) as Row[];
  const matchingRoutings = routings.filter((row) =>
    String(row.product_id ?? "") === form.product_id && (!form.variant_id || String(row.variant_id ?? "") === form.variant_id),
  );
  const selectedRouting = routings.find((row) => String(row.id) === form.routing_id);
  const operations = useMemo(
    () => ([...((selectedRouting?.routing_operations ?? []) as Row[])]).sort((a, b) => number(a.seq) - number(b.seq)),
    [selectedRouting],
  );
  const selectedOperation = operations.find((row) => String(row.id) === form.routing_operation_id);

  const observedMinutes = calculateDurationMinutes(form.observation_start_time, form.observation_end_time);
  const setupMinutes = calculateSetupMinutes(form.setup_start_time, form.setup_end_time);
  const calculationInput = {
    observedOutput: number(form.observed_output),
    observedMinutes,
    idleMinutes: number(form.idle_time_min),
    performanceRatingPct: number(form.performance_rating_pct),
    allowancePct: number(form.allowance_pct),
  };
  const observedCycle = calculateObservedCycleTime(calculationInput);
  const normalTime = observedCycle * (number(form.performance_rating_pct) / 100);
  const standardCycle = calculateStandardCycleTime(calculationInput);

  useEffect(() => {
    if (!open) setForm(initialForm());
  }, [open]);

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!profile?.id) throw new Error("Profil pengguna tidak ditemukan.");
      if (!form.routing_operation_id) throw new Error("Operasi routing wajib dipilih.");
      if (number(form.observed_output) <= 0 || observedMinutes <= 0) throw new Error("Output dan waktu pengamatan harus lebih dari 0.");
      if (number(form.idle_time_min) >= observedMinutes) throw new Error("Idle time harus lebih kecil dari durasi pengamatan.");

      const machine = relation(selectedOperation?.machines);
      const payload = {
        study_date: form.study_date,
        product_id: form.product_id,
        variant_id: form.variant_id || null,
        routing_id: form.routing_id,
        routing_operation_id: form.routing_operation_id,
        process_name: String(selectedOperation?.operation_name ?? ""),
        machine_id: selectedOperation?.machine_id || machine?.id || null,
        observer_id: profile.id,
        shift_id: form.shift_id || null,
        study_type: form.study_type,
        observation_method: form.observation_method,
        setup_start_time: form.setup_start_time || null,
        setup_end_time: form.setup_end_time || null,
        observation_start_time: form.observation_start_time || null,
        observation_end_time: form.observation_end_time || null,
        observed_output: number(form.observed_output),
        observed_minutes: observedMinutes,
        setup_time_min: setupMinutes,
        idle_time_min: number(form.idle_time_min),
        manpower: number(form.manpower),
        performance_rating_pct: number(form.performance_rating_pct),
        allowance_pct: number(form.allowance_pct),
        actual_cycle_time_sec: observedCycle,
        normal_time_sec: normalTime,
        standard_cycle_time_sec: standardCycle,
        observation_condition: form.observation_condition,
        notes: form.notes || null,
        status: submit ? "Submitted" : "Draft",
        submitted_at: submit ? new Date().toISOString() : null,
        created_by: profile.id,
      };
      const { error } = await supabase.from("time_studies").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, submit) => {
      toast.success(submit ? "Time Study dikirim ke Production Control" : "Draft Time Study disimpan");
      void queryClient.invalidateQueries({ queryKey: ["time_studies"] });
      void queryClient.invalidateQueries({ queryKey: ["routings"] });
      void queryClient.invalidateQueries({ queryKey: ["capacity_plans"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const noRouting = Boolean(form.product_id) && !referenceQuery.isLoading && matchingRoutings.length === 0;

  const field = (name: string, value: string) => setForm((current) => ({ ...current, [name]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Tambah Time Study</DialogTitle><DialogDescription>Ukur satu operasi dari routing produk dalam kondisi produksi yang dapat dipertanggungjawabkan.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal Pengamatan"><Input type="date" value={form.study_date} onChange={(e) => field("study_date", e.target.value)} /></Field>
          <Field label="Observer"><Input readOnly value={`${profile?.full_name ?? "-"} · ${role ?? "-"}`} /></Field>
          <SelectField label="Jenis Pengamatan" value={form.study_type} onChange={(v) => field("study_type", v)} options={["Trial Produk Baru", "Produksi Normal", "Perbaikan Standard", "Perubahan Mesin", "Perubahan Metode"]} />
          <SelectField label="Produk" value={form.product_id} onChange={(v) => setForm((c) => ({ ...c, product_id: v, variant_id: "", routing_id: "", routing_operation_id: "" }))} rows={products} />
          <SelectField label="Varian" value={form.variant_id || "__none"} onChange={(v) => setForm((c) => ({ ...c, variant_id: v === "__none" ? "" : v, routing_id: "", routing_operation_id: "" }))} rows={variants} optional />
          <SelectField label="Routing" value={form.routing_id} onChange={(v) => setForm((c) => ({ ...c, routing_id: v, routing_operation_id: "" }))} rows={matchingRoutings} labelKeys={["code", "name"]} />
          <SelectField label="Operasi Routing" value={form.routing_operation_id} onChange={(v) => field("routing_operation_id", v)} rows={operations} labelKeys={["seq", "operation_name"]} />
          <SelectField label="Shift" value={form.shift_id} onChange={(v) => field("shift_id", v)} rows={shifts} />
          <SelectField label="Metode Pengamatan" value={form.observation_method} onChange={(v) => field("observation_method", v)} options={["Batch Output", "Per Siklus"]} />
          <Field label="Mesin"><Input readOnly value={relation(selectedOperation?.machines)?.name ? `${String(relation(selectedOperation?.machines)?.code)} — ${String(relation(selectedOperation?.machines)?.name)}` : "Mengikuti operasi routing"} /></Field>
          <Field label="Setup Dimulai"><Input type="time" value={form.setup_start_time} onChange={(e) => field("setup_start_time", e.target.value)} /></Field>
          <Field label="Setup Selesai"><Input type="time" value={form.setup_end_time} onChange={(e) => field("setup_end_time", e.target.value)} /></Field>
          <Field label="Pengamatan Mulai"><Input type="time" value={form.observation_start_time} onChange={(e) => field("observation_start_time", e.target.value)} /></Field>
          <Field label="Pengamatan Selesai"><Input type="time" value={form.observation_end_time} onChange={(e) => field("observation_end_time", e.target.value)} /></Field>
          <Field label="Output Diamati"><Input type="number" min="0" value={form.observed_output} onChange={(e) => field("observed_output", e.target.value)} /></Field>
          <Field label="Idle Time (menit)"><Input type="number" min="0" value={form.idle_time_min} onChange={(e) => field("idle_time_min", e.target.value)} /></Field>
          <Field label="Operator Diamati"><Input type="number" min="1" value={form.manpower} onChange={(e) => field("manpower", e.target.value)} /></Field>
          <Field label="Performance Rating (%)"><Input type="number" min="1" value={form.performance_rating_pct} onChange={(e) => field("performance_rating_pct", e.target.value)} /></Field>
          <Field label="Allowance (%)"><Input type="number" min="0" value={form.allowance_pct} onChange={(e) => field("allowance_pct", e.target.value)} /></Field>
          <SelectField label="Kondisi Pengamatan" value={form.observation_condition} onChange={(v) => field("observation_condition", v)} options={["Normal", "Material Terlambat", "Gangguan Mesin", "Operator Belum Terlatih", "Trial Parameter", "Kondisi Tidak Stabil"]} />
          <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2"><div className="grid gap-3 text-sm sm:grid-cols-5"><Metric label="Setup" value={`${setupMinutes.toFixed(1)} mnt`} /><Metric label="Durasi" value={`${observedMinutes.toFixed(1)} mnt`} /><Metric label="Waktu Bersih" value={`${calculateNetObservationMinutes(observedMinutes, number(form.idle_time_min)).toFixed(1)} mnt`} /><Metric label="Observed CT" value={`${observedCycle.toFixed(2)} dtk`} /><Metric label="Standard CT" value={`${standardCycle.toFixed(2)} dtk`} /></div></div>
          <Field label="Catatan" full><Textarea value={form.notes} onChange={(e) => field("notes", e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(false)}>Simpan Draft</Button><Button disabled={save.isPending || form.observation_condition !== "Normal"} onClick={() => save.mutate(true)}>Kirim untuk Validasi</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) { return <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>; }
function SelectField({ label, value, onChange, rows, options, labelKeys = ["name"], optional = false }: { label: string; value: string; onChange: (value: string) => void; rows?: Row[]; options?: string[]; labelKeys?: string[]; optional?: boolean }) {
  return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={`Pilih ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{optional && <SelectItem value="__none">Tanpa varian</SelectItem>}{options?.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}{rows?.map((row) => <SelectItem key={String(row.id)} value={String(row.id)}>{labelKeys.map((key) => String(row[key] ?? "")).filter(Boolean).join(" — ")}</SelectItem>)}</SelectContent></Select></Field>;
}
