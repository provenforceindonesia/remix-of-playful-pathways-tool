import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField, type CrudRow } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { productsQuery, uomQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/master/products")({
  head: () => ({
    meta: [
      { title: "Produk & Varian — MANUFACTUREIQ" },
      { name: "description", content: "Katalog produk, varian, satuan, dan nilai jual standar." },
      { property: "og:title", content: "Produk & Varian — MANUFACTUREIQ" },
      { property: "og:description", content: "Katalog produk dan varian manufaktur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

type Row = Record<string, unknown>;

async function syncVariant(productId: string, name: string) {
  const label = name.trim();
  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  const rows = (existing ?? []) as { id: string }[];

  if (!label) {
    if (rows.length) {
      await supabase
        .from("product_variants")
        .delete()
        .in("id", rows.map((r) => r.id));
    }
    return;
  }

  if (rows.length) {
    await supabase.from("product_variants").update({ code: label, name: label }).eq("id", rows[0].id);
    const extra = rows.slice(1).map((r) => r.id);
    if (extra.length) await supabase.from("product_variants").delete().in("id", extra);
  } else {
    await supabase.from("product_variants").insert({ product_id: productId, code: label, name: label });
  }
}


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
    {
      name: "code",
      label: "Kode Produk (otomatis)",
      editOnly: true,
      readOnly: true,
      placeholder: "Dibuat otomatis oleh sistem",
    },
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
    {
      name: "__variants",
      label: "Varian Produk",
      type: "custom",
      full: true,
      virtual: true,
      defaultValue: [] as DraftVariant[],
      render: ({ value, setValue }) => (
        <VariantEditor
          items={(value as DraftVariant[]) ?? []}
          onChange={(next) => setValue(next)}
        />
      ),
    },
  ];

  return (
    <CrudPage<Row>
      title="Product Catalog"
      description="Master produk beserta varian, satuan dasar, dan nilai jual standar. Kode produk dibuat otomatis mengikuti format di Master Configuration."
      table="products"
      invalidateKeys={[["products"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="product-catalog"
      toRowValues={(row) => ({
        ...row,
        __variants: (((row.product_variants as Row[]) ?? []) as Row[]).map((v) => ({
          key: String(v.id),
          id: String(v.id),
          code: String(v.code ?? ""),
          name: String(v.name ?? ""),
        })),
      })}
      afterCreate={async (created: CrudRow, values) =>
        syncVariants(String(created.id), (values.__variants as DraftVariant[]) ?? [])
      }
      afterUpdate={async (updated: CrudRow, values) =>
        syncVariants(String(updated.id), (values.__variants as DraftVariant[]) ?? [])
      }
    />
  );
}
