import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, AlertTriangle, CalendarRange, Check, CircleDollarSign, Eye, ShieldCheck, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePickerField } from "@/components/common/DatePickerField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { salesOrdersQuery } from "@/lib/queries";
import {
  formatCurrency,
  formatDate,
  formatFullDateTime,
  formatNumber,
  formatPercent,
  toISODate,
} from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { SalesOrderDetailDialog } from "@/components/sales/SalesOrderDetailDialog";

export const Route = createFileRoute("/_authenticated/sales/review")({
  head: () => ({
    meta: [
      { title: "Review Sales Order — MANUFACTUREIQ" },
      { name: "description", content: "Periksa kebutuhan customer dan tetapkan tanggal pemenuhan produksi." },
      { property: "og:title", content: "Review Sales Order — MANUFACTUREIQ" },
      { property: "og:description", content: "Periksa kebutuhan customer dan tetapkan tanggal pemenuhan produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

type Row = Record<string, unknown>;
type Item = {
  quantity: number;
  unit_price: number;
  products?: { name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

const value = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
    0,
  );

const totalQty = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + Number(i.quantity ?? 0),
    0,
  );

const productNames = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[])
    .map((i) => i.products?.name ?? "-")
    .filter(Boolean)
    .join(", ");

const uomCodes = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[])
    .map((i) => i.units_of_measure?.code ?? "-")
    .filter(Boolean)
    .join(", ");

const lateDays = (r: Row, d: Date) => {
  const req = r.required_date ? new Date(String(r.required_date)) : null;
  if (!req || Number.isNaN(req.getTime())) return 0;
  const ms = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
    new Date(req.getFullYear(), req.getMonth(), req.getDate()).getTime();
  return Math.max(0, Math.round(ms / 86400000));
};

function ReviewPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const rows = (data ?? []) as Row[];
  const pending = rows.filter((r) =>
    ["Menunggu Review Produksi", "Perlu Revisi"].includes(String(r.status)),
  );

  const monthly = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = rows.filter((r) => String(r.order_date ?? "").startsWith(ym));
    return { count: inMonth.length, value: inMonth.reduce((s, r) => s + value(r), 0) };
  }, [rows]);

  const [target, setTarget] = useState<{ row: Row; mode: "approve" | "revise" } | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);

  const act = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const from = String(target.row.status ?? "");
      const to = target.mode === "approve" ? "Dikonfirmasi" : "Perlu Revisi";
      const payload =
        target.mode === "approve"
          ? {
              status: "Dikonfirmasi",
              confirmed_delivery_date: deliveryDate ? toISODate(deliveryDate) : null,
              approved_by: profile?.id ?? null,
              approved_at: new Date().toISOString(),
              revision_note: note.trim() ? note.trim() : null,
            }
          : { status: "Perlu Revisi", revision_note: note };
      const { error } = await supabase
        .from("sales_orders")
        .update(payload)
        .eq("id", String(target.row.id));
      if (error) throw new Error(error.message);
      await recordAudit(
        {
          id: profile?.id ?? null,
          username: profile?.username ?? null,
          role: role ?? null,
          plant_id: profile?.plant_id ?? null,
        },
        {
          entity: "sales_orders",
          recordId: String(target.row.id),
          action: target.mode === "approve" ? "Konfirmasi Order" : "Minta Revisi",
          fromStatus: from,
          toStatus: to,
          note: note.trim() || null,
          after: payload as Record<string, unknown>,
        },
      );
    },
    onSuccess: () => {
      const so = String(target?.row.so_number ?? "");
      if (target?.mode === "approve") {
        toast.success(`SO ${so} dikonfirmasi`, {
          description: deliveryDate
            ? `Tanggal pemenuhan: ${formatDate(toISODate(deliveryDate))}`
            : "Order masuk antrean produksi.",
        });
      } else {
        toast.success(`SO ${so} dikembalikan untuk revisi`, {
          description: "Sales admin akan menerima catatan revisi.",
        });
      }
      setTarget(null);
      setNote("");
      setDeliveryDate(undefined);
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
    },
    onError: (e: Error) => toast.error("Aksi gagal disimpan", { description: e.message }),
  });

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
      value: productNames,
      render: (r) => <span className="truncate">{productNames(r) || "-"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      value: totalQty,
      render: (r) => formatNumber(totalQty(r)),
    },
    {
      key: "uom",
      header: "Satuan",
      value: uomCodes,
      render: (r) => <span className="truncate">{uomCodes(r) || "-"}</span>,
    },
    { key: "order_date", header: "Tgl Order", render: (r) => formatDate(r.order_date as string) },
    { key: "required_date", header: "Dibutuhkan", render: (r) => formatDate(r.required_date as string) },
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority)} /> },
    {
      key: "value",
      header: "Nilai Order",
      align: "right",
      value,
      render: (r) => formatCurrency(value(r)),
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
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
    {
      key: "aksi",
      header: "Aksi",
      align: "right",
      sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
            <Eye className="size-4" /> Detail SO
          </Button>
          {["Menunggu Review Produksi", "Perlu Revisi"].includes(String(r.status)) ? (
            <>
              <Button size="sm" onClick={() => setTarget({ row: r, mode: "approve" })}>
                <Check className="size-4" /> Konfirmasi
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTarget({ row: r, mode: "revise" })}>
                <X className="size-4" /> Revisi
              </Button>
            </>
          ) : null}
        </div>
      ),
    },

  ];

  return (
    <>
      <PageHeader
        title="Sales Order"
        description="Periksa kebutuhan customer dan tetapkan tanggal pemenuhan produksi."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={<ShieldCheck className="size-4" />}
          label="Menunggu direview"
          value={rows.filter((r) => r.status === "Menunggu Review Produksi").length}
          tone="warning"
        />
        <KpiCard
          icon={<Activity className="size-4" />}
          label="Perlu revisi"
          value={rows.filter((r) => r.status === "Perlu Revisi").length}
          tone="danger"
        />
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
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Total Nilai antrian"
          value={formatCurrency(pending.reduce((s, r) => s + value(r), 0))}
          tone="primary"
        />
      </div>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="permintaan-order" />

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.mode === "approve" ? "Konfirmasi Order" : "Minta Revisi Order"}
            </DialogTitle>
            <DialogDescription>
              {target?.mode === "approve"
                ? "Tetapkan tanggal barang selesai dan siap dipenuhi oleh Production Control."
                : "Jelaskan alasan revisi agar tim sales dapat menindaklanjuti."}
            </DialogDescription>
          </DialogHeader>
          {target?.mode === "approve" ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ringkasan Order
                </p>
                <p className="font-medium">
                  {String(target.row.so_number ?? "-")} ·{" "}
                  {(target.row.customers as { name?: string } | null)?.name ?? "-"}
                </p>
                <p className="text-muted-foreground">
                  {productNames(target.row) || "-"} · {formatNumber(totalQty(target.row))} pcs
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">Tanggal Dibutuhkan Customer</Label>
                <p className="text-sm font-medium">{formatDate(target.row.required_date as string)}</p>
              </div>

              <div className="space-y-2">
                <Label>
                  Tanggal Pemenuhan yang Dikonfirmasi <span className="text-destructive">*</span>
                </Label>
                <DatePickerField value={deliveryDate} onChange={setDeliveryDate} />
                {deliveryDate ? (
                  lateDays(target.row, deliveryDate) > 0 ? (
                    <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3.5" />
                      Terlambat {lateDays(target.row, deliveryDate)} hari — Order Berisiko
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                      <Check className="size-3.5" />
                      Sesuai kebutuhan customer
                    </p>
                  )
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Catatan (Opsional)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="bg-surface text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Catatan Revisi</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button
              onClick={() => act.mutate()}
              disabled={act.isPending || (target?.mode === "approve" && !deliveryDate)}
            >
              {target?.mode === "approve" ? "Konfirmasi Order" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SalesOrderDetailDialog
        order={detail ? ((rows.find((r) => r.id === detail.id) ?? detail) as Row) : null}
        onClose={() => setDetail(null)}
        onApprove={(row) => {
          setDetail(null);
          setNote("");
          setDeliveryDate(undefined);
          setTarget({ row, mode: "approve" });
        }}
        onRevise={(row) => {
          setDetail(null);
          setNote("");
          setTarget({ row, mode: "revise" });
        }}
      />

    </>
  );
}
