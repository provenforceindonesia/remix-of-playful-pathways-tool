import { Activity, Boxes, Layers, Truck } from "lucide-react";
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  materialIssuesQuery,
  materialReceiptsQuery,
  purchaseOrdersQuery,
  reservationsQuery,
  stockQuery,
} from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory/dashboard")({
  head: () => ({
    meta: [
      { title: "Inventory Dashboard — MANUFACTUREIQ" },
      { name: "description", content: "Ringkasan posisi stok, material kritis, reservasi, dan arus material gudang." },
      { property: "og:title", content: "Inventory Dashboard — MANUFACTUREIQ" },
      { property: "og:description", content: "Kontrol persediaan material dan kesiapan produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryDashboard,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

const COLORS = ["var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];

function status(row: Row) {
  const mat = row.materials as { min_stock?: number; reorder_point?: number } | null;
  const avail = num(row.qty_on_hand) - num(row.qty_reserved);
  if (avail <= num(mat?.min_stock)) return "Kritis";
  if (avail <= num(mat?.reorder_point)) return "Reorder";
  return "Aman";
}

function InventoryDashboard() {
  const stock = useQuery(stockQuery);
  const receipts = useQuery(materialReceiptsQuery);
  const issues = useQuery(materialIssuesQuery);
  const reservations = useQuery(reservationsQuery);
  const pos = useQuery(purchaseOrdersQuery);

  const rows = (stock.data ?? []) as Row[];
  const receiptRows = (receipts.data ?? []) as Row[];
  const issueRows = (issues.data ?? []) as Row[];
  const poRows = (pos.data ?? []) as Row[];

  const critical = rows.filter((r) => status(r) === "Kritis");
  const reorder = rows.filter((r) => status(r) === "Reorder");
  const reservedQty = ((reservations.data ?? []) as Row[])
    .filter((r) => r.status === "Reserved")
    .reduce((s, r) => s + num(r.qty), 0);
  const receiptValue = receiptRows.reduce((s, r) => s + num(r.qty) * num(r.unit_cost), 0);
  const openPo = poRows.filter((r) => !["Selesai", "Dibatalkan"].includes(String(r.status ?? ""))).length;

  const statusPie = [
    { name: "Aman", value: rows.length - critical.length - reorder.length },
    { name: "Reorder", value: reorder.length },
    { name: "Kritis", value: critical.length },
  ].filter((d) => d.value > 0);

  const flow = useMemo(() => {
    const map = new Map<string, { name: string; Masuk: number; Keluar: number }>();
    receiptRows.forEach((r) => {
      const k = String(r.receipt_date ?? "");
      const e = map.get(k) ?? { name: k, Masuk: 0, Keluar: 0 };
      e.Masuk += num(r.qty);
      map.set(k, e);
    });
    issueRows.forEach((r) => {
      const k = String(r.issue_date ?? "");
      const e = map.get(k) ?? { name: k, Masuk: 0, Keluar: 0 };
      e.Keluar += num(r.qty);
      map.set(k, e);
    });
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-14)
      .map((d) => ({ ...d, name: formatDate(d.name) }));
  }, [receiptRows, issueRows]);

  const criticalColumns: Column<Row>[] = [
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "warehouse", header: "Gudang", value: (r) => (r.warehouses as { code?: string } | null)?.code ?? "-" },
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
      key: "status",
      header: "Status",
      value: (r) => status(r),
      render: (r) => (
        <StatusBadge status={status(r)} tone={status(r) === "Kritis" ? "danger" : "warning"} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventory Dashboard"
        description="Kesehatan persediaan material: posisi stok, reservasi, dan arus keluar-masuk gudang."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard icon={<Boxes className="size-4" />} label="Item Stok" value={rows.length} tone="primary" />
        <KpiCard icon={<Boxes className="size-4" />} label="Stok Kritis" value={critical.length} tone={critical.length ? "danger" : "success"} />
        <KpiCard icon={<Layers className="size-4" />} label="Qty Ter-reservasi" value={formatNumber(reservedQty, 2)} tone="info" />
        <KpiCard icon={<Truck className="size-4" />} label="PO Berjalan" value={openPo} tone={openPo ? "warning" : "success"} />
      </div>
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Arus Material (14 Periode Terakhir)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flow}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Masuk" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Keluar" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Komposisi Status Stok</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {statusPie.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <KpiCard icon={<Boxes className="size-4" />} label="Nilai Penerimaan Material" value={formatCurrency(receiptValue)} tone="info" />
        <KpiCard icon={<Activity className="size-4" />} label="Transaksi Pengeluaran" value={issueRows.length} tone="primary" />
      </div>
      <DataTable<Row>
        columns={criticalColumns}
        rows={[...critical, ...reorder]}
        loading={stock.isLoading}
        exportName="stok-perlu-perhatian"
      />
    </>
  );
}
