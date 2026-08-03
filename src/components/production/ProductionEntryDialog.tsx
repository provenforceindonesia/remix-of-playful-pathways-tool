import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateInput } from "@/components/common/DateInput";
import { formatNumber, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type WorkOrderRow = Record<string, unknown>;

export type ProductionEntryValues = Record<string, unknown>;

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const emptyForm = (): Record<string, string> => ({
  work_order_id: "",
  shift_id: "",
  production_date: toISODate(new Date()),
  start_time: "07:00",
  end_time: "15:00",
  break_minutes: "60",
  daily_target_qty: "",
  good_output: "0",
  reject_qty: "0",
  rework_qty: "0",
  waste_material: "0",
  downtime_minutes: "0",
  downtime_frequency: "0",
  reason_code: "",
  notes: "",
  handover_note: "",
});

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return 0;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ProductionEntryDialog({
  open,
  onOpenChange,
  workOrders,
  shifts,
  validatedGoodByWo,
  initialValues,
  editing,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: WorkOrderRow[];
  shifts: WorkOrderRow[];
  validatedGoodByWo: Record<string, number>;
  initialValues?: Record<string, unknown> | null;
  editing?: boolean;
  saving?: boolean;
  onSubmit: (payload: ProductionEntryValues) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [confirmOver, setConfirmOver] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = emptyForm();
    if (initialValues) {
      for (const key of Object.keys(base)) {
        const v = initialValues[key];
        if (v !== null && v !== undefined && v !== "") base[key] = String(v).slice(0, key.endsWith("_time") ? 5 : undefined);
      }
    }
    setValues(base);
    setError(null);
  }, [open, initialValues]);

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const wo = useMemo(
    () => workOrders.find((w) => String(w.id) === values.work_order_id) ?? null,
    [workOrders, values.work_order_id],
  );

  const uom = (wo?.units_of_measure as { code?: string } | null)?.code ?? "pcs";
  const productName = (wo?.products as { name?: string } | null)?.name ?? "-";
  const variantName = (wo?.product_variants as { name?: string } | null)?.name ?? "Standard";
  const woTarget = num(wo?.target_qty);
  const validatedGood = wo ? num(validatedGoodByWo[String(wo.id)]) : 0;
  const remainingWo = Math.max(woTarget - validatedGood, 0);

  const dailyTarget = num(values.daily_target_qty);
  const good = num(values.good_output);
  const reject = num(values.reject_qty);
  const rework = num(values.rework_qty);
  const totalOutput = good + reject + rework;
  const breakMinutes = num(values.break_minutes);
  const downtime = num(values.downtime_minutes);

  const shiftMinutes = minutesBetween(values.start_time, values.end_time);
  const availableMinutes = Math.max(shiftMinutes - breakMinutes, 0);
  const netMinutes = Math.max(availableMinutes - downtime, 0);

  const achievement = dailyTarget > 0 ? (good / dailyTarget) * 100 : 0;
  const shortage = Math.max(dailyTarget - good, 0);
  const surplus = Math.max(good - dailyTarget, 0);
  const targetCycle = dailyTarget > 0 ? (availableMinutes * 60) / dailyTarget : null;
  const actualCycle = totalOutput > 0 ? (netMinutes * 60) / totalOutput : null;
  const cycleVariance =
    targetCycle !== null && actualCycle !== null ? actualCycle - targetCycle : null;
  const cycleOnTarget = cycleVariance !== null && cycleVariance <= 0;

  const workOrderOptions = workOrders.map((w) => ({
    value: String(w.id ?? ""),
    label: `${String(w.wo_number ?? "WO")} — ${(w.products as { name?: string } | null)?.name ?? "-"}`,
  }));

  const buildPayload = (): ProductionEntryValues => ({
    work_order_id: values.work_order_id,
    shift_id: values.shift_id,
    production_date: values.production_date,
    start_time: values.start_time,
    end_time: values.end_time,
    break_minutes: breakMinutes,
    daily_target_qty: dailyTarget,
    total_output: totalOutput,
    good_output: good,
    reject_qty: reject,
    rework_qty: rework,
    waste_material: num(values.waste_material),
    downtime_minutes: downtime,
    downtime_frequency: num(values.downtime_frequency),
    reason_code: values.reason_code.trim() || null,
    notes: values.notes.trim() || null,
    handover_note: values.handover_note.trim() || null,
    available_production_minutes: availableMinutes,
    net_production_minutes: netMinutes,
    target_achievement_pct: dailyTarget > 0 ? Number(achievement.toFixed(2)) : 0,
    target_cycle_time_seconds: targetCycle !== null ? Number(targetCycle.toFixed(2)) : null,
    actual_cycle_time_seconds: actualCycle !== null ? Number(actualCycle.toFixed(2)) : null,
    cycle_time_variance_seconds:
      cycleVariance !== null ? Number(cycleVariance.toFixed(2)) : null,
  });

  const validate = (): string | null => {
    if (!values.work_order_id) return "Work Order wajib dipilih.";
    if (!workOrders.some((w) => String(w.id) === values.work_order_id))
      return "Work Order yang dipilih tidak valid.";
    if (!values.shift_id) return "Shift wajib dipilih.";
    if (!values.production_date) return "Tanggal produksi wajib diisi.";
    if (!values.start_time || !values.end_time) return "Jam mulai dan jam selesai wajib diisi.";
    if (dailyTarget <= 0) return "Target Produksi Hari Ini harus lebih besar dari 0.";
    if (breakMinutes < 0 || downtime < 0) return "Istirahat dan downtime tidak boleh negatif.";
    if (breakMinutes + downtime > shiftMinutes)
      return "Istirahat + downtime tidak boleh melebihi durasi shift.";
    if (good < 0 || reject < 0 || rework < 0 || num(values.waste_material) < 0)
      return "Semua quantity tidak boleh negatif.";
    if (totalOutput <= 0) return "Total Output harus lebih dari 0.";
    if (downtime === 0 && num(values.downtime_frequency) !== 0)
      return "Frekuensi Downtime harus 0 jika Total Downtime 0.";
    if (downtime > 0 && !values.reason_code.trim())
      return "Reason Code Utama wajib diisi jika terjadi downtime.";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    setError(err);
    if (err) return;
    if (dailyTarget > remainingWo && remainingWo >= 0) {
      setConfirmOver(dailyTarget - remainingWo);
      return;
    }
    onSubmit(buildPayload());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[920px]">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>
              {editing ? "Ubah Input Produksi Harian" : "Tambah Input Produksi Harian"}
            </DialogTitle>
            <DialogDescription>
              Catat target dan hasil produksi untuk shift ini. Data divalidasi Production Control.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* 1. WORK ORDER */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Work Order
              </h3>
              <div className="space-y-2">
                <Label htmlFor="work_order_id">
                  Work Order <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={values.work_order_id}
                  onValueChange={(v) => set("work_order_id", v)}
                >
                  <SelectTrigger id="work_order_id" className="w-full">
                    <SelectValue placeholder="Pilih Work Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrderOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {wo && (
                <div className="rounded-xl border border-border/60 bg-surface/60 p-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Informasi Work Order
                  </p>
                  <div className="grid gap-x-8 sm:grid-cols-2">
                    <InfoRow label="Nomor Work Order" value={String(wo.wo_number ?? "-")} />
                    <InfoRow label="Produk" value={productName} />
                    <InfoRow label="Varian" value={variantName} />
                    <InfoRow
                      label="Target Work Order"
                      value={`${formatNumber(woTarget)} ${uom}`}
                    />
                    <InfoRow
                      label="Good Output Tervalidasi"
                      value={`${formatNumber(validatedGood)} ${uom}`}
                    />
                    <InfoRow
                      label="Sisa Target Work Order"
                      value={`${formatNumber(remainingWo)} ${uom}`}
                    />
                    <InfoRow label="UoM" value={uom} />
                  </div>
                </div>
              )}
            </section>

            {/* 2. TARGET HARI INI */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Target Produksi Hari Ini
              </h3>
              <Label htmlFor="daily_target_qty">
                Target Produksi Hari Ini <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="daily_target_qty"
                  type="number"
                  step="any"
                  min="0"
                  className="max-w-[220px]"
                  value={values.daily_target_qty}
                  onChange={(e) => set("daily_target_qty", e.target.value)}
                />
                <span className="rounded-[0.5rem] border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {uom}
                </span>
              </div>
            </section>

            {/* 3. WAKTU PRODUKSI */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Informasi Waktu Produksi
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shift_id">
                    Shift <span className="text-destructive">*</span>
                  </Label>
                  <Select value={values.shift_id} onValueChange={(v) => set("shift_id", v)}>
                    <SelectTrigger id="shift_id" className="w-full">
                      <SelectValue placeholder="Pilih shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          {String(s.name ?? "-")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="production_date">
                    Tanggal Produksi <span className="text-destructive">*</span>
                  </Label>
                  <DateInput
                    id="production_date"
                    type="date"
                    value={values.production_date}
                    onChange={(e) => set("production_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">
                    Jam Mulai <span className="text-destructive">*</span>
                  </Label>
                  <DateInput
                    id="start_time"
                    type="time"
                    value={values.start_time}
                    onChange={(e) => set("start_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">
                    Jam Selesai <span className="text-destructive">*</span>
                  </Label>
                  <DateInput
                    id="end_time"
                    type="time"
                    value={values.end_time}
                    onChange={(e) => set("end_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break_minutes">Istirahat (menit)</Label>
                  <Input
                    id="break_minutes"
                    type="number"
                    step="any"
                    value={values.break_minutes}
                    onChange={(e) => set("break_minutes", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downtime_minutes">Total Downtime (menit)</Label>
                  <Input
                    id="downtime_minutes"
                    type="number"
                    step="any"
                    value={values.downtime_minutes}
                    onChange={(e) => set("downtime_minutes", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-x-8 rounded-xl border border-border/60 bg-surface/60 p-4 sm:grid-cols-2">
                <InfoRow
                  label="Waktu Produksi Tersedia"
                  value={`${formatNumber(availableMinutes)} menit`}
                />
                <InfoRow
                  label="Waktu Produksi Bersih"
                  value={`${formatNumber(netMinutes)} menit`}
                />
              </div>
            </section>

            {/* 4. HASIL PRODUKSI */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Hasil Produksi
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total_output">Total Output</Label>
                  <Input
                    id="total_output"
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                    value={formatNumber(totalOutput)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="good_output">
                    Good Output <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="good_output"
                    type="number"
                    step="any"
                    value={values.good_output}
                    onChange={(e) => set("good_output", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reject_qty">Reject</Label>
                  <Input
                    id="reject_qty"
                    type="number"
                    step="any"
                    value={values.reject_qty}
                    onChange={(e) => set("reject_qty", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rework_qty">Rework</Label>
                  <Input
                    id="rework_qty"
                    type="number"
                    step="any"
                    value={values.rework_qty}
                    onChange={(e) => set("rework_qty", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waste_material">Waste Material</Label>
                  <Input
                    id="waste_material"
                    type="number"
                    step="any"
                    value={values.waste_material}
                    onChange={(e) => set("waste_material", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downtime_frequency">Frekuensi Downtime</Label>
                  <Input
                    id="downtime_frequency"
                    type="number"
                    step="1"
                    value={values.downtime_frequency}
                    onChange={(e) => set("downtime_frequency", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="reason_code">Reason Code Utama</Label>
                  <Input
                    id="reason_code"
                    placeholder="Isi jika terjadi downtime"
                    value={values.reason_code}
                    onChange={(e) => set("reason_code", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    value={values.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="handover_note">Catatan Handover</Label>
                  <Textarea
                    id="handover_note"
                    value={values.handover_note}
                    onChange={(e) => set("handover_note", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* 5. RINGKASAN */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Ringkasan Pencapaian
              </h3>
              <div className="grid gap-x-8 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2">
                <InfoRow
                  label="Target Produksi Hari Ini"
                  value={`${formatNumber(dailyTarget)} ${uom}`}
                />
                <InfoRow label="Good Output" value={`${formatNumber(good)} ${uom}`} />
                <InfoRow
                  label={surplus > 0 ? "Kelebihan Target" : "Kekurangan Target"}
                  value={`${formatNumber(surplus > 0 ? surplus : shortage)} ${uom}`}
                />
                <InfoRow
                  label="Target Achievement"
                  value={`${formatNumber(achievement, 2)}%`}
                />
                <InfoRow
                  label="Waktu Produksi Tersedia"
                  value={`${formatNumber(availableMinutes)} menit`}
                />
                <InfoRow
                  label="Waktu Produksi Bersih"
                  value={`${formatNumber(netMinutes)} menit`}
                />
                <InfoRow
                  label="Target Cycle Time"
                  value={targetCycle === null ? "—" : `${formatNumber(targetCycle, 2)} detik/${uom}`}
                />
                <InfoRow
                  label="Actual Cycle Time"
                  value={actualCycle === null ? "—" : `${formatNumber(actualCycle, 2)} detik/${uom}`}
                />
                <InfoRow
                  label="Selisih Cycle Time"
                  value={
                    cycleVariance === null
                      ? "—"
                      : `${cycleVariance > 0 ? "+" : ""}${formatNumber(cycleVariance, 2)} detik/${uom}`
                  }
                />
                <InfoRow
                  label="Status Cycle Time"
                  value={cycleVariance === null ? "—" : cycleOnTarget ? "Sesuai Target" : "Lebih Lambat"}
                />
              </div>
              {cycleVariance !== null && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-[0.5rem] border px-3 py-2 text-sm",
                    cycleOnTarget
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning",
                  )}
                >
                  {cycleOnTarget ? (
                    <>
                      <CheckCircle2 className="size-4" /> Sesuai Target
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-4" /> Actual Cycle Time lebih lambat{" "}
                      {formatNumber(cycleVariance, 2)} detik/{uom}
                    </>
                  )}
                </div>
              )}
            </section>

            {error && (
              <p className="rounded-[0.5rem] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOver !== null} onOpenChange={(o) => !o && setConfirmOver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Target melebihi sisa Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Target produksi hari ini melebihi sisa target Work Order sebanyak{" "}
              {formatNumber(confirmOver ?? 0)} {uom}. Apakah Anda ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOver(null);
                onSubmit(buildPayload());
              }}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
