import { Activity, Cog, Gauge } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { machineHealthQuery } from "@/lib/queries";
import { durationLabel, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/mesin")({
  head: () => ({
    meta: [
      { title: "Status Mesin — MANUFACTUREIQ" },
      { name: "description", content: "Kesehatan mesin: OEE, MTBF, MTTR, dan prioritas perawatan." },
      { property: "og:title", content: "Status Mesin — MANUFACTUREIQ" },
      { property: "og:description", content: "Monitoring kondisi dan keandalan mesin produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MachineStatusPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function MachineStatusPage() {
  const { data, isLoading } = useQuery(machineHealthQuery);
  const rows = (data ?? []) as Row[];

  const needCare = rows.filter((r) =>
    ["Perlu Perawatan", "Prioritas Perawatan"].includes(String(r.machine_condition)),
  ).length;

  const columns: Column<Row>[] = [
    { key: "machine_code", header: "Kode" },
    { key: "machine_name", header: "Nama Mesin" },
    {
      key: "master_status",
      header: "Status Master",
      render: (r) => <StatusBadge status={String(r.master_status ?? "-")} />,
    },
    { key: "good_output", header: "Good Output", align: "right", render: (r) => formatNumber(num(r.good_output)) },
    {
      key: "downtime_minutes",
      header: "Downtime",
      align: "right",
      value: (r) => num(r.downtime_minutes),
      render: (r) => durationLabel(num(r.downtime_minutes)),
    },
    { key: "avg_oee", header: "OEE", align: "right", value: (r) => num(r.avg_oee), render: (r) => formatPercent(num(r.avg_oee)) },
    {
      key: "avg_speed_index",
      header: "Speed Index",
      align: "right",
      value: (r) => num(r.avg_speed_index),
      render: (r) => formatPercent(num(r.avg_speed_index)),
    },
    { key: "mtbf_hours", header: "MTBF (jam)", align: "right", render: (r) => formatNumber(num(r.mtbf_hours), 1) },
    { key: "mttr_minutes", header: "MTTR (mnt)", align: "right", render: (r) => formatNumber(num(r.mttr_minutes), 1) },
    {
      key: "machine_condition",
      header: "Kondisi",
      render: (r) => <StatusBadge status={String(r.machine_condition ?? "-")} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Status Mesin"
        description="Kondisi mesin dihitung dari frekuensi downtime, MTBF, MTTR, dan OEE."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard icon={<Cog className="size-4" />} label="Total Mesin" value={rows.length} tone="primary" />
        <KpiCard icon={<Activity className="size-4" />}
          label="Beroperasi"
          value={rows.filter((r) => r.machine_condition === "Beroperasi").length}
          tone="success"
        />
        <KpiCard icon={<Activity className="size-4" />} label="Butuh Perawatan" value={needCare} tone={needCare ? "danger" : "success"} />
        <KpiCard icon={<Gauge className="size-4" />}
          label="OEE Rata-rata"
          value={formatPercent(rows.length ? rows.reduce((s, r) => s + num(r.avg_oee), 0) / rows.length : 0)}
          tone="info"
        />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="status-mesin" />
    </>
  );
}
