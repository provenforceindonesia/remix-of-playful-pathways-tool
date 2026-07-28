import { Layers, Wallet } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import {
  materialReceiptsQuery,
  materialsQuery,
  suppliersQuery,
  warehousesQuery,
} from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inventory/receipt")({
  head: () => ({
    meta: [
      { title: "Penerimaan Material — MANUFACTUREIQ" },
      { name: "description", content: "Catat penerimaan material dari supplier ke gudang." },
      { property: "og:title", content: "Penerimaan Material — MANUFACTUREIQ" },
      { property: "og:description", content: "Input dan riwayat penerimaan barang gudang." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReceiptPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function ReceiptPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(materialReceiptsQuery);
  const { data: materials } = useQuery(materialsQuery);
  const { data: suppliers } = useQuery(suppliersQuery);
  const { data: warehouses } = useQuery(warehousesQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["INVENTORY", "SYSADMIN"].includes(role ?? "");

  const totalValue = rows.reduce((s, r) => s + num(r.qty) * num(r.unit_cost), 0);

  const columns: Column<Row>[] = [
    { key: "receipt_no", header: "No. Terima" },
    { key: "receipt_date", header: "Tanggal", render: (r) => formatDate(r.receipt_date as string) },
    { key: "supplier", header: "Supplier", value: (r) => (r.suppliers as { name?: string } | null)?.name ?? "-" },
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "warehouse", header: "Gudang", value: (r) => (r.warehouses as { code?: string } | null)?.code ?? "-" },
    { key: "qty", header: "Qty", align: "right", render: (r) => formatNumber(num(r.qty), 2) },
    { key: "unit_cost", header: "Harga Satuan", align: "right", render: (r) => formatCurrency(num(r.unit_cost)) },
    {
      key: "total",
      header: "Nilai",
      align: "right",
      value: (r) => num(r.qty) * num(r.unit_cost),
      render: (r) => formatCurrency(num(r.qty) * num(r.unit_cost)),
    },
    { key: "note", header: "Catatan" },
  ];

  const fields: CrudField[] = [
    { name: "receipt_no", label: "No. Penerimaan", required: true },
    { name: "receipt_date", label: "Tanggal", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "supplier_id", label: "Supplier", type: "select", options: toOptions(suppliers as Row[], ["code", "name"]) },
    { name: "warehouse_id", label: "Gudang", type: "select", options: toOptions(warehouses as Row[], ["code", "name"]) },
    { name: "material_id", label: "Material", type: "select", required: true, options: toOptions(materials as Row[], ["code", "name"]) },
    { name: "qty", label: "Qty", type: "number", step: "0.01", required: true },
    { name: "unit_cost", label: "Harga Satuan", type: "number", step: "0.01", defaultValue: 0 },
    { name: "note", label: "Catatan", type: "textarea", full: true },
  ];

  return (
    <CrudPage<Row>
      title="Penerimaan Material"
      description="Setiap penerimaan menambah saldo stok gudang tujuan."
      table="material_receipts"
      invalidateKeys={[["material_receipts"], ["stock_balances"], ["stock_ledger"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="penerimaan-material"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
      toolbar={
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard icon={<Layers className="size-4" />} label="Total Transaksi" value={rows.length} tone="primary" />
          <KpiCard icon={<Wallet className="size-4" />} label="Nilai Penerimaan" value={formatCurrency(totalValue)} tone="success" />
        </div>
      }
    />
  );
}
