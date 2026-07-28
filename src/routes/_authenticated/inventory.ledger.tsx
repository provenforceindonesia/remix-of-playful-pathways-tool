import { Layers } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { stockLedgerQuery } from "@/lib/queries";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory/ledger")({
  head: () => ({
    meta: [
      { title: "Kartu Stok — MANUFACTUREIQ" },
      { name: "description", content: "Riwayat mutasi material masuk, keluar, dan penyesuaian stok." },
      { property: "og:title", content: "Kartu Stok — MANUFACTUREIQ" },
      { property: "og:description", content: "Telusuri seluruh pergerakan material gudang." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function LedgerPage() {
  const { data, isLoading } = useQuery(stockLedgerQuery);
  const rows = (data ?? []) as Row[];

  const totalIn = rows.reduce((s, r) => s + num(r.qty_in), 0);
  const totalOut = rows.reduce((s, r) => s + num(r.qty_out), 0);

  const columns: Column<Row>[] = [
    { key: "txn_date", header: "Waktu", render: (r) => formatDateTime(r.txn_date as string) },
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "warehouse", header: "Gudang", value: (r) => (r.warehouses as { code?: string } | null)?.code ?? "-" },
    { key: "txn_type", header: "Tipe", render: (r) => <StatusBadge status={String(r.txn_type ?? "-")} /> },
    { key: "qty_in", header: "Masuk", align: "right", render: (r) => formatNumber(num(r.qty_in), 2) },
    { key: "qty_out", header: "Keluar", align: "right", render: (r) => formatNumber(num(r.qty_out), 2) },
    { key: "balance_after", header: "Saldo", align: "right", render: (r) => formatNumber(num(r.balance_after), 2) },
    { key: "unit_cost", header: "Harga Satuan", align: "right", render: (r) => formatCurrency(num(r.unit_cost)) },
    { key: "note", header: "Catatan" },
  ];

  return (
    <>
      <PageHeader title="Kartu Stok" description="500 mutasi stok terakhir dari seluruh gudang." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={<Layers className="size-4" />} label="Total Mutasi" value={rows.length} tone="primary" />
        <KpiCard icon={<Layers className="size-4" />} label="Total Masuk" value={formatNumber(totalIn, 2)} tone="success" />
        <KpiCard icon={<Layers className="size-4" />} label="Total Keluar" value={formatNumber(totalOut, 2)} tone="warning" />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="kartu-stok" />
    </>
  );
}
