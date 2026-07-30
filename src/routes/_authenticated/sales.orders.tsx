import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  CalendarRange,
  CircleDollarSign,
  Eye,
  LineChart,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
  Undo2,
} from "lucide-react";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  customersQuery,
  plantsQuery,
  productionPlansQuery,
  productsQuery,
  salesOrdersQuery,
  settingsQuery,
  uomQuery,
} from "@/lib/queries";
import { formatCurrency, formatDate, formatFullDateTime, formatNumber, formatPercent, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";


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
  units_of_measure?: { code?: string } | null;
};

const uomCodes = (r: Row) =>
  ((r.sales_order_items as Item[]) ?? [])
    .map((i) => i.units_of_measure?.code ?? "-")
    .filter(Boolean)
    .join(", ");

type DraftItem = {
  key: string;
  product_id: string;
  variant_id: string;
  uom_id: string;
  quantity: string;
  unit_price: string;
};

function OrderItemsEditor({
  items,
  onChange,
  products,
  uoms,
}: {
  items: DraftItem[];
  onChange: (next: DraftItem[]) => void;
  products: Row[];
  uoms: Row[];
}) {
  const list = items.length
    ? items
    : [{ key: "0", product_id: "", variant_id: "", uom_id: "", quantity: "", unit_price: "" }];

  const patch = (key: string, values: Partial<DraftItem>) =>
    onChange(list.map((i) => (i.key === key ? { ...i, ...values } : i)));

  const addRow = () =>
    onChange([
      ...list,
      {
        key: String(Date.now()),
        product_id: "",
        variant_id: "",
        uom_id: "",
        quantity: "",
        unit_price: "",
      },
    ]);

  const removeRow = (key: string) => onChange(list.filter((i) => i.key !== key));

  const total = list.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0),
    0,
  );

  return (
    <div className="space-y-3 rounded-[0.5rem] border border-border/60 p-3">
      {list.map((item, idx) => {
        const product = products.find((p) => String(p.id) === item.product_id);
        const variants = (product?.product_variants as Row[]) ?? [];
        return (
          <div key={item.key} className="grid gap-2 sm:grid-cols-12">
            <div className="sm:col-span-4">
              {idx === 0 ? <Label className="mb-1 block text-xs">Produk</Label> : null}
              <Select
                value={item.product_id}
                onValueChange={(val) => {
                  const p = products.find((r) => String(r.id) === val);
                  const vs = (p?.product_variants as Row[]) ?? [];
                  patch(item.key, {
                    product_id: val,
                    variant_id: vs.length ? String(vs[0].id) : "",
                    uom_id: p?.base_uom_id ? String(p.base_uom_id) : "",
                    unit_price: String(p?.standard_selling_value ?? ""),
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {[p.code, p.name].filter(Boolean).join(" — ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              {idx === 0 ? <Label className="mb-1 block text-xs">Varian</Label> : null}
              <Input
                readOnly
                tabIndex={-1}
                placeholder={item.product_id ? "Tidak ada varian" : "Otomatis dari produk"}
                value={(() => {
                  const v = variants.find((r) => String(r.id) === item.variant_id);
                  return v ? [v.code, v.name].filter(Boolean).join(" — ") : "";
                })()}
              />
            </div>
            <div className="sm:col-span-2">
              {idx === 0 ? <Label className="mb-1 block text-xs">Qty</Label> : null}
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={item.quantity}
                onChange={(e) => patch(item.key, { quantity: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              {idx === 0 ? <Label className="mb-1 block text-xs">Satuan</Label> : null}
              <Select value={item.uom_id} onValueChange={(val) => patch(item.key, { uom_id: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="UoM" />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {[u.code, u.name].filter(Boolean).join(" — ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:text-destructive"
                onClick={() => removeRow(item.key)}
                disabled={list.length === 1}
                title="Hapus item"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Tambah Item
        </Button>
        <span className="font-mono text-sm text-muted-foreground">
          Total: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

const soValue = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
    0,
  );

function SalesOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const { data: customers } = useQuery(customersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: uoms } = useQuery(uomQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: plans } = useQuery(productionPlansQuery);

  const rows = (data ?? []) as Row[];
  const canWrite = ["SALES", "SYSADMIN"].includes(role ?? "");
  const [detail, setDetail] = useState<Row | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    row: Row;
    mode: "cancel" | "request" | "withdraw-request";
  } | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  const hasPlan = (row: Row) =>
    ((plans ?? []) as Row[]).some((p) => String(p.sales_order_id ?? "") === String(row.id));

  const detailRow = useMemo(
    () => rows.find((r) => String(r.id) === String(detail?.id ?? "")) ?? detail,
    [rows, detail],
  );

  const actor = {
    id: profile?.id ?? null,
    username: profile?.username ?? null,
    role: role ?? null,
    plant_id: profile?.plant_id ?? null,
  };

  const submit = useMutation({
    mutationFn: async (row: Row) => {
      const from = String(row.status ?? "");
      const { error } = await supabase
        .from("sales_orders")
        .update({
          status: "Menunggu Review Produksi",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);
      await recordAudit(actor, {
        entity: "sales_orders",
        recordId: String(row.id),
        action: from === "Perlu Revisi" ? "Kirim Ulang" : "Kirim ke Production Control",
        fromStatus: from,
        toStatus: "Menunggu Review Produksi",
        after: { so_number: row.so_number },
      });
    },
    onSuccess: (_d, row) => {
      toast.success(`SO ${String(row.so_number ?? "")} dikirim untuk review produksi`, {
        description: "Status berubah menjadi Menunggu Review Produksi.",
      });
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error("Gagal mengirim order", { description: e.message }),
  });

  const withdraw = useMutation({
    mutationFn: async (row: Row) => {
      const from = String(row.status ?? "");
      const { error } = await supabase
        .from("sales_orders")
        .update({ status: "Draft", submitted_at: null })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);
      await recordAudit(actor, {
        entity: "sales_orders",
        recordId: String(row.id),
        action: "Tarik Kembali",
        fromStatus: from,
        toStatus: "Draft",
        after: { so_number: row.so_number },
      });
    },
    onSuccess: (_d, row) => {
      toast.success(`SO ${String(row.so_number ?? "")} ditarik kembali ke Draft`, {
        description: "Order dapat diubah kembali sebelum dikirim ulang.",
      });
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error("Gagal menarik order", { description: e.message }),
  });

  const cancelAction = useMutation({
    mutationFn: async () => {
      if (!cancelTarget) return;
      const { row, mode } = cancelTarget;
      const from = String(row.status ?? "");
      const note = cancelNote.trim();

      let to = "Dibatalkan";
      let action = "Batalkan SO";

      if (mode === "request") {
        to = "Menunggu Persetujuan Pembatalan";
        action = hasPlan(row) && from === "Dikonfirmasi"
          ? "Ajukan Pembatalan"
          : "Ajukan Pembatalan Sisa Order";
      } else if (mode === "withdraw-request") {
        action = "Batalkan Pengajuan Pembatalan";
        const { data: hist } = await supabase
          .from("approval_history")
          .select("from_status,action,created_at")
          .eq("entity", "sales_orders")
          .eq("record_id", String(row.id))
          .order("created_at", { ascending: false })
          .limit(10);
        const prev = ((hist ?? []) as Array<{ action?: string; from_status?: string }>).find(
          (h) => String(h.action ?? "").startsWith("Ajukan Pembatalan"),
        )?.from_status;
        to = prev && prev !== "Menunggu Persetujuan Pembatalan" ? prev : "Dikonfirmasi";
      }

      const { error } = await supabase
        .from("sales_orders")
        .update({ status: to, revision_note: note || (row.revision_note as string | null) || null })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);

      await recordAudit(actor, {
        entity: "sales_orders",
        recordId: String(row.id),
        action,
        fromStatus: from,
        toStatus: to,
        note: note || null,
        after: { so_number: row.so_number, status: to },
      });
      return { action, to };
    },
    onSuccess: (res) => {
      const so = String(cancelTarget?.row.so_number ?? "");
      toast.success(`${res?.action ?? "Aksi"} — SO ${so}`, {
        description: `Status order kini ${res?.to ?? "-"}.`,
      });
      setCancelTarget(null);
      setCancelNote("");
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error("Aksi pembatalan gagal", { description: e.message }),
  });

  const openCancel = (row: Row, mode: "cancel" | "request" | "withdraw-request") => {
    setCancelNote("");
    setCancelTarget({ row, mode });
  };


  const columns: Column<Row>[] = [
    { key: "so_number", header: "No. SO" },
    {
      key: "customer",
      header: "Customer",
      value: (r) => (r.customers as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "product",
      header: "Produk",
      value: (r) =>
        ((r.sales_order_items as Item[]) ?? [])
          .map((i) => i.products?.name ?? "-")
          .filter(Boolean)
          .join(", "),
      render: (r) => (
        <span className="truncate">
          {((r.sales_order_items as Item[]) ?? [])
            .map((i) => i.products?.name ?? "-")
            .filter(Boolean)
            .join(", ") || "-"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      value: (r) =>
        ((r.sales_order_items as Item[]) ?? []).reduce(
          (s, i) => s + Number(i.quantity ?? 0),
          0,
        ),
      render: (r) =>
        formatNumber(
          ((r.sales_order_items as Item[]) ?? []).reduce(
            (s, i) => s + Number(i.quantity ?? 0),
            0,
          ),
        ),
    },
    {
      key: "uom",
      header: "Satuan",
      value: uomCodes,
      render: (r) => <span className="truncate">{uomCodes(r) || "-"}</span>,
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
      key: "created_at",
      header: "Dibuat tgl",
      render: (r) => formatFullDateTime(r.created_at as string),
    },
    {
      key: "approved_at",
      header: "Dikonfirmasi tgl",
      render: (r) => formatFullDateTime(r.approved_at as string),
    },
    {
      key: "progress_pct",
      header: "Progress",
      value: (r) => Number(r.progress_pct ?? 0),
      render: (r) => (
        <div className="flex items-center gap-2">
          <Progress value={Number(r.progress_pct ?? 0)} className="h-1.5 w-20" />
          <span className="whitespace-nowrap">{formatPercent(Number(r.progress_pct ?? 0))}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r.status ?? "-")} />,
    },
  ];

  const productRows = (products ?? []) as Row[];
  const uomRows = (uoms ?? []) as Row[];

  const nextSoPreview = useMemo(() => {
    const cfg =
      (((settings ?? []) as Row[]).find((s) => s.key === "so_number_format")?.value as
        | Record<string, unknown>
        | undefined) ?? {};
    const prefix = String(cfg.prefix ?? "SO");
    const sep = String(cfg.separator ?? "-");
    const pad = Math.max(Number(cfg.padding ?? 4) || 4, 1);
    const now = new Date();
    const datePart =
      String(cfg.date_pattern ?? "YYMM") === ""
        ? ""
        : `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const last = rows.reduce((max, r) => {
      const n = Number(String(r.so_number ?? "").split(sep).pop());
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    return `${prefix}${datePart ? sep + datePart : ""}${sep}${String(last + 1).padStart(pad, "0")}`;
  }, [settings, rows]);

  const fields: CrudField[] = [
    {
      name: "so_number",
      label: "Nomor SO (otomatis)",
      readOnly: true,
      virtual: true,
      defaultValue: nextSoPreview,
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
      name: "priority",
      label: "Prioritas",
      type: "select",
      defaultValue: "Normal",
      options: ["Urgent", "Tinggi", "Normal", "Rendah"].map((v) => ({ value: v, label: v })),
    },
    {
      name: "__items",
      label: "Item Produk",
      type: "custom",
      virtual: true,
      createOnly: true,
      full: true,
      defaultValue: [] as DraftItem[],
      render: ({ value, setValue }) => (
        <OrderItemsEditor
          items={(value as DraftItem[]) ?? []}
          onChange={(next) => setValue(next)}
          products={productRows}
          uoms={uomRows}
        />
      ),
    },

    { name: "plant_id", label: "Plant", type: "select", editOnly: true, options: toOptions(plants as Row[], ["name"]) },
    { name: "order_date", label: "Tanggal Order", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "required_date", label: "Tanggal Dibutuhkan", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      editOnly: true,
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


  const monthly = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = rows.filter((r) => String(r.order_date ?? "").startsWith(ym));
    return {
      count: inMonth.length,
      value: inMonth.reduce((s, r) => s + soValue(r), 0),
    };
  }, [rows]);

  return (
    <>
      <CrudPage<Row>
        title="Customer Order"
        description="Order pelanggan menjadi sumber perencanaan produksi. Tambahkan satu atau beberapa item produk pada order."
        table="sales_orders"
        invalidateKeys={[["sales_orders"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={fields}
        canWrite={canWrite}
        canDelete={canWrite}
        softDelete
        createInToolbar
        exportable={false}
        beforePayload={(v) => ({ ...v, status: v.status || "Draft", created_by: profile?.id ?? null })}
        afterCreate={async (created, values) => {
          const items = ((values.__items as DraftItem[]) ?? []).filter(
            (i) => i.product_id && Number(i.quantity) > 0,
          );
          if (!created.id) return;
          if (!items.length) throw new Error("Tambahkan minimal satu item produk");
          const payload = items.map((i) => {
            const product = productRows.find((r) => String(r.id) === i.product_id);
            return {
              sales_order_id: String(created.id),
              product_id: i.product_id,
              variant_id: i.variant_id || null,
              uom_id: i.uom_id || null,
              quantity: Number(i.quantity),
              unit_price: Number(
                i.unit_price !== "" && i.unit_price !== undefined
                  ? i.unit_price
                  : (product?.standard_selling_value ?? 0),
              ),
            };
          });
          const { error } = await supabase.from("sales_order_items").insert(payload);
          if (error) throw new Error(error.message);
        }}
        rowCanEdit={(row) => ["Draft", "Perlu Revisi"].includes(String(row.status ?? ""))}
        rowCanDelete={(row) => String(row.status ?? "") === "Draft"}
        rowActions={(row) => {
          const status = String(row.status ?? "");
          const planned = hasPlan(row);
          const canDirectCancel =
            ["Menunggu Review Produksi", "Perlu Revisi"].includes(status) ||
            (status === "Dikonfirmasi" && !planned);
          const canRequestCancel =
            (status === "Dikonfirmasi" && planned) ||
            ["Direncanakan", "Dalam Produksi", "Sebagian Terpenuhi", "Terlambat"].includes(status);
          const canSeeProgress =
            (status === "Dikonfirmasi" && planned) ||
            ["Direncanakan", "Dalam Produksi", "Sebagian Terpenuhi", "Terlambat"].includes(status);
          const iconBtn = (
            key: string,
            title: string,
            icon: React.ReactNode,
            onClick: () => void,
            danger = false,
          ) => (
            <Button
              key={key}
              variant="ghost"
              size="icon"
              className={danger ? "size-8 text-destructive hover:text-destructive" : "size-8"}
              title={title}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {icon}
            </Button>
          );

          return (
            <>
              {iconBtn("detail", "Detail SO", <Eye className="size-4" />, () => setDetail(row))}
              {canWrite && status === "Draft"
                ? iconBtn("send", "Kirim ke Production Control", <Send className="size-4" />, () =>
                    submit.mutate(row),
                  )
                : null}
              {canWrite && status === "Perlu Revisi"
                ? iconBtn("resend", "Kirim Ulang", <Send className="size-4" />, () =>
                    submit.mutate(row),
                  )
                : null}
              {canWrite && status === "Menunggu Review Produksi"
                ? iconBtn("withdraw", "Tarik Kembali", <Undo2 className="size-4" />, () =>
                    withdraw.mutate(row),
                  )
                : null}
              {canSeeProgress
                ? iconBtn("progress", "Lihat Progress", <LineChart className="size-4" />, () =>
                    void navigate({ to: "/sales/tracking" }),
                  )
                : null}
              {canWrite && canDirectCancel
                ? iconBtn(
                    "cancel",
                    "Batalkan SO",
                    <Ban className="size-4" />,
                    () => openCancel(row, "cancel"),
                    true,
                  )
                : null}
              {canWrite && canRequestCancel
                ? iconBtn(
                    "request-cancel",
                    status === "Dikonfirmasi"
                      ? "Ajukan Pembatalan"
                      : "Ajukan Pembatalan Sisa Order",
                    <ShieldAlert className="size-4" />,
                    () => openCancel(row, "request"),
                    true,
                  )
                : null}
              {canWrite && status === "Menunggu Persetujuan Pembatalan"
                ? iconBtn(
                    "withdraw-cancel",
                    "Batalkan Pengajuan Pembatalan",
                    <RotateCcw className="size-4" />,
                    () => openCancel(row, "withdraw-request"),
                  )
                : null}

            </>
          );
        }}

      >
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <KpiCard
            icon={<CalendarRange className="size-4" />}
            label="Total Order Bulan Ini"
            value={monthly.count}
            tone="primary"
          />
          <KpiCard
            icon={<CircleDollarSign className="size-4" />}
            label="Total Nilai Order Bulan Ini"
            value={formatCurrency(monthly.value)}
            tone="success"
          />
        </div>
      </CrudPage>

      <SalesOrderDetailDialog order={detailRow ?? null} onClose={() => setDetail(null)} />

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cancelTarget?.mode === "cancel"
                ? "Batalkan Sales Order"
                : cancelTarget?.mode === "request"
                  ? "Ajukan Pembatalan"
                  : "Batalkan Pengajuan Pembatalan"}
            </DialogTitle>
            <DialogDescription>
              {cancelTarget?.mode === "cancel"
                ? "Order belum masuk produksi sehingga dapat langsung dibatalkan."
                : cancelTarget?.mode === "request"
                  ? "Order sudah direncanakan/diproduksi. Pengajuan akan menunggu persetujuan Production Control."
                  : "Pengajuan pembatalan akan ditarik dan order kembali ke status sebelumnya."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {String(cancelTarget?.row.so_number ?? "-")} ·{" "}
                {(cancelTarget?.row.customers as { name?: string } | null)?.name ?? "-"}
              </p>
              <p className="text-muted-foreground">
                Status saat ini: {String(cancelTarget?.row.status ?? "-")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                Alasan {cancelTarget?.mode === "withdraw-request" ? "(Opsional)" : ""}
                {cancelTarget?.mode !== "withdraw-request" ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </Label>
              <Textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={3}
                className="bg-surface text-foreground placeholder:text-muted-foreground"
                placeholder="Tuliskan alasan pembatalan"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Batal
            </Button>
            <Button
              variant={cancelTarget?.mode === "withdraw-request" ? "default" : "destructive"}
              disabled={
                cancelAction.isPending ||
                (cancelTarget?.mode !== "withdraw-request" && !cancelNote.trim())
              }
              onClick={() => cancelAction.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
