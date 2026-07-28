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

export const Route = createFileRoute("/_authenticated/production/work-orders")({
  head: () => ({
    meta: [
      { title: "Work Orders — MANUFACTUREIQ" },
      { name: "description", content: "Penerbitan dan pemantauan work order produksi per mesin dan shift." },
      { property: "og:title", content: "Work Orders — MANUFACTUREIQ" },
      { property: "og:description", content: "Kelola work order produksi pabrik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkOrdersPage,
});

type Row = Record<string, unknown>;

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

  const rows = (data ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "wo_number", header: "No. WO" },
    { key: "wo_type", header: "Tipe", render: (r) => <StatusBadge status={String(r.wo_type ?? "-")} /> },
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
    { key: "shift", header: "Shift", value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-" },
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
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority ?? "-")} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
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
    { name: "plan_id", label: "Production Plan", type: "select", options: toOptions(plans as Row[], ["plan_number"]) },
    { name: "sales_order_id", label: "Sales Order", type: "select", options: toOptions(sos as Row[], ["so_number"]) },
    { name: "product_id", label: "Produk", type: "select", required: true, options: toOptions(products as Row[], ["code", "name"]) },
    { name: "plant_id", label: "Plant", type: "select", options: toOptions(plants as Row[], ["name"]) },
    { name: "line_id", label: "Line", type: "select", options: toOptions(lines as Row[], ["name"]) },
    { name: "machine_id", label: "Mesin", type: "select", options: toOptions(machines as Row[], ["code", "name"]) },
    { name: "shift_id", label: "Shift", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    { name: "routing_id", label: "Routing", type: "select", options: toOptions(routings as Row[], ["code", "name"]) },
    { name: "target_qty", label: "Target Qty", type: "number", required: true, defaultValue: 0 },
    { name: "uom_id", label: "UoM", type: "select", options: toOptions(uoms as Row[], ["code"]) },
    { name: "planned_start", label: "Rencana Mulai", type: "date" },
    { name: "planned_finish", label: "Rencana Selesai", type: "date" },
    { name: "standard_speed", label: "Speed Standar (unit/jam)", type: "number", defaultValue: 0 },
    { name: "standard_cycle_time_sec", label: "Cycle Time Standar (detik)", type: "number", defaultValue: 0 },
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
      invalidateKeys={[["work_orders"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="work-order"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    />
  );
}
