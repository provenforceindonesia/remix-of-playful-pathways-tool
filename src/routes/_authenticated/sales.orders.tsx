import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Send, Trash2 } from "lucide-react";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery, plantsQuery, productsQuery, salesOrdersQuery, uomQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber, formatPercent, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sales/orders")({
  head: () => ({
    meta: [
      { title: "Customer Order — MANUFACTUREIQ" },
      { name: "description", content: "Buat dan kelola customer order beserta item produk dan status pemenuhan." },
      { property: "og:title", content: "Customer Order — MANUFACTUREIQ" },
      { property: "og:description", content: "Manajemen customer order end-to-end." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesOrdersPage,
});

type Row = Record<string, unknown>;
type Item = {
  id: string;
  quantity: number;
  unit_price: number;
  fulfilled_qty: number;
  products?: { code?: string; name?: string } | null;
};

const soValue = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
    0,
  );

function SalesOrdersPage() {
  const qc = useQueryClient();
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const { data: customers } = useQuery(customersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: uoms } = useQuery(uomQuery);

  const rows = (data ?? []) as Row[];
  const canWrite = ["SALES", "SYSADMIN"].includes(role ?? "");
  const [detail, setDetail] = useState<Row | null>(null);

  const detailRow = useMemo(
    () => rows.find((r) => String(r.id) === String(detail?.id ?? "")) ?? detail,
    [rows, detail],
  );

  const submit = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase
        .from("sales_orders")
        .update({
          status: "Menunggu Review Produksi",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order dikirim untuk review produksi");
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    { key: "so_number", header: "No. SO" },
    {
      key: "customer",
      header: "Customer",
      value: (r) => (r.customers as { name?: string } | null)?.name ?? "-",
    },
    { key: "order_date", header: "Tgl Order", render: (r) => formatDate(r.order_date as string) },
    { key: "required_date", header: "Dibutuhkan", render: (r) => formatDate(r.required_date as string) },
    {
      key: "priority",
      header: "Prioritas",
      render: (r) => <StatusBadge status={String(r.priority ?? "-")} />,
    },
    {
      key: "value",
      header: "Nilai Order",
      align: "right",
      value: soValue,
      render: (r) => formatCurrency(soValue(r)),
    },
    {
      key: "progress_pct",
      header: "Progress",
      align: "right",
      value: (r) => Number(r.progress_pct ?? 0),
      render: (r) => formatPercent(Number(r.progress_pct ?? 0)),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r.status ?? "-")} />,
    },
  ];

  const productRows = (products ?? []) as Row[];
  const uomRows = (uoms ?? []) as Row[];
  const [orderProductId, setOrderProductId] = useState("");

  const variantOptions = useMemo(() => {
    const p = productRows.find((r) => String(r.id) === orderProductId);
    return toOptions((p?.product_variants as Row[]) ?? [], ["code", "name"]);
  }, [productRows, orderProductId]);

  const fields: CrudField[] = [
    {
      name: "so_number",
      label: "Nomor SO (otomatis)",
      editOnly: true,
      readOnlyOnEdit: true,
      placeholder: "Digenerate sistem",
    },
    {
      name: "customer_id",
      label: "Customer",
      type: "select",
      required: true,
      options: toOptions(customers as Row[], ["code", "name"]),
    },
    { name: "customer_po_ref", label: "Referensi PO Customer" },
    {
      name: "product_id",
      label: "Produk",
      type: "select",
      virtual: true,
      createOnly: true,
      required: true,
      placeholder: "Pilih produk",
      options: toOptions(productRows, ["code", "name"]),
    },
    {
      name: "variant_id",
      label: "Varian (mengikuti produk)",
      type: "select",
      virtual: true,
      createOnly: true,
      placeholder: variantOptions.length ? "Pilih varian" : "Tidak ada varian",
      options: variantOptions,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      virtual: true,
      createOnly: true,
      required: true,
      placeholder: "0",
    },
    {
      name: "uom_id",
      label: "Satuan Order (otomatis)",
      type: "select",
      virtual: true,
      createOnly: true,
      options: toOptions(uomRows, ["code", "name"]),
    },
    { name: "plant_id", label: "Plant", type: "select", options: toOptions(plants as Row[], ["name"]) },
    { name: "order_date", label: "Tanggal Order", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "required_date", label: "Tanggal Dibutuhkan", type: "date", required: true },
    {
      name: "priority",
      label: "Prioritas",
      type: "select",
      defaultValue: "Normal",
      options: ["Urgent", "Tinggi", "Normal", "Rendah"].map((v) => ({ value: v, label: v })),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "Draft",
      options: [
        "Draft",
        "Menunggu Review Produksi",
        "Perlu Revisi",
        "Dikonfirmasi",
        "Direncanakan",
        "Dalam Produksi",
        "Sebagian Terpenuhi",
        "Selesai",
        "Terlambat",
        "Dibatalkan",
      ].map((v) => ({ value: v, label: v })),
    },
    { name: "customer_note", label: "Catatan Customer", type: "textarea", full: true },
  ];


  return (
    <>
      <CrudPage<Row>
        title="Customer Order"
        description="Order pelanggan menjadi sumber perencanaan produksi. Produk, varian, qty, dan satuan dibuat sebagai item pertama order."
        table="sales_orders"
        invalidateKeys={[["sales_orders"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={fields}
        canWrite={canWrite}
        canDelete={canWrite}
        softDelete
        exportName="customer-order"
        beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
        onFieldChange={(name, value) => {
          if (name !== "product_id") return;
          const pid = String(value ?? "");
          setOrderProductId(pid);
          const p = productRows.find((r) => String(r.id) === pid);
          const variants = (p?.product_variants as Row[]) ?? [];
          return {
            variant_id: variants.length === 1 ? String(variants[0].id) : "",
            uom_id: p?.base_uom_id ? String(p.base_uom_id) : "",
          };
        }}
        afterCreate={async (created, values) => {
          const productId = String(values.product_id ?? "");
          if (!productId || !created.id) return;
          const product = productRows.find((r) => String(r.id) === productId);
          const { error } = await supabase.from("sales_order_items").insert({
            sales_order_id: String(created.id),
            product_id: productId,
            variant_id: values.variant_id ? String(values.variant_id) : null,
            uom_id: values.uom_id ? String(values.uom_id) : null,
            quantity: Number(values.quantity ?? 0),
            unit_price: Number(product?.standard_selling_value ?? 0),
          });
          if (error) throw new Error(error.message);
        }}
        rowActions={(row) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDetail(row);
              }}
            >
              Item
            </Button>
            {canWrite && row.status === "Draft" ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Kirim untuk review"
                onClick={(e) => {
                  e.stopPropagation();
                  submit.mutate(row);
                }}
              >
                <Send className="size-4" />
              </Button>
            ) : null}
          </>
        )}
      />

      <ItemsDialog
        order={detailRow}
        onClose={() => setDetail(null)}
        products={(products ?? []) as Row[]}
        uoms={(uoms ?? []) as Row[]}
        canWrite={canWrite}
      />
    </>
  );
}

