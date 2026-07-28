import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { productionEntriesQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/production/validasi")({
  head: () => ({
    meta: [
      { title: "Validasi Hasil Produksi — MANUFACTUREIQ" },
      { name: "description", content: "Validasi entri produksi shopfloor sebelum masuk perhitungan KPI dan biaya." },
      { property: "og:title", content: "Validasi Hasil Produksi — MANUFACTUREIQ" },
      { property: "og:description", content: "Persetujuan hasil produksi harian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValidasiPage,
});

type Row = Record<string, unknown>;

function ValidasiPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data, isLoading } = useQuery(productionEntriesQuery);
  const all = (data ?? []) as Row[];
  const rows = all.filter((r) =>
    ["Menunggu Validasi Production Control", "Perlu Perbaikan"].includes(String(r.status)),
  );
  const [reject, setReject] = useState<Row | null>(null);
  const [note, setNote] = useState("");

  const validate = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase
        .from("production_entries")
        .update({
          status: "Tervalidasi",
          validated_by: profile?.id ?? null,
          validated_at: new Date().toISOString(),
          revision_note: null,
        })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Entri tervalidasi");
      void qc.invalidateQueries({ queryKey: ["production_entries"] });
      void qc.invalidateQueries({ queryKey: ["v_production_kpi"] });
      void qc.invalidateQueries({ queryKey: ["sales_orders"] });
      void qc.invalidateQueries({ queryKey: ["backlog_ledger"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendBack = useMutation({
    mutationFn: async () => {
      if (!reject) return;
      const { error } = await supabase
        .from("production_entries")
        .update({ status: "Perlu Perbaikan", revision_note: note })
        .eq("id", String(reject.id));
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Entri dikembalikan ke operator");
      setReject(null);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["production_entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    { key: "production_date", header: "Tanggal", render: (r) => formatDate(r.production_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    {
      key: "operator",
      header: "Operator",
      value: (r) => (r.profiles as { full_name?: string } | null)?.full_name ?? "-",
    },
    {
      key: "total_output",
      header: "Output",
      align: "right",
      render: (r) => formatNumber(Number(r.total_output ?? 0)),
    },
    {
      key: "good_output",
      header: "Good",
      align: "right",
      render: (r) => formatNumber(Number(r.good_output ?? 0)),
    },
    {
      key: "reject_qty",
      header: "Reject",
      align: "right",
      render: (r) => formatNumber(Number(r.reject_qty ?? 0)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
    {
      key: "aksi",
      header: "Aksi",
      align: "right",
      sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" onClick={() => validate.mutate(r)} disabled={validate.isPending}>
            <BadgeCheck className="size-4" /> Validasi
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReject(r)}>
            <Undo2 className="size-4" /> Perbaiki
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Validasi Hasil Produksi"
        description="Data tervalidasi otomatis memperbarui progres order, backlog, dan KPI."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Menunggu Validasi" value={rows.length} tone="warning" />
        <KpiCard
          label="Tervalidasi"
          value={all.filter((r) => r.status === "Tervalidasi").length}
          tone="success"
        />
        <KpiCard
          label="Perlu Perbaikan"
          value={all.filter((r) => r.status === "Perlu Perbaikan").length}
          tone="danger"
        />
      </div>
      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="validasi-produksi" />

      <Dialog open={Boolean(reject)} onOpenChange={(o) => !o && setReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kembalikan untuk perbaikan</DialogTitle>
            <DialogDescription>Tuliskan bagian data yang perlu diperbaiki operator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Catatan Perbaikan</Label>
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject(null)}>
              Batal
            </Button>
            <Button onClick={() => sendBack.mutate()} disabled={sendBack.isPending}>
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
