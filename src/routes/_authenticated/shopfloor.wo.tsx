import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { workOrdersQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/shopfloor/wo")({
  head: () => ({
    meta: [
      { title: "WO Saya — MANUFACTUREIQ" },
      { name: "description", content: "Daftar work order aktif yang ditugaskan pada operator shopfloor." },
      { property: "og:title", content: "WO Saya — MANUFACTUREIQ" },
      { property: "og:description", content: "Work order aktif untuk operator produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWoPage,
});

type Row = Record<string, unknown>;

function MyWoPage() {
  const { data, isLoading } = useQuery(workOrdersQuery);
  const rows = ((data ?? []) as Row[]).filter(
    (r) => !["Closed", "Cancelled", "Completed"].includes(String(r.status)),
  );

  const columns: Column<Row>[] = [
    { key: "wo_number", header: "No. WO" },
    {
      key: "product",
      header: "Produk",
      value: (r) => {
        const p = r.products as { code?: string; name?: string } | null;
        return p ? `${p.code} — ${p.name}` : "-";
      },
    },
    { key: "machine", header: "Mesin", value: (r) => (r.machines as { code?: string } | null)?.code ?? "-" },
    { key: "shift", header: "Shift", value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-" },
    {
      key: "target_qty",
      header: "Target",
      align: "right",
      render: (r) => formatNumber(Number(r.target_qty ?? 0)),
    },
    {
      key: "standard_speed",
      header: "Speed Std",
      align: "right",
      render: (r) => formatNumber(Number(r.standard_speed ?? 0)),
    },
    { key: "planned_start", header: "Mulai", render: (r) => formatDate(r.planned_start as string) },
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority)} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
  ];

  return (
    <>
      <PageHeader
        title="WO Saya"
        description="Work order yang perlu dikerjakan pada shift berjalan."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="WO Aktif" value={rows.length} tone="primary" />
        <KpiCard
          label="Sedang Berjalan"
          value={rows.filter((r) => r.status === "In Progress").length}
          tone="info"
        />
        <KpiCard
          label="Menunggu Material/Maintenance"
          value={
            rows.filter((r) =>
              ["Waiting Material", "Waiting Maintenance"].includes(String(r.status)),
            ).length
          }
          tone="warning"
        />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="wo-saya" />
    </>
  );
}
