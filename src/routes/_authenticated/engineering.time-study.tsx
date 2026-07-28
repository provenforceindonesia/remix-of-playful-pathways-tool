import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { machinesQuery, productsQuery, shiftsQuery, timeStudiesQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/time-study")({
  head: () => ({
    meta: [
      { title: "Time Study — MANUFACTUREIQ" },
      { name: "description", content: "Pengukuran waktu siklus aktual proses produksi sebagai dasar standar kerja." },
      { property: "og:title", content: "Time Study — MANUFACTUREIQ" },
      { property: "og:description", content: "Observasi cycle time dan validasi standar produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimeStudyPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function TimeStudyPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(timeStudiesQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");

  const validated = rows.filter((r) => r.status === "Tervalidasi").length;
  const avgCt = rows.length ? rows.reduce((s, r) => s + num(r.actual_cycle_time_sec), 0) / rows.length : 0;

  const columns: Column<Row>[] = [
    { key: "study_date", header: "Tanggal", render: (r) => formatDate(r.study_date as string) },
    { key: "product", header: "Produk", value: (r) => (r.products as { name?: string } | null)?.name ?? "-" },
    { key: "process_name", header: "Proses" },
    { key: "machine", header: "Mesin", value: (r) => (r.machines as { code?: string } | null)?.code ?? "-" },
    { key: "observed_output", header: "Output", align: "right", render: (r) => formatNumber(num(r.observed_output)) },
    { key: "observed_minutes", header: "Menit Observasi", align: "right", render: (r) => formatNumber(num(r.observed_minutes), 1) },
    { key: "idle_time_min", header: "Idle (mnt)", align: "right", render: (r) => formatNumber(num(r.idle_time_min), 1) },
    { key: "manpower", header: "Manpower", align: "right" },
    {
      key: "actual_cycle_time_sec",
      header: "Cycle Time (dtk)",
      align: "right",
      value: (r) => num(r.actual_cycle_time_sec),
      render: (r) => formatNumber(num(r.actual_cycle_time_sec), 2),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "study_date", label: "Tanggal Studi", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "product_id", label: "Produk", type: "select", options: toOptions(products as Row[], ["code", "name"]) },
    { name: "process_name", label: "Nama Proses", required: true },
    { name: "machine_id", label: "Mesin", type: "select", options: toOptions(machines as Row[], ["code", "name"]) },
    { name: "shift_id", label: "Shift", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    { name: "observed_output", label: "Output Observasi", type: "number", defaultValue: 0 },
    { name: "observed_minutes", label: "Durasi Observasi (menit)", type: "number", defaultValue: 0 },
    { name: "setup_time_min", label: "Setup (menit)", type: "number", defaultValue: 0 },
    { name: "idle_time_min", label: "Idle (menit)", type: "number", defaultValue: 0 },
    { name: "manpower", label: "Jumlah Operator", type: "number", defaultValue: 1 },
    { name: "actual_cycle_time_sec", label: "Cycle Time Aktual (detik)", type: "number", step: "0.01", defaultValue: 0 },
    { name: "status", label: "Status", type: "select", options: selectOptions(["Draft", "Tervalidasi", "Perlu Revisi"]), defaultValue: "Draft" },
    { name: "notes", label: "Catatan", type: "textarea", full: true },
  ];

  return (
    <CrudPage<Row>
      title="Time Study"
      description="Observasi waktu proses untuk menetapkan standar cycle time dan kapasitas."
      table="time_studies"
      invalidateKeys={[["time_studies"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="time-study"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null, observer_id: profile?.id ?? null })}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Studi" value={rows.length} tone="primary" />
        <KpiCard label="Tervalidasi" value={validated} tone="success" />
        <KpiCard label="Rata-rata Cycle Time" value={`${formatNumber(avgCt, 2)} dtk`} tone="info" />
      </div>
    </CrudPage>
  );
}
