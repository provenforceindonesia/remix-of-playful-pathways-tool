import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { backlogQuery, profilesQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/production/backlog")({
  head: () => ({
    meta: [
      { title: "Backlog & Recovery — MANUFACTUREIQ" },
      { name: "description", content: "Pantau kekurangan output produksi dan rencana recovery-nya." },
      { property: "og:title", content: "Backlog & Recovery — MANUFACTUREIQ" },
      { property: "og:description", content: "Manajemen backlog produksi dan pemulihan target." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BacklogPage,
});

type Row = Record<string, unknown>;

function BacklogPage() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery(backlogQuery);
  const { data: profiles } = useQuery(profilesQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const remaining = rows.reduce((s, r) => s + Number(r.remaining_qty ?? 0), 0);
  const open = rows.filter((r) => r.status === "Open").length;

  const columns: Column<Row>[] = [
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    {
      key: "product",
      header: "Produk",
      value: (r) => (r.products as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "target_qty",
      header: "Target",
      align: "right",
      render: (r) => formatNumber(Number(r.target_qty ?? 0)),
    },
    {
      key: "good_output",
      header: "Good",
      align: "right",
      render: (r) => formatNumber(Number(r.good_output ?? 0)),
    },
    {
      key: "shortage_qty",
      header: "Kekurangan",
      align: "right",
      render: (r) => formatNumber(Number(r.shortage_qty ?? 0)),
    },
    {
      key: "recovered_qty",
      header: "Recovered",
      align: "right",
      render: (r) => formatNumber(Number(r.recovered_qty ?? 0)),
    },
    {
      key: "remaining_qty",
      header: "Sisa",
      align: "right",
      render: (r) => formatNumber(Number(r.remaining_qty ?? 0)),
    },
    { key: "due_date", header: "Due", render: (r) => formatDate(r.due_date as string) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "cause", label: "Penyebab Backlog", type: "textarea", full: true },
    { name: "owner_id", label: "Penanggung Jawab", type: "select", options: toOptions(profiles as Row[], ["full_name"]) },
    { name: "due_date", label: "Target Pemulihan", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["Open", "Partially Recovered", "Recovered"].map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <CrudPage<Row>
      title="Backlog & Recovery"
      description="Backlog terbentuk otomatis ketika output tervalidasi kurang dari target work order."
      table="backlog_ledger"
      invalidateKeys={[["backlog_ledger"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={false}
      exportName="backlog"
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Backlog Terbuka" value={open} tone={open ? "danger" : "success"} />
        <KpiCard label="Sisa Qty" value={formatNumber(remaining)} tone="warning" />
        <KpiCard
          label="Recovered"
          value={rows.filter((r) => r.status === "Recovered").length}
          tone="success"
        />
      </div>
    </CrudPage>
  );
}
