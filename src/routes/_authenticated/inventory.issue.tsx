import { Layers } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import {
  materialIssuesQuery,
  materialsQuery,
  warehousesQuery,
  workOrdersQuery,
} from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inventory/issue")({
  head: () => ({
    meta: [
      { title: "Pengeluaran Material — MANUFACTUREIQ" },
      { name: "description", content: "Pengeluaran material dari gudang ke work order produksi." },
      { property: "og:title", content: "Pengeluaran Material — MANUFACTUREIQ" },
      { property: "og:description", content: "Catat issue material untuk kebutuhan produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IssuePage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function IssuePage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(materialIssuesQuery);
  const { data: materials } = useQuery(materialsQuery);
  const { data: warehouses } = useQuery(warehousesQuery);
  const { data: workOrders } = useQuery(workOrdersQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["INVENTORY", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "issue_no", header: "No. Keluar" },
    { key: "issue_date", header: "Tanggal", render: (r) => formatDate(r.issue_date as string) },
    { key: "wo", header: "Work Order", value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-" },
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "warehouse", header: "Gudang", value: (r) => (r.warehouses as { code?: string } | null)?.code ?? "-" },
    { key: "qty", header: "Qty", align: "right", render: (r) => formatNumber(num(r.qty), 2) },
  ];

  const fields: CrudField[] = [
    { name: "issue_no", label: "No. Pengeluaran", required: true },
    { name: "issue_date", label: "Tanggal", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "work_order_id", label: "Work Order", type: "select", options: toOptions(workOrders as Row[], ["wo_number"]) },
    { name: "warehouse_id", label: "Gudang", type: "select", options: toOptions(warehouses as Row[], ["code", "name"]) },
    { name: "material_id", label: "Material", type: "select", required: true, options: toOptions(materials as Row[], ["code", "name"]) },
    { name: "qty", label: "Qty", type: "number", step: "0.01", required: true },
  ];

  return (
    <CrudPage<Row>
      title="Pengeluaran Material"
      description="Material yang dikeluarkan mengurangi saldo stok dan menjadi biaya produksi."
      table="material_issues"
      invalidateKeys={[["material_issues"], ["stock_balances"], ["stock_ledger"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="pengeluaran-material"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
      toolbar={
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard icon={<Layers className="size-4" />} label="Total Transaksi" value={rows.length} tone="primary" />
          <KpiCard icon={<Layers className="size-4" />} label="Total Qty Keluar" value={formatNumber(rows.reduce((s, r) => s + num(r.qty), 0), 2)} tone="warning" />
        </div>
      }
    />
  );
}
