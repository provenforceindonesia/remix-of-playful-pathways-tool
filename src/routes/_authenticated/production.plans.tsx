import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { linesQuery, plantsQuery, productionPlansQuery, salesOrdersQuery, shiftsQuery } from "@/lib/queries";
import { formatDate, formatFullDateTime, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/production/plans")({
  head: () => ({
    meta: [
      { title: "Production Plan — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Rencana produksi harian per line dan shift beserta kesiapan material.",
      },
      { property: "og:title", content: "Production Plan — MANUFACTUREIQ" },
      { property: "og:description", content: "Perencanaan produksi harian pabrik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

type Row = Record<string, unknown>;

type WorkOrderSchedule = {
  production_date?: string | null;
  shift_id?: string | null;
  planned_manpower?: number | string | null;
};

type PlanWorkOrder = {
  work_order_schedules?: WorkOrderSchedule[] | null;
};

/**
 * Menampilkan kebutuhan manpower puncak dalam satu tanggal dan shift.
 * Jadwal pada tanggal/shift berbeda tidak dijumlahkan karena tidak berjalan
 * secara bersamaan.
 */
function getPeakPlannedManpower(row: Row): number | null {
  const workOrders = (row.work_orders ?? []) as PlanWorkOrder[];
  const manpowerBySchedule = new Map<string, number>();

  for (const workOrder of workOrders) {
    for (const schedule of workOrder.work_order_schedules ?? []) {
      const manpower = Number(schedule.planned_manpower ?? 0);
      if (!Number.isFinite(manpower) || manpower <= 0) continue;

      const scheduleKey = `${schedule.production_date ?? "tanpa-tanggal"}:${schedule.shift_id ?? "tanpa-shift"}`;
      manpowerBySchedule.set(scheduleKey, (manpowerBySchedule.get(scheduleKey) ?? 0) + manpower);
    }
  }

  if (manpowerBySchedule.size === 0) return null;
  return Math.max(...manpowerBySchedule.values());
}

function PlansPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(productionPlansQuery);
  const { data: sos } = useQuery(salesOrdersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "plan_number", header: "No. Plan" },
    {
      key: "so",
      header: "Sales Order",
      value: (r) => (r.sales_orders as { so_number?: string } | null)?.so_number ?? "-",
    },
    {
      key: "production_date",
      header: "Jadwal Produksi",
      render: (r) => formatDate(r.production_date as string),
    },
    {
      key: "line",
      header: "Line",
      value: (r) => (r.lines as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "shift",
      header: "Shift",
      value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "material_readiness",
      header: "Material",
      render: (r) => <StatusBadge status={String(r.material_readiness ?? "-")} />,
    },
    {
      key: "capacity_readiness",
      header: "Kapasitas",
      render: (r) => <StatusBadge status={String(r.capacity_readiness ?? "-")} />,
    },
    {
      key: "planned_manpower",
      header: "Kebutuhan Manpower",
      align: "right",
      value: (r) => getPeakPlannedManpower(r) ?? 0,
      render: (r) => {
        const manpower = getPeakPlannedManpower(r);
        return manpower === null ? "Belum dijadwalkan" : `${formatNumber(manpower)} orang`;
      },
    },
    {
      key: "created_at",
      header: "Dibuat",
      render: (r) => formatFullDateTime(r.created_at as string),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r.status ?? "-")} />,
    },
  ];

  const readiness = ["Siap", "Sebagian", "Tidak Siap", "Belum Dicek"].map((v) => ({
    value: v,
    label: v,
  }));

  const fields: CrudField[] = [
    { name: "plan_number", label: "Nomor Plan", required: true, placeholder: "PP-2601-0001" },
    {
      name: "sales_order_id",
      label: "Sales Order",
      type: "select",
      options: toOptions(sos as Row[], ["so_number"]),
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
      name: "shift_id",
      label: "Shift",
      type: "select",
      options: toOptions(shifts as Row[], ["name"]),
    },
    {
      name: "production_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      defaultValue: toISODate(new Date()),
    },
    {
      name: "material_readiness",
      label: "Kesiapan Material",
      type: "select",
      options: readiness,
      defaultValue: "Belum Dicek",
    },
    {
      name: "capacity_readiness",
      label: "Kesiapan Kapasitas",
      type: "select",
      options: readiness,
      defaultValue: "Belum Dicek",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "Draft",
      options: ["Draft", "Review", "Released", "Partially Scheduled", "Fully Scheduled", "Completed", "Cancelled"].map(
        (v) => ({ value: v, label: v }),
      ),
    },
  ];

  return (
    <CrudPage<Row>
      title="Production Plan"
      description="Rencana produksi menjadi dasar penerbitan work order."
      table="production_plans"
      invalidateKeys={[["production_plans"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="production-plan"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    />
  );
}