function ItemsDialog({
  order,
  onClose,
  products,
  uoms,
  canWrite,
}: {
  order: Row | null;
  onClose: () => void;
  products: Row[];
  uoms: Row[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [uomId, setUomId] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const items = ((order?.sales_order_items as Item[]) ?? []) as Item[];

  const add = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const { error } = await supabase.from("sales_order_items").insert({
        sales_order_id: String(order.id),
        product_id: productId,
        uom_id: uomId || null,
        quantity: Number(qty || 0),
        unit_price: Number(price || 0),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setProductId("");
      setQty("");
      setPrice("");
      toast.success("Item ditambahkan");
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_order_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Item dihapus");
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(order)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Item Order {String(order?.so_number ?? "")}</DialogTitle>
          <DialogDescription>Rincian produk yang dipesan pelanggan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada item pada order ini.
            </p>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {it.products?.code} — {it.products?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(it.quantity)} × {formatCurrency(it.unit_price)} · terpenuhi{" "}
                    {formatNumber(it.fulfilled_qty)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {formatCurrency(Number(it.quantity) * Number(it.unit_price))}
                  </span>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => del.mutate(it.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {canWrite && (
          <form
            className="grid gap-3 border-t pt-4 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Produk</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {toOptions(products, ["code", "name"]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UoM</Label>
              <Select value={uomId} onValueChange={setUomId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="UoM" />
                </SelectTrigger>
                <SelectContent>
                  {toOptions(uoms, ["code"]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Harga Satuan</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="sm:col-span-5">
              <Button type="submit" disabled={!productId || add.isPending}>
                <Plus className="size-4" /> Tambah Item
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
