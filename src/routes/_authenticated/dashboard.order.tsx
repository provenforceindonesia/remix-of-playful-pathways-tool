import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { AlarmClock, Gauge, ShoppingCart, Wallet } from "lucide-react";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { salesOrdersQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/order")({
  head: () => ({
    meta: [
      { title: "Dashboard Order — MANUFACTUREIQ" },
      { name: "description", content: "Ringkasan status customer order, nilai order, dan ketepatan pengiriman." },
      { property: "og:title", content: "Dashboard Order — MANUFACTUREIQ" },
      { property: "og:description", content: "Pantau pemenuhan order pelanggan secara real-time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDashboard,
});

type Row = Record<string, unknown>;
type Item = { quantity: number; unit_price: number };
const num = (v: unknown) => Number(v ?? 0);
const orderValue = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + num(i.quantity) * num(i.unit_price),
    0,
  );

const COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "var(--color-info)",
  "var(--color-purple)",
];

function OrderDashboard() {
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const rows = (data ?? []) as Row[];

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = String(r.status ?? "-");
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const late = rows.filter((r) => r.status === "Terlambat").length;
  const totalValue = rows.reduce((s, r) => s + orderValue(r), 0);
  const avgProgress = rows.length
    ? rows.reduce((s, r) => s + num(r.progress_pct), 0) / rows.length
    : 0;

  const columns: Column<Row>[] = [
    { key: "so_number", header: "No. SO" },
    { key: "customer", header: "Customer", value: (r) => (r.customers as { name?: string } | null)?.name ?? "-" },
    { key: "order_date", header: "Tgl Order", render: (r) => formatDate(r.order_date as string) },
    { key: "required_date", header: "Butuh Tgl", render: (r) => formatDate(r.required_date as string) },
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority ?? "-")} /> },
    {
      key: "value",
      header: "Nilai Order",
      align: "right",
      value: (r) => orderValue(r),
      render: (r) => formatCurrency(orderValue(r)),
    },
    {
      key: "progress_pct",
      header: "Progress",
      value: (r) => num(r.progress_pct),
      render: (r) => (
        <div className="flex min-w-32 items-center gap-2">
          <Progress value={num(r.progress_pct)} className="h-2" />
          <span className="text-xs tabular-nums">{formatPercent(num(r.progress_pct), 0)}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  return (
    <>
      <PageHeader title="Dashboard Order" description="Status pemenuhan seluruh customer order." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Order" value={rows.length} icon={<ShoppingCart />} sub="customer order aktif" tone="purple" />
        <KpiCard label="Nilai Order" value={formatCurrency(totalValue)} icon={<Wallet />} sub="total nilai kontrak" tone="success" />
        <KpiCard label="Rata-rata Progress" value={formatPercent(avgProgress)} icon={<Gauge />} sub="pemenuhan order" tone="info" />
        <KpiCard label="Order Terlambat" value={late} icon={<AlarmClock />} sub="lewat tanggal dibutuhkan" tone={late ? "danger" : "success"} />

      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Distribusi Status Order</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {byStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="dashboard-order" />
    </>
  );
}
