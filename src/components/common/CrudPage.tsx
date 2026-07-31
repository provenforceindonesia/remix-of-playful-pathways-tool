import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { productionEntriesQuery, shiftsQuery, workOrdersQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/shopfloor/input-produksi")({
  head: () => ({
    meta: [
      { title: "Input Produksi Harian — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Pencatatan output, reject, rework, dan downtime produksi per shift.",
      },
      { property: "og:title", content: "Input Produksi Harian — MANUFACTUREIQ" },
      {
        property: "og:description",
        content: "Form input hasil produksi harian operator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InputProduksiPage,
});

type Row = Record<string, unknown>;

function toNumber(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function round(value: number, decimals = 2): number {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function durationMinutes(start: unknown, end: unknown): number {
  const [startHour, startMinute] = String(start ?? "00:00")
    .split(":")
    .map(Number);
  const [endHour, endMinute] = String(end ?? "00:00")
    .split(":")
    .map(Number);

  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0;

  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function InputProduksiPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(productionEntriesQuery);
  const { data: wos, isLoading: isLoadingWos } = useQuery(workOrdersQuery);
  const { data: shifts, isLoading: isLoadingShifts } = useQuery(shiftsQuery);

  const rows = (data ?? []) as Row[];
  const workOrders = (wos ?? []) as Row[];
  const shiftRows = (shifts ?? []) as Row[];
  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");

  const validatedGoodByWo = rows.reduce<Record<string, number>>((result, entry) => {
    if (String(entry.status ?? "") !== "Tervalidasi") return result;
    const workOrderId = String(entry.work_order_id ?? "");
    result[workOrderId] = (result[workOrderId] ?? 0) + toNumber(entry.good_output);
    return result;
  }, {});

  const workOrderOptions = workOrders.map((wo) => {
    const product = wo.products as { name?: string } | null;
    return {
      value: String(wo.id ?? ""),
      label: [String(wo.wo_number ?? "WO"), product?.name].filter(Boolean).join(" — "),
    };
  });

  const shiftOptions = shiftRows.map((shift) => ({
    value: String(shift.id ?? ""),
    label: String(shift.name ?? "-"),
  }));

  const uomForWo = (workOrderId: unknown) => {
    const wo = workOrders.find((item) => String(item.id) === String(workOrderId ?? ""));
    return ((wo?.units_of_measure as { code?: string } | null)?.code ?? "unit").trim();
  };

  const columns: Column<Row>[] = [
    {
      key: "production_date",
      header: "Tanggal",
      render: (row) => formatDate(row.production_date as string),
    },
    {
      key: "wo",
      header: "Work Order",
      value: (row) => (row.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    {
      key: "shift",
      header: "Shift",
      value: (row) => (row.shifts as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "daily_target_qty",
      header: "Target Hari Ini",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.daily_target_qty))} ${uomForWo(row.work_order_id)}`,
    },
    {
      key: "total_output",
      header: "Total Output",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.total_output))} ${uomForWo(row.work_order_id)}`,
    },
    {
      key: "good_output",
      header: "Good",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.good_output))} ${uomForWo(row.work_order_id)}`,
    },
    {
      key: "target_achievement_pct",
      header: "Achievement",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.target_achievement_pct))}%`,
    },
    {
      key: "actual_cycle_time_seconds",
      header: "Actual Cycle Time",
      align: "right",
      render: (row) =>
        toNumber(row.actual_cycle_time_seconds) > 0
          ? `${formatNumber(toNumber(row.actual_cycle_time_seconds))} detik/unit`
          : "-",
    },
    {
      key: "downtime_minutes",
      header: "Downtime",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.downtime_minutes))} mnt`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={String(row.status ?? "-")} />,
    },
  ];

  const fields: CrudField[] = [
    {
      name: "work_order_id",
      label: "Work Order",
      type: "select",
      required: true,
      placeholder: isLoadingWos ? "Memuat Work Order..." : "Pilih Work Order",
      options: workOrderOptions,
    },
    {
      name: "work_order_information",
      label: "Informasi Work Order",
      type: "custom",
      full: true,
      virtual: true,
      render: ({ values }) => {
        const wo = workOrders.find((item) => String(item.id) === String(values.work_order_id ?? ""));
        if (!wo) {
          return (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Pilih Work Order untuk menampilkan target dan sisa produksi.
            </div>
          );
        }

        const product = wo.products as { name?: string } | null;
        const variant = wo.product_variants as { name?: string } | null;
        const uom = uomForWo(wo.id);
        const target = toNumber(wo.target_qty);
        const validatedGood = validatedGoodByWo[String(wo.id)] ?? 0;
        const remaining = Math.max(target - validatedGood, 0);

        return (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">Informasi Work Order</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Nomor Work Order" value={String(wo.wo_number ?? "-")} />
              <Info label="Produk" value={product?.name ?? "-"} />
              <Info label="Varian" value={variant?.name ?? "-"} />
              <Info label="Target Work Order" value={`${formatNumber(target)} ${uom}`} />
              <Info label="Good Output Tervalidasi" value={`${formatNumber(validatedGood)} ${uom}`} />
              <Info label="Sisa Target Work Order" value={`${formatNumber(remaining)} ${uom}`} />
            </div>
          </div>
        );
      },
    },
    {
      name: "daily_target_qty",
      label: "Target Produksi Hari Ini",
      type: "number",
      required: true,
      defaultValue: 0,
    },
    {
      name: "shift_id",
      label: "Shift",
      type: "select",
      required: true,
      placeholder: isLoadingShifts ? "Memuat shift..." : "Pilih shift",
      options: shiftOptions,
    },
    {
      name: "production_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      defaultValue: toISODate(new Date()),
    },
    {
      name: "start_time",
      label: "Jam Mulai",
      type: "time",
      required: true,
      defaultValue: "07:00",
    },
    {
      name: "end_time",
      label: "Jam Selesai",
      type: "time",
      required: true,
      defaultValue: "15:00",
    },
    {
      name: "break_minutes",
      label: "Istirahat (menit)",
      type: "number",
      defaultValue: 60,
    },
    {
      name: "total_output",
      label: "Total Output",
      type: "number",
      required: true,
      readOnly: true,
      defaultValue: 0,
      placeholder: "Dihitung otomatis",
    },
    {
      name: "good_output",
      label: "Good Output",
      type: "number",
      required: true,
      defaultValue: 0,
    },
    { name: "reject_qty", label: "Reject", type: "number", defaultValue: 0 },
    { name: "rework_qty", label: "Rework", type: "number", defaultValue: 0 },
    {
      name: "waste_material",
      label: "Waste Material",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "downtime_minutes",
      label: "Total Downtime (menit)",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "downtime_frequency",
      label: "Frekuensi Downtime",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "reason_code",
      label: "Reason Code Utama",
      placeholder: "Wajib diisi jika terjadi downtime",
    },
    {
      name: "achievement_summary",
      label: "Ringkasan Pencapaian",
      type: "custom",
      full: true,
      virtual: true,
      render: ({ values }) => {
        const uom = uomForWo(values.work_order_id);
        const dailyTarget = toNumber(values.daily_target_qty);
        const goodOutput = toNumber(values.good_output);
        const rejectQty = toNumber(values.reject_qty);
        const reworkQty = toNumber(values.rework_qty);
        const totalOutput = goodOutput + rejectQty + reworkQty;
        const breakMinutes = toNumber(values.break_minutes);
        const downtimeMinutes = toNumber(values.downtime_minutes);
        const availableMinutes = Math.max(durationMinutes(values.start_time, values.end_time) - breakMinutes, 0);
        const netMinutes = Math.max(availableMinutes - downtimeMinutes, 0);
        const achievement = dailyTarget > 0 ? (goodOutput / dailyTarget) * 100 : 0;
        const shortage = Math.max(dailyTarget - goodOutput, 0);
        const excess = Math.max(goodOutput - dailyTarget, 0);
        const targetCycle = dailyTarget > 0 ? (availableMinutes * 60) / dailyTarget : 0;
        const actualCycle = totalOutput > 0 ? (netMinutes * 60) / totalOutput : 0;
        const variance = targetCycle > 0 && actualCycle > 0 ? actualCycle - targetCycle : 0;

        return (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">Ringkasan Pencapaian</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Target Produksi Hari Ini" value={`${formatNumber(dailyTarget)} ${uom}`} />
              <Info label="Good Output" value={`${formatNumber(goodOutput)} ${uom}`} />
              <Info
                label={shortage > 0 ? "Kekurangan Target" : "Kelebihan Target"}
                value={`${formatNumber(shortage || excess)} ${uom}`}
              />
              <Info label="Target Achievement" value={`${formatNumber(round(achievement))}%`} />
              <Info label="Waktu Produksi Tersedia" value={`${formatNumber(availableMinutes)} menit`} />
              <Info label="Waktu Produksi Bersih" value={`${formatNumber(netMinutes)} menit`} />
              <Info
                label="Target Cycle Time"
                value={targetCycle > 0 ? `${formatNumber(round(targetCycle))} detik/unit` : "-"}
              />
              <Info
                label="Actual Cycle Time"
                value={actualCycle > 0 ? `${formatNumber(round(actualCycle))} detik/unit` : "-"}
              />
              <Info
                label="Status Cycle Time"
                value={
                  !targetCycle || !actualCycle
                    ? "-"
                    : variance <= 0
                      ? "Sesuai Target"
                      : `Lebih lambat ${formatNumber(round(variance))} detik/unit`
                }
              />
            </div>
          </div>
        );
      },
    },
    { name: "notes", label: "Catatan", type: "textarea", full: true },
    {
      name: "handover_note",
      label: "Catatan Handover",
      type: "textarea",
      full: true,
    },
  ];

  return (
    <CrudPage<Row>
      title="Input Produksi Harian"
      description="Catat hasil produksi setiap shift. Data akan divalidasi Production Control."
      table="production_entries"
      invalidateKeys={[["production_entries"], ["v_production_kpi"], ["work_orders"], ["sales_orders"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="input-produksi"
      onFieldChange={(name, value, currentValues) => {
        const nextValues = { ...currentValues, [name]: value };

        if (["good_output", "reject_qty", "rework_qty"].includes(name)) {
          return {
            total_output:
              toNumber(nextValues.good_output) + toNumber(nextValues.reject_qty) + toNumber(nextValues.rework_qty),
          };
        }

        if (name === "work_order_id") {
          const selectedWorkOrder = workOrders.find((wo) => String(wo.id) === String(value));
          return {
            shift_id: selectedWorkOrder?.shift_id ?? currentValues.shift_id ?? "",
          };
        }

        return {};
      }}
      beforePayload={(values) => {
        const workOrderId = String(values.work_order_id ?? "").trim();
        const shiftId = String(values.shift_id ?? "").trim();
        const selectedWo = workOrders.find((wo) => String(wo.id) === workOrderId);

        if (!selectedWo) {
          throw new Error("Work Order wajib dipilih dan harus valid.");
        }
        if (!shiftId) throw new Error("Shift wajib dipilih.");

        const dailyTarget = toNumber(values.daily_target_qty);
        const goodOutput = toNumber(values.good_output);
        const rejectQty = toNumber(values.reject_qty);
        const reworkQty = toNumber(values.rework_qty);
        const totalOutput = goodOutput + rejectQty + reworkQty;
        const breakMinutes = toNumber(values.break_minutes);
        const downtimeMinutes = toNumber(values.downtime_minutes);
        const downtimeFrequency = toNumber(values.downtime_frequency);
        const shiftDuration = durationMinutes(values.start_time, values.end_time);
        const availableMinutes = shiftDuration - breakMinutes;
        const netMinutes = availableMinutes - downtimeMinutes;

        if (dailyTarget <= 0) throw new Error("Target Produksi Hari Ini harus lebih dari 0.");
        if ([goodOutput, rejectQty, reworkQty].some((number) => number < 0)) {
          throw new Error("Good Output, Reject, dan Rework tidak boleh negatif.");
        }
        if (totalOutput <= 0) throw new Error("Total Output harus lebih dari 0.");
        if (breakMinutes < 0 || downtimeMinutes < 0 || downtimeFrequency < 0) {
          throw new Error("Istirahat dan downtime tidak boleh negatif.");
        }
        if (shiftDuration <= 0 || availableMinutes <= 0) {
          throw new Error("Jam produksi dan waktu istirahat tidak valid.");
        }
        if (netMinutes < 0) {
          throw new Error("Downtime tidak boleh melebihi waktu produksi tersedia.");
        }
        if (downtimeMinutes > 0 && !String(values.reason_code ?? "").trim()) {
          throw new Error("Reason Code Utama wajib diisi jika terjadi downtime.");
        }
        if (downtimeMinutes === 0 && downtimeFrequency > 0) {
          throw new Error("Frekuensi downtime harus 0 jika total downtime adalah 0.");
        }

        const targetWo = toNumber(selectedWo.target_qty);
        const validatedGood = validatedGoodByWo[workOrderId] ?? 0;
        const remainingWo = Math.max(targetWo - validatedGood, 0);
        if (targetWo > 0 && dailyTarget > remainingWo) {
          throw new Error(
            `Target Produksi Hari Ini melebihi sisa target Work Order (${formatNumber(remainingWo)} ${uomForWo(workOrderId)}).`,
          );
        }

        const achievement = (goodOutput / dailyTarget) * 100;
        const targetCycle = (availableMinutes * 60) / dailyTarget;
        const actualCycle = (netMinutes * 60) / totalOutput;

        return {
          ...values,
          work_order_id: workOrderId,
          shift_id: shiftId,
          plant_id: selectedWo.plant_id ?? profile?.plant_id ?? null,
          daily_target_qty: dailyTarget,
          total_output: totalOutput,
          good_output: goodOutput,
          reject_qty: rejectQty,
          rework_qty: reworkQty,
          break_minutes: breakMinutes,
          waste_material: toNumber(values.waste_material),
          downtime_minutes: downtimeMinutes,
          downtime_frequency: downtimeFrequency,
          available_production_minutes: round(availableMinutes, 4),
          net_production_minutes: round(netMinutes, 4),
          target_achievement_pct: round(achievement, 4),
          target_cycle_time_seconds: round(targetCycle, 4),
          actual_cycle_time_seconds: round(actualCycle, 4),
          cycle_time_variance_seconds: round(actualCycle - targetCycle, 4),
          created_by: profile?.id ?? null,
          created_role: role ?? null,
          status: "Menunggu Validasi Production Control",
        };
      }}
    />
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
