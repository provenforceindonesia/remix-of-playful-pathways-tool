import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { CrudPage, toOptions, type CrudField, type CrudRow } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productsQuery, uomQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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
type DraftVariant = { key: string; id?: string; code: string; name: string };

function VariantEditor({
  items,
  onChange,
}: {
  items: DraftVariant[];
  onChange: (next: DraftVariant[]) => void;
}) {
  const list = items.length ? items : [{ key: "0", code: "", name: "" }];
  const patch = (key: string, values: Partial<DraftVariant>) =>
    onChange(list.map((i) => (i.key === key ? { ...i, ...values } : i)));

  return (
    <div className="space-y-3 rounded-[0.5rem] border border-border/60 p-3">
      {list.map((item, idx) => (
        <div key={item.key} className="grid gap-2 sm:grid-cols-12">
          <div className="sm:col-span-4">
            {idx === 0 ? <Label className="mb-1 block text-xs">Kode Varian</Label> : null}
            <Input
              placeholder="VAR-01"
              value={item.code}
              onChange={(e) => patch(item.key, { code: e.target.value })}
            />
          </div>
          <div className="sm:col-span-7">
            {idx === 0 ? <Label className="mb-1 block text-xs">Nama Varian</Label> : null}
            <Input
              placeholder="Nama varian"
              value={item.name}
              onChange={(e) => patch(item.key, { name: e.target.value })}
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 text-destructive hover:text-destructive"
              onClick={() => onChange(list.filter((i) => i.key !== item.key))}
              disabled={list.length === 1}
              title="Hapus varian"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...list, { key: String(Date.now()), code: "", name: "" }])}
      >
        <Plus className="size-4" /> Tambah Varian
      </Button>
    </div>
  );
}

async function syncVariants(productId: string, drafts: DraftVariant[]) {
  const valid = drafts.filter((d) => d.name.trim() || d.code.trim());
  const keepIds = valid.filter((d) => d.id).map((d) => d.id as string);

  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const toDelete = ((existing ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !keepIds.includes(id));
  if (toDelete.length) {
    await supabase.from("product_variants").delete().in("id", toDelete);
  }

  for (const v of valid) {
    const payload = {
      product_id: productId,
      code: v.code.trim() || v.name.trim(),
      name: v.name.trim() || v.code.trim(),
    };
    if (v.id) {
      await supabase.from("product_variants").update(payload).eq("id", v.id);
    } else {
      await supabase.from("product_variants").insert(payload);
    }
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
