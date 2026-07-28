import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { suppliersQuery } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/procurement/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Management — MANUFACTUREIQ" },
      { name: "description", content: "Kelola supplier material, lead time, dan rating performa." },
      { property: "og:title", content: "Supplier Management — MANUFACTUREIQ" },
      { property: "og:description", content: "Manajemen supplier dan performa pengiriman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

type Row = Record<string, unknown>;

function SuppliersPage() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery(suppliersQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["INVENTORY", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "code", header: "Kode" },
    { key: "name", header: "Nama Supplier" },
    { key: "contact_person", header: "PIC" },
    { key: "phone", header: "Telepon" },
    { key: "lead_time_days", header: "Lead Time (hari)", align: "right" },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      render: (r) => formatNumber(Number(r.rating ?? 0), 1),
    },
    {
      key: "is_active",
      header: "Status",
      render: (r) => <StatusBadge status={r.is_active ? "Aktif" : "Nonaktif"} />,
    },
  ];

  const fields: CrudField[] = [
    { name: "code", label: "Kode Supplier", required: true },
    { name: "name", label: "Nama Supplier", required: true },
    { name: "contact_person", label: "Contact Person" },
    { name: "phone", label: "Telepon" },
    { name: "email", label: "Email" },
    { name: "lead_time_days", label: "Lead Time (hari)", type: "number", defaultValue: 7 },
    { name: "rating", label: "Rating (0-5)", type: "number", defaultValue: 4 },
    { name: "address", label: "Alamat", type: "textarea", full: true },
    { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
  ];

  return (
    <CrudPage<Row>
      title="Supplier Management"
      description="Data supplier material beserta lead time dan rating."
      table="suppliers"
      invalidateKeys={[["suppliers"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="supplier"
    />
  );
}
