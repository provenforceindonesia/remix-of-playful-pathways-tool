import { useState } from "react";
import { Layers, Plus, ShieldCheck, Timer } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { timeStudiesQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TimeStudyFormDialog } from "@/components/engineering/TimeStudyFormDialog";

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
  const { role } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading } = useQuery(timeStudiesQuery);
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
    {
      key: "observed_minutes",
      header: "Menit Observasi",
      align: "right",
      render: (r) => formatNumber(num(r.observed_minutes), 1),
    },
    {
      key: "idle_time_min",
      header: "Idle (mnt)",
      align: "right",
      render: (r) => formatNumber(num(r.idle_time_min), 1),
    },
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

  return (
    <>
      <CrudPage<Row>
        title="Time Study"
        description="Observasi setiap operasi routing untuk menetapkan setup time dan cycle time standar."
        table="time_studies"
        invalidateKeys={[["time_studies"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={[]}
        canWrite={false}
        canDelete={false}
        exportName="time-study"
        headerActions={
          canWrite ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Tambah Time Study
            </Button>
          ) : null
        }
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <KpiCard icon={<Layers className="size-4" />} label="Total Studi" value={rows.length} tone="primary" />
          <KpiCard icon={<ShieldCheck className="size-4" />} label="Tervalidasi" value={validated} tone="success" />
          <KpiCard
            icon={<Timer className="size-4" />}
            label="Rata-rata Cycle Time"
            value={`${formatNumber(avgCt, 2)} dtk`}
            tone="info"
          />
        </div>
      </CrudPage>
      <TimeStudyFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
