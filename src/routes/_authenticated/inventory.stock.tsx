import { Boxes, ClipboardList } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { stockQuery } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory/stock")({
  head: () => ({
    meta: [
      { title: "Stok Material — MANUFACTUREIQ" },
      { name: "description", content: "Posisi stok material per gudang beserta status reorder point." },
      { property: "og:title", content: "Stok Material — MANUFACTUREIQ" },
      { property: "og:description", content: "Monitoring saldo stok dan kebutuhan pembelian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function stockStatus(row: Row) {
  const mat = row.materials as { min_stock?: number; reorder_point?: number } | null;
  const onHand = num(row.qty_on_hand) - num(row.qty_reserved);
  if (onHand <= num(mat?.min_stock)) return { label: "Kritis", tone: "danger" as const };
  if (onHand <= num(mat?.reorder_point)) return { label: "Reorder", tone: "warning" as const };
  return { label: "Aman", tone: "success" as const };
}

function StockPage() {
  const { data, isLoading } = useQuery(stockQuery);
  const rows = (data ?? []) as Row[];

  const critical = rows.filter((r) => stockStatus(r).label === "Kritis").length;
  const reorder = rows.filter((r) => stockStatus(r).label === "Reorder").length;

  const columns: Column<Row>[] = [
    { key: "code", header: "Kode", value: (r) => (r.materials as { code?: string } | null)?.code ?? "-" },
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "warehouse", header: "Gudang", value: (r) => (r.warehouses as { name?: string } | null)?.name ?? "-" },
    { key: "qty_on_hand", header: "On Hand", align: "right", render: (r) => formatNumber(num(r.qty_on_hand), 2) },
    { key: "qty_reserved", header: "Reserved", align: "right", render: (r) => formatNumber(num(r.qty_reserved), 2) },
    {
      key: "available",
      header: "Tersedia",
      align: "right",
      value: (r) => num(r.qty_on_hand) - num(r.qty_reserved),
      render: (r) => formatNumber(num(r.qty_on_hand) - num(r.qty_reserved), 2),
    },
    {
      key: "min_stock",
      header: "Min Stock",
      align: "right",
      value: (r) => num((r.materials as { min_stock?: number } | null)?.min_stock),
      render: (r) => formatNumber(num((r.materials as { min_stock?: number } | null)?.min_stock), 2),
    },
    {
      key: "reorder_point",
      header: "Reorder Point",
      align: "right",
      value: (r) => num((r.materials as { reorder_point?: number } | null)?.reorder_point),
      render: (r) => formatNumber(num((r.materials as { reorder_point?: number } | null)?.reorder_point), 2),
    },
    {
      key: "status",
      header: "Status",
      value: (r) => stockStatus(r).label,
      render: (r) => {
        const s = stockStatus(r);
        return <StatusBadge status={s.label} tone={s.tone} />;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Stok Material" description="Saldo stok real-time per gudang." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={<Boxes className="size-4" />} label="Item Stok" value={rows.length} tone="primary" />
        <KpiCard icon={<Boxes className="size-4" />} label="Stok Kritis" value={critical} tone={critical ? "danger" : "success"} />
        <KpiCard icon={<ClipboardList className="size-4" />} label="Perlu Reorder" value={reorder} tone={reorder ? "warning" : "success"} />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="stok-material" />
    </>
  );
}
