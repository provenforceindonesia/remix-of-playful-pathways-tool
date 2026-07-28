import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { materialsQuery, reservationsQuery, warehousesQuery, workOrdersQuery } from "@/lib/queries";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inventory/reservation")({
  head: () => ({
    meta: [
      { title: "Stock Reservation — MANUFACTUREIQ" },
      { name: "description", content: "Pemesanan stok material untuk work order agar kebutuhan produksi terjamin." },
      { property: "og:title", content: "Stock Reservation — MANUFACTUREIQ" },
      { property: "og:description", content: "Alokasi material untuk work order aktif." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservationPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function ReservationPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(reservationsQuery);
  const { data: materials } = useQuery(materialsQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const { data: warehouses } = useQuery(warehousesQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["INVENTORY", "PPIC", "SYSADMIN"].includes(role ?? "");

  const active = rows.filter((r) => r.status === "Reserved");
  const totalQty = active.reduce((s, r) => s + num(r.qty), 0);

  const columns: Column<Row>[] = [
    { key: "created_at", header: "Dibuat", render: (r) => formatDateTime(r.created_at as string) },
    { key: "wo", header: "Work Order", value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-" },
    { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
    { key: "qty", header: "Qty", align: "right", value: (r) => num(r.qty), render: (r) => formatNumber(num(r.qty), 2) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "work_order_id", label: "Work Order", type: "select", options: toOptions(wos as Row[], ["wo_number"]) },
    { name: "material_id", label: "Material", type: "select", required: true, options: toOptions(materials as Row[], ["code", "name"]) },
    { name: "warehouse_id", label: "Gudang", type: "select", options: toOptions(warehouses as Row[], ["code", "name"]) },
    { name: "qty", label: "Qty Reservasi", type: "number", step: "0.01", required: true, defaultValue: 0 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: selectOptions(["Reserved", "Issued", "Released"]),
      defaultValue: "Reserved",
    },
  ];

  return (
    <CrudPage<Row>
      title="Stock Reservation"
      description="Kunci stok material untuk work order agar tidak terpakai oleh order lain."
      table="stock_reservations"
      invalidateKeys={[["stock_reservations"], ["stock_balances"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="stock-reservation"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Reservasi" value={rows.length} tone="primary" />
        <KpiCard label="Aktif (Reserved)" value={active.length} tone="warning" />
        <KpiCard label="Qty Terkunci" value={formatNumber(totalQty, 2)} tone="info" />
      </div>
    </CrudPage>
  );
}
