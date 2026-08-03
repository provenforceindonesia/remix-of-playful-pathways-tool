import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  linesQuery,
  machinesQuery,
  plantsQuery,
  productionPlansQuery,
  productsQuery,
  routingsQuery,
  salesOrdersQuery,
  shiftsQuery,
  uomQuery,
  workOrdersQuery,
} from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/production/work-orders")({
  head: () => ({
    meta: [
      { title: "Work Orders — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Penerbitan dan pemantauan work order produksi per mesin dan shift.",
      },
      { property: "og:title", content: "Work Orders — MANUFACTUREIQ" },
      { property: "og:description", content: "Kelola work order produksi pabrik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkOrdersPage,
});

type Row = Record<string, unknown>;

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function shiftMinutes(shift: Row | undefined) {
  if (!shift) return 0;
  const [sh, sm] = String(shift.start_time ?? "00:00")
    .split(":")
    .map(Number);
  const [eh, em] = String(shift.end_time ?? "00:00")
    .split(":")
    .map(Number);
  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 1440;
  return Math.max(end - start - toNumber(shift.break_minutes), 0);
}

function WorkOrdersPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(workOrdersQuery);
  const { data: plans } = useQuery(productionPlansQuery);
  const { data: sos } = useQuery(salesOrdersQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: routings } = useQuery(routingsQuery);
  const { data: uoms } = useQuery(uomQuery);
  const { data: routingOperations } = useQuery({
    queryKey: ["routing_operations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routing_operations").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });

  const rows = (data ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const recommendation = (values: Record<string, unknown>) => {
    const target = toNumber(values.schedule_target_qty);
    const shift = ((shifts ?? []) as Row[]).find((item) => String(item.id) === String(values.schedule_shift_id ?? ""));
    const available = shiftMinutes(shift);
    const operations = ((routingOperations ?? []) as Row[]).filter(
      (item) => String(item.routing_id) === String(values.routing_id ?? ""),
    );
    const standardMinutesPerUnit = operations.reduce(
      (total, operation) =>
        total + (toNumber(operation.standard_cycle_time_sec) * Math.max(toNumber(operation.manpower), 1)) / 60,
      0,
    );
    const requiredMinutes = target * standardMinutesPerUnit;
    const standardRoutingManpower = operations.reduce(
      (maximum, operation) => Math.max(maximum, toNumber(operation.manpower)),
      0,
    );
    const calculated = available > 0 ? Math.ceil(requiredMinutes / available) : 0;
    return {
      available,
      requiredMinutes,
      recommended: Math.max(calculated, standardRoutingManpower),
    };
  };

  const columns: Column<Row>[] = [
    { key: "wo_number", header: "No. WO" },
    {
      key: "wo_type",
      header: "Tipe",
      render: (r) => <StatusBadge status={String(r.wo_type ?? "-")} />,
    },
    {
      key: "product",
      header: "Produk",
      value: (r) => {
        const p = r.products as { code?: string; name?: string } | null;
        return p ? `${p.code} — ${p.name}` : "-";
      },
    },
    {
      key: "machine",
      header: "Mesin",
      value: (r) => (r.machines as { code?: string } | null)?.code ?? "-",
    },
    {
      key: "shift",
      header: "Shift",
      value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "target_qty",
      header: "Target",
      align: "right",
      value: (r) => Number(r.target_qty ?? 0),
      render: (r) => formatNumber(Number(r.target_qty ?? 0)),
    },
    {
      key: "planned_start",
      header: "Mulai",
      render: (r) => formatDate(r.planned_start as string),
    },
    {
      key: "priority",
      header: "Prioritas",
      render: (r) => <StatusBadge status={String(r.priority ?? "-")} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r.status ?? "-")} />,
    },
  ];

  const fields: CrudField[] = [
    { name: "wo_number", label: "Nomor WO", required: true, placeholder: "WO-2601-0001" },
    {
      name: "wo_type",
      label: "Tipe WO",
      type: "select",
      defaultValue: "Reguler",
      options: ["Reguler", "Recovery", "Rework", "Trial"].map((v) => ({ value: v, label: v })),
    },
    {
      name: "plan_id",
      label: "Production Plan",
      type: "select",
      options: toOptions(plans as Row[], ["plan_number"]),
    },
    {
      name: "sales_order_id",
      label: "Sales Order",
      type: "select",
      options: toOptions(sos as Row[], ["so_number"]),
    },
    {
      name: "product_id",
      label: "Produk",
      type: "select",
      required: true,
      options: toOptions(products as Row[], ["code", "name"]),
    },
    {
      name: "plant_id",
      label: "Plant",
      type: "select",
      options: toOptions(plants as Row[], ["name"]),
    },
    {
      name: "line_id",
      label: "Line",
      type: "select",
      options: toOptions(lines as Row[], ["name"]),
    },
    {
      name: "machine_id",
      label: "Mesin",
      type: "select",
      options: toOptions(machines as Row[], ["code", "name"]),
    },
    {
      name: "routing_id",
      label: "Routing",
      type: "select",
      options: toOptions(routings as Row[], ["code", "name"]),
    },
    { name: "target_qty", label: "Target Qty", type: "number", required: true, defaultValue: 0 },
    { name: "uom_id", label: "UoM", type: "select", options: toOptions(uoms as Row[], ["code"]) },
    { name: "planned_start", label: "Rencana Mulai", type: "date" },
    { name: "planned_finish", label: "Rencana Selesai", type: "date" },
    { name: "standard_speed", label: "Speed Standar (unit/jam)", type: "number", defaultValue: 0 },
    {
      name: "standard_cycle_time_sec",
      label: "Cycle Time Standar (detik)",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "schedule_section",
      label: "Jadwal Eksekusi Pertama",
      type: "custom",
      full: true,
      virtual: true,
      render: ({ values }) => {
        const result = recommendation(values);
        return (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">
              Rekomendasi Manpower Sistem
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Waktu Tersedia</p>
                <p className="font-semibold">{formatNumber(result.available)} menit</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Beban Kerja Standar</p>
                <p className="font-semibold">{formatNumber(result.requiredMinutes)} menit-orang</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rekomendasi</p>
                <p className="font-semibold">{formatNumber(result.recommended)} orang</p>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      name: "schedule_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      virtual: true,
    },
    {
      name: "schedule_shift_id",
      label: "Shift Produksi",
      type: "select",
      required: true,
      virtual: true,
      options: toOptions(shifts as Row[], ["name"]),
    },
    {
      name: "schedule_target_qty",
      label: "Target Produksi Shift",
      type: "number",
      required: true,
      defaultValue: 0,
      virtual: true,
    },
    {
      name: "recommended_manpower",
      label: "Rekomendasi Manpower Sistem",
      type: "number",
      readOnly: true,
      defaultValue: 0,
      virtual: true,
    },
    {
      name: "planned_manpower",
      label: "Planned Manpower Final",
      type: "number",
      required: true,
      defaultValue: 0,
      virtual: true,
    },
    {
      name: "manpower_override_reason",
      label: "Alasan Perubahan Manpower",
      placeholder: "Wajib jika planned manpower berbeda dari rekomendasi sistem",
      full: true,
      virtual: true,
    },
    {
      name: "priority",
      label: "Prioritas",
      type: "select",
      defaultValue: "Normal",
      options: ["Urgent", "Tinggi", "Normal", "Rendah"].map((v) => ({ value: v, label: v })),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "Draft",
      options: [
        "Draft",
        "Released",
        "Scheduled",
        "In Progress",
        "Paused",
        "Waiting Material",
        "Waiting Maintenance",
        "Completed",
        "Closed",
        "Cancelled",
      ].map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <CrudPage<Row>
      title="Work Orders"
      description="Perintah kerja produksi lengkap dengan target, mesin, dan standar kecepatan."
      table="work_orders"
      invalidateKeys={[["work_orders"], ["work_order_schedules"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="work-order"
      onFieldChange={(name, value, currentValues) => {
        const next = { ...currentValues, [name]: value };
        if (["routing_id", "schedule_shift_id", "schedule_target_qty"].includes(name)) {
          const result = recommendation(next);
          return {
            recommended_manpower: result.recommended,
            planned_manpower: result.recommended,
          };
        }
        return {};
      }}
      beforePayload={(values) => {
        const result = recommendation(values);
        const plannedManpower = toNumber(values.planned_manpower);
        const targetWo = toNumber(values.target_qty);
        const targetShift = toNumber(values.schedule_target_qty);
        const overrideReason = String(values.manpower_override_reason ?? "").trim();

        if (!values.schedule_date || !values.schedule_shift_id) {
          throw new Error("Tanggal dan shift produksi wajib ditentukan.");
        }
        if (targetShift <= 0) throw new Error("Target Produksi Shift harus lebih dari 0.");
        if (targetShift > targetWo) throw new Error("Target Produksi Shift tidak boleh melebihi Target WO.");
        if (!values.routing_id) throw new Error("Routing wajib dipilih untuk menghitung manpower.");
        if (result.recommended <= 0) {
          throw new Error("Routing belum memiliki cycle time/manpower standar yang valid.");
        }
        if (plannedManpower <= 0) throw new Error("Planned Manpower Final harus lebih dari 0.");
        if (plannedManpower !== result.recommended && !overrideReason) {
          throw new Error(
            "Alasan perubahan manpower wajib diisi karena planned manpower berbeda dari rekomendasi sistem.",
          );
        }

        return {
          ...values,
          shift_id: values.schedule_shift_id,
          planned_start: values.schedule_date,
          created_by: profile?.id ?? null,
        };
      }}
      afterCreate={async (created, values) => {
        const result = recommendation(values);
        const plannedManpower = toNumber(values.planned_manpower);
        const isOverride = plannedManpower !== result.recommended;
        const { error } = await db.from("work_order_schedules").insert({
          work_order_id: created.id,
          production_date: values.schedule_date,
          shift_id: values.schedule_shift_id,
          target_qty: toNumber(values.schedule_target_qty),
          available_minutes: result.available,
          required_standard_minutes: result.requiredMinutes,
          recommended_manpower: result.recommended,
          planned_manpower: plannedManpower,
          manpower_calculation_method: isOverride ? "Manual Override" : "Calculated",
          manpower_override_reason: isOverride ? String(values.manpower_override_reason ?? "").trim() : null,
          status: "Scheduled",
          created_by: profile?.id ?? null,
        });
        if (error) throw new Error(`Work Order dibuat, tetapi jadwal gagal disimpan: ${error.message}`);
      }}
    />
  );
}
