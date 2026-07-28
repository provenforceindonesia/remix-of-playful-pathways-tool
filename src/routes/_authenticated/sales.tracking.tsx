import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Progress } from "@/components/ui/progress";
import { salesOrdersQuery, workOrdersQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales/tracking")({
  head: () => ({
    meta: [
      { title: "Order Tracking — MANUFACTUREIQ" },
      { name: "description", content: "Lacak progres pemenuhan setiap customer order hingga pengiriman." },
      { property: "og:title", content: "Order Tracking — MANUFACTUREIQ" },
      { property: "og:description", content: "Pelacakan progres order pelanggan secara real-time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackingPage,
});

type Row = Record<string, unknown>;
type Item = { quantity: number; unit_price: number };

function TrackingPage() {
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const rows = (data ?? []) as Row[];

  const woBySo = useMemo(() => {
    const map = new Map<string, number>();
    ((wos ?? []) as Row[]).forEach((w) => {
      const so = String(w.sales_order_id ?? "");
      if (so) map.set(so, (map.get(so) ?? 0) + 1);
    });
    return map;
  }, [wos]);

  const value = (r: Row) =>
    (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
      (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
      0,
    );

  const late = rows.filter((r) => r.status === "Terlambat").length;
  const running = rows.filter((r) =>
    ["Dalam Produksi", "Direncanakan", "Sebagian Terpenuhi"].includes(String(r.status)),
  ).length;
  const done = rows.filter((r) => r.status === "Selesai").length;

  const columns: Column<Row>[] = [
    { key: "so_number", header: "No. SO" },
    {
      key: "customer",
      header: "Customer",
      value: (r) => (r.customers as { name?: string } | null)?.name ?? "-",
    },
    { key: "required_date", header: "Target", render: (r) => formatDate(r.required_date as string) },
    {
      key: "confirmed_delivery_date",
      header: "Konfirmasi Kirim",
      render: (r) => formatDate(r.confirmed_delivery_date as string),
    },
    {
      key: "wo",
      header: "Jumlah WO",
      align: "right",
      value: (r) => woBySo.get(String(r.id)) ?? 0,
    },
    {
      key: "progress_pct",
      header: "Progress",
      value: (r) => Number(r.progress_pct ?? 0),
      render: (r) => (
        <div className="flex min-w-32 items-center gap-2">
          <Progress value={Number(r.progress_pct ?? 0)} className="h-2" />
          <span className="text-xs tabular-nums">{formatPercent(Number(r.progress_pct ?? 0), 0)}</span>
        </div>
      ),
    },
    {
      key: "value",
      header: "Nilai",
      align: "right",
      value,
      render: (r) => formatCurrency(value(r)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
  ];

  return (
    <>
      <PageHeader
        title="Order Tracking"
        description="Progres pemenuhan order dihitung dari output produksi yang telah tervalidasi."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Order" value={rows.length} tone="primary" />
        <KpiCard label="Sedang Berjalan" value={running} tone="info" />
        <KpiCard label="Terlambat" value={late} tone={late ? "danger" : "success"} />
        <KpiCard label="Selesai" value={done} tone="success" />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="order-tracking" />
    </>
  );
}
