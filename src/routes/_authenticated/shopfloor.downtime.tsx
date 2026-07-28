import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  downtimeQuery,
  machinesQuery,
  reasonCodesQuery,
  shiftsQuery,
  workOrdersQuery,
} from "@/lib/queries";
import { durationLabel, formatDate, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/shopfloor/downtime")({
  head: () => ({
    meta: [
      { title: "Input Downtime — MANUFACTUREIQ" },
      { name: "description", content: "Laporkan downtime mesin lengkap dengan penyebab dan tindakan sementara." },
      { property: "og:title", content: "Input Downtime — MANUFACTUREIQ" },
      { property: "og:description", content: "Pelaporan downtime mesin oleh operator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DowntimeInputPage,
});

type Row = Record<string, unknown>;

function DowntimeInputPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(downtimeQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const { data: reasons } = useQuery(reasonCodesQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "downtime_date", header: "Tanggal", render: (r) => formatDate(r.downtime_date as string) },
    {
      key: "machine",
      header: "Mesin",
      value: (r) => (r.machines as { code?: string } | null)?.code ?? "-",
    },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "start_time", header: "Mulai" },
    { key: "end_time", header: "Selesai" },
    {
      key: "duration_minutes",
      header: "Durasi",
      align: "right",
      value: (r) => Number(r.duration_minutes ?? 0),
      render: (r) => durationLabel(Number(r.duration_minutes ?? 0)),
    },
    {
      key: "reason",
      header: "Penyebab",
      value: (r) => (r.downtime_reason_codes as { name?: string } | null)?.name ?? "-",
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "machine_id", label: "Mesin", type: "select", required: true, options: toOptions(machines as Row[], ["code", "name"]) },
    { name: "work_order_id", label: "Work Order", type: "select", options: toOptions(wos as Row[], ["wo_number"]) },
    { name: "shift_id", label: "Shift", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    { name: "downtime_date", label: "Tanggal", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "start_time", label: "Jam Mulai", type: "time", required: true },
    { name: "end_time", label: "Jam Selesai", type: "time", required: true },
    {
      name: "reason_code_id",
      label: "Reason Code",
      type: "select",
      options: toOptions(reasons as Row[], ["code", "name"]),
    },
    {
      name: "category",
      label: "Kategori",
      type: "select",
      options: ["Mesin", "Material", "Man", "Metode", "Eksternal"].map((v) => ({ value: v, label: v })),
    },
    { name: "cause", label: "Penyebab", type: "textarea", full: true },
    { name: "temporary_action", label: "Tindakan Sementara", type: "textarea", full: true },
    { name: "requires_maintenance", label: "Perlu Maintenance", type: "switch", defaultValue: false },
  ];

  return (
    <CrudPage<Row>
      title="Input Downtime"
      description="Setiap downtime wajib dilaporkan agar analisis OEE akurat."
      table="downtime_records"
      invalidateKeys={[["downtime_records"], ["v_machine_health"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="downtime"
      beforePayload={(v) => ({
        ...v,
        created_by: profile?.id ?? null,
        operator_id: profile?.id ?? null,
        status: "Dilaporkan",
      })}
    />
  );
}
