import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { plantsQuery, purchaseOrdersQuery, suppliersQuery } from "@/lib/queries";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/procurement/po")({
  head: () => ({
    meta: [
      { title: "Purchase Order — MANUFACTUREIQ" },
      { name: "description", content: "Kelola pesanan pembelian material ke supplier beserta status penerimaannya." },
      { property: "og:title", content: "Purchase Order — MANUFACTUREIQ" },
      { property: "og:description", content: "Pembelian material dan monitoring kedatangan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchaseOrderPage,
});

type Row = Record<string, unknown>;
type Item = { qty?: number; received_qty?: number };
const num = (v: unknown) => Number(v ?? 0);

function PurchaseOrderPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(purchaseOrdersQuery);
  const { data: suppliers } = useQuery(suppliersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["INVENTORY", "SYSADMIN"].includes(role ?? "");

  const open = rows.filter((r) => !["Selesai", "Dibatalkan"].includes(String(r.status ?? ""))).length;
  const totalValue = rows.reduce((s, r) => s + num(r.total_amount), 0);

  const columns: Column<Row>[] = [
    { key: "po_number", header: "No. PO" },
    { key: "supplier", header: "Supplier", value: (r) => (r.suppliers as { name?: string } | null)?.name ?? "-" },
    { key: "order_date", header: "Tgl Order", render: (r) => formatDate(r.order_date as string) },
    { key: "expected_date", header: "Estimasi Datang", render: (r) => formatDate(r.expected_date as string) },
    {
      key: "items",
      header: "Item",
      align: "right",
      value: (r) => ((r.purchase_order_items as Item[]) ?? []).length,
    },
    {
      key: "received",
      header: "Diterima",
      align: "right",
      value: (r) => {
        const items = (r.purchase_order_items as Item[]) ?? [];
        const qty = items.reduce((s, i) => s + num(i.qty), 0);
        const rec = items.reduce((s, i) => s + num(i.received_qty), 0);
        return qty ? Math.round((rec / qty) * 100) : 0;
      },
      render: (r) => {
        const items = (r.purchase_order_items as Item[]) ?? [];
        const qty = items.reduce((s, i) => s + num(i.qty), 0);
        const rec = items.reduce((s, i) => s + num(i.received_qty), 0);
        return `${qty ? Math.round((rec / qty) * 100) : 0}%`;
      },
    },
    {
      key: "total_amount",
      header: "Nilai PO",
      align: "right",
      value: (r) => num(r.total_amount),
      render: (r) => formatCurrency(num(r.total_amount)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "po_number", label: "Nomor PO", required: true },
    { name: "supplier_id", label: "Supplier", type: "select", required: true, options: toOptions(suppliers as Row[], ["code", "name"]) },
    { name: "plant_id", label: "Plant", type: "select", options: toOptions(plants as Row[], ["name"]) },
    { name: "order_date", label: "Tanggal Order", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "expected_date", label: "Estimasi Kedatangan", type: "date" },
    { name: "total_amount", label: "Nilai Total", type: "number", defaultValue: 0 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: selectOptions(["Draft", "Menunggu Approval", "Disetujui", "Sebagian Diterima", "Selesai", "Dibatalkan"]),
      defaultValue: "Draft",
    },
  ];

  return (
    <CrudPage<Row>
      title="Purchase Order"
      description="Pesanan pembelian material beserta status approval dan penerimaan barang."
      table="purchase_orders"
      invalidateKeys={[["purchase_orders"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="purchase-order"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total PO" value={rows.length} tone="primary" />
        <KpiCard label="PO Berjalan" value={open} tone={open ? "warning" : "success"} />
        <KpiCard label="Nilai Pembelian" value={formatCurrency(totalValue)} tone="info" />
      </div>
    </CrudPage>
  );
}
