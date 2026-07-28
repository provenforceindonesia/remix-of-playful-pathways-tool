import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { productionEntriesQuery, shiftsQuery, workOrdersQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/shopfloor/input-produksi")({
  head: () => ({
    meta: [
      { title: "Input Produksi Harian — MANUFACTUREIQ" },
      { name: "description", content: "Pencatatan output, reject, rework, dan downtime produksi per shift." },
      { property: "og:title", content: "Input Produksi Harian — MANUFACTUREIQ" },
      { property: "og:description", content: "Form input hasil produksi harian operator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InputProduksiPage,
});

type Row = Record<string, unknown>;

function InputProduksiPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(productionEntriesQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "production_date", header: "Tanggal", render: (r) => formatDate(r.production_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "shift", header: "Shift", value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-" },
    {
      key: "total_output",
      header: "Total Output",
      align: "right",
      render: (r) => formatNumber(Number(r.total_output ?? 0)),
    },
    {
      key: "good_output",
      header: "Good",
      align: "right",
      render: (r) => formatNumber(Number(r.good_output ?? 0)),
    },
    {
      key: "reject_qty",
      header: "Reject",
      align: "right",
      render: (r) => formatNumber(Number(r.reject_qty ?? 0)),
    },
    {
      key: "downtime_minutes",
      header: "Downtime (mnt)",
      align: "right",
      render: (r) => formatNumber(Number(r.downtime_minutes ?? 0)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    {
      name: "work_order_id",
      label: "Work Order",
      type: "select",
      required: true,
      options: toOptions(wos as Row[], ["wo_number"]),
    },
    { name: "shift_id", label: "Shift", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    {
      name: "production_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      defaultValue: toISODate(new Date()),
    },
    { name: "start_time", label: "Jam Mulai", type: "time", required: true, defaultValue: "07:00" },
    { name: "end_time", label: "Jam Selesai", type: "time", required: true, defaultValue: "15:00" },
    { name: "break_minutes", label: "Istirahat (menit)", type: "number", defaultValue: 60 },
    { name: "total_output", label: "Total Output", type: "number", required: true, defaultValue: 0 },
    { name: "good_output", label: "Good Output", type: "number", required: true, defaultValue: 0 },
    { name: "reject_qty", label: "Reject", type: "number", defaultValue: 0 },
    { name: "rework_qty", label: "Rework", type: "number", defaultValue: 0 },
    { name: "waste_material", label: "Waste Material", type: "number", defaultValue: 0 },
    { name: "downtime_minutes", label: "Total Downtime (menit)", type: "number", defaultValue: 0 },
    { name: "downtime_frequency", label: "Frekuensi Downtime", type: "number", defaultValue: 0 },
    { name: "reason_code", label: "Reason Code Utama" },
    { name: "notes", label: "Catatan", type: "textarea", full: true },
    { name: "handover_note", label: "Catatan Handover", type: "textarea", full: true },
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
      beforePayload={(v) => ({
        ...v,
        created_by: profile?.id ?? null,
        created_role: role ?? null,
        status: "Menunggu Validasi Production Control",
      })}
    />
  );
}
