import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { productsQuery, uomQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/master/products")({
  head: () => ({
    meta: [
      { title: "Product Catalog — MANUFACTUREIQ" },
      { name: "description", content: "Katalog produk, varian, satuan, dan nilai jual standar." },
      { property: "og:title", content: "Product Catalog — MANUFACTUREIQ" },
      { property: "og:description", content: "Katalog produk dan varian manufaktur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

type Row = Record<string, unknown>;

function ProductsPage() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery(productsQuery);
  const { data: uoms } = useQuery(uomQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "PPIC", "SYSADMIN"].includes(role ?? "");

  const columns: Column<Row>[] = [
    { key: "code", header: "Kode" },
    { key: "name", header: "Nama Produk" },
    { key: "category", header: "Kategori" },
    {
      key: "uom",
      header: "UoM",
      value: (r) => (r.units_of_measure as { code?: string } | null)?.code ?? "-",
    },
    {
      key: "variants",
      header: "Varian",
      align: "right",
      value: (r) => ((r.product_variants as unknown[]) ?? []).length,
    },
    {
      key: "standard_selling_value",
      header: "Nilai Jual Standar",
      align: "right",
      value: (r) => Number(r.standard_selling_value ?? 0),
      render: (r) => formatCurrency(Number(r.standard_selling_value ?? 0)),
    },
    {
      key: "is_active",
      header: "Status",
      render: (r) => <StatusBadge status={r.is_active ? "Aktif" : "Nonaktif"} />,
    },
  ];

  const fields: CrudField[] = [
    { name: "code", label: "Kode Produk", required: true },
    { name: "name", label: "Nama Produk", required: true },
    { name: "category", label: "Kategori" },
    {
      name: "base_uom_id",
      label: "Satuan Dasar",
      type: "select",
      options: toOptions(uoms as Row[], ["code", "name"]),
    },
    { name: "standard_selling_value", label: "Nilai Jual Standar", type: "number", defaultValue: 0 },
    { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
  ];

  return (
    <CrudPage<Row>
      title="Product Catalog"
      description="Master produk beserta satuan dasar dan nilai jual standar."
      table="products"
      invalidateKeys={[["products"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="product-catalog"
    />
  );
}
