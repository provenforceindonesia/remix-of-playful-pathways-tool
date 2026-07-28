import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, selectOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { customersQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sales/customers")({
  head: () => ({
    meta: [
      { title: "Master Customer — MANUFACTUREIQ" },
      { name: "description", content: "Kelola data pelanggan, kontak, dan termin pembayaran." },
      { property: "og:title", content: "Master Customer — MANUFACTUREIQ" },
      { property: "og:description", content: "Kelola data pelanggan dan termin pembayaran." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

type Row = Record<string, unknown>;

function CustomersPage() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery(customersQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["SALES", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "code", header: "Kode" },
    { key: "name", header: "Nama Customer" },
    { key: "contact_person", header: "PIC" },
    { key: "phone", header: "Telepon" },
    { key: "email", header: "Email" },
    {
      key: "payment_term_days",
      header: "Termin (hari)",
      align: "right",
    },
    {
      key: "is_active",
      header: "Status",
      render: (r) => <StatusBadge status={r.is_active ? "Aktif" : "Nonaktif"} />,
    },
    { key: "created_at", header: "Dibuat", render: (r) => formatDate(r.created_at as string) },
  ];

  const fields: CrudField[] = [
    { name: "code", label: "Kode Customer", required: true },
    { name: "name", label: "Nama Customer", required: true },
    { name: "contact_person", label: "Contact Person" },
    { name: "phone", label: "Telepon" },
    { name: "email", label: "Email" },
    { name: "payment_term_days", label: "Termin Pembayaran (hari)", type: "number", defaultValue: 30 },
    { name: "address", label: "Alamat", type: "textarea", full: true },
    { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
  ];

  return (
    <CrudPage<Row>
      title="Master Customer"
      description="Data pelanggan yang menjadi sumber customer order."
      table="customers"
      invalidateKeys={[["customers"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="master-customer"
    />
  );
}

