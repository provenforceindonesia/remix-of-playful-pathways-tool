import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Check, ShieldCheck, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sales/review")({
  head: () => ({
    meta: [
      { title: "Review Permintaan Order — MANUFACTUREIQ" },
      { name: "description", content: "Review kelayakan produksi atas order pelanggan sebelum dikonfirmasi." },
      { property: "og:title", content: "Review Permintaan Order — MANUFACTUREIQ" },
      { property: "og:description", content: "Konfirmasi atau minta revisi customer order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

type Row = Record<string, unknown>;
type Item = { quantity: number; unit_price: number };

const value = (r: Row) =>
  (((r.sales_order_items as Item[]) ?? []) as Item[]).reduce(
    (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
    0,
  );

function ReviewPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const rows = ((data ?? []) as Row[]).filter((r) =>
    ["Menunggu Review Produksi", "Perlu Revisi"].includes(String(r.status)),
  );

  const [target, setTarget] = useState<{ row: Row; mode: "approve" | "revise" } | null>(null);
  const [note, setNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);

  const act = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const payload =
        target.mode === "approve"
          ? {
              status: "Dikonfirmasi",
              confirmed_delivery_date: deliveryDate ? toISODate(deliveryDate) : null,
              approved_by: profile?.id ?? null,
              approved_at: new Date().toISOString(),
              revision_note: null,
            }
          : { status: "Perlu Revisi", revision_note: note };
      const { error } = await supabase
        .from("sales_orders")
        .update(payload)
        .eq("id", String(target.row.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(target?.mode === "approve" ? "Order dikonfirmasi" : "Order dikembalikan untuk revisi");
      setTarget(null);
      setNote("");
      setDeliveryDate(undefined);
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
    { key: "required_date", header: "Dibutuhkan", render: (r) => formatDate(r.required_date as string) },
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority)} /> },
    {
      key: "value",
      header: "Nilai",
      align: "right",
      value,
      render: (r) => formatCurrency(value(r)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
    {
      key: "aksi",
      header: "Aksi",
      align: "right",
      sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" onClick={() => setTarget({ row: r, mode: "approve" })}>
            <Check className="size-4" /> Konfirmasi
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTarget({ row: r, mode: "revise" })}>
            <X className="size-4" /> Revisi
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Review Permintaan Order"
        description="Periksa kapasitas dan kesiapan material sebelum mengonfirmasi order."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={<ShieldCheck className="size-4" />} label="Menunggu Review" value={rows.filter((r) => r.status === "Menunggu Review Produksi").length} tone="warning" />
        <KpiCard icon={<Activity className="size-4" />} label="Perlu Revisi" value={rows.filter((r) => r.status === "Perlu Revisi").length} tone="danger" />
        <KpiCard icon={<Wallet className="size-4" />}
          label="Total Nilai Antrian"
          value={formatCurrency(rows.reduce((s, r) => s + value(r), 0))}
          tone="primary"
        />
      </div>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="review-order" />

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.mode === "approve" ? "Konfirmasi Order" : "Minta Revisi Order"}
            </DialogTitle>
            <DialogDescription>
              {target?.mode === "approve"
                ? "Tetapkan tanggal pengiriman yang dikonfirmasi produksi."
                : "Jelaskan alasan revisi agar tim sales dapat menindaklanjuti."}
            </DialogDescription>
          </DialogHeader>
          {target?.mode === "approve" ? (
            <div className="space-y-2">
              <Label>Confirmed Delivery Date</Label>
              <DatePickerField value={deliveryDate} onChange={setDeliveryDate} />
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
            <Button onClick={() => act.mutate()} disabled={act.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
