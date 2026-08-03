import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductionEntryDialog } from "@/components/production/ProductionEntryDialog";
import { productionEntriesQuery, shiftsQuery, workOrdersQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/shopfloor/input-produksi")({
  head: () => ({
    meta: [
      { title: "Input Produksi Harian — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Pencatatan target harian, output, reject, rework, dan downtime produksi per shift.",
      },
      { property: "og:title", content: "Input Produksi Harian — MANUFACTUREIQ" },
      { property: "og:description", content: "Form input hasil produksi harian operator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InputProduksiPage,
});

type Row = Record<string, unknown>;

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function InputProduksiPage() {
  const { role, profile } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(productionEntriesQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const { data: shifts } = useQuery(shiftsQuery);

  const rows = (data ?? []) as Row[];
  const workOrders = (wos ?? []) as Row[];
  const shiftRows = (shifts ?? []) as Row[];

  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const validatedGoodByWo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (String(r.status ?? "") !== "Tervalidasi") continue;
      const key = String(r.work_order_id ?? "");
      if (!key) continue;
      map[key] = (map[key] ?? 0) + toNumber(r.good_output);
    }
    return map;
  }, [rows]);

  const actor = {
    id: profile?.id ?? null,
    username: profile?.username ?? null,
    role: role ?? null,
    plant_id: profile?.plant_id ?? null,
  };

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!payload.work_order_id) throw new Error("Work Order wajib dipilih.");
      if (editing) {
        const { error } = await db
          .from("production_entries")
          .update(payload)
          .eq("id", String(editing.id));
        if (error) throw new Error(error.message);
        await recordAudit(actor, {
          entity: "production_entries",
          recordId: String(editing.id),
          action: "UPDATE",
          before: editing,
          after: payload,
        });
        return;
      }
      const body = {
        ...payload,
        created_by: profile?.id ?? null,
        created_role: role ?? null,
        status: "Menunggu Validasi Production Control",
      };
      const { data: created, error } = await db
        .from("production_entries")
        .insert(body)
        .select()
        .single();
      if (error) throw new Error(error.message);
      await recordAudit(actor, {
        entity: "production_entries",
        recordId: created?.id ? String(created.id) : null,
        action: "CREATE",
        toStatus: "Menunggu Validasi Production Control",
        after: (created ?? body) as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      toast.success("Input produksi berhasil disimpan");
      setOpen(false);
      setEditing(null);
      [["production_entries"], ["v_production_kpi"], ["work_orders"], ["sales_orders"]].forEach(
        (k) => void qc.invalidateQueries({ queryKey: k }),
      );
    },
    onError: (e: Error) => toast.error("Gagal menyimpan data", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await db
        .from("production_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", String(row.id));
      if (error) throw new Error(error.message);
      await recordAudit(actor, {
        entity: "production_entries",
        recordId: String(row.id),
        action: "SOFT_DELETE",
        before: row,
      });
    },
    onSuccess: () => {
      toast.success("Input produksi dihapus");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["production_entries"] });
    },
    onError: (e: Error) => toast.error("Gagal menghapus data", { description: e.message }),
  });

  const uomOf = (row: Row) => {
    const wo = workOrders.find((w) => String(w.id) === String(row.work_order_id));
    return (wo?.units_of_measure as { code?: string } | null)?.code ?? "pcs";
  };

  const columns: Column<Row>[] = [
    {
      key: "production_date",
      header: "Tanggal",
      render: (row) => formatDate(row.production_date as string),
    },
    {
      key: "wo",
      header: "Work Order",
      value: (row) => (row.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    {
      key: "product",
      header: "Produk",
      value: (row) =>
        (row.work_orders as { products?: { name?: string } | null } | null)?.products?.name ?? "-",
    },
    {
      key: "shift",
      header: "Shift",
      value: (row) => (row.shifts as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "daily_target_qty",
      header: "Target Hari Ini",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.daily_target_qty))} ${uomOf(row)}`,
    },
    {
      key: "total_output",
      header: "Total Output",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.total_output))} ${uomOf(row)}`,
    },
    {
      key: "good_output",
      header: "Good Output",
      align: "right",
      render: (row) => `${formatNumber(toNumber(row.good_output))} ${uomOf(row)}`,
    },
    {
      key: "gap",
      header: "Kekurangan/Kelebihan",
      align: "right",
      render: (row) => {
        const target = toNumber(row.daily_target_qty);
        const good = toNumber(row.good_output);
        if (target <= 0) return "-";
        const diff = good - target;
        if (diff === 0) return "Tepat target";
        return diff > 0
          ? `Lebih ${formatNumber(diff)} ${uomOf(row)}`
          : `Kurang ${formatNumber(-diff)} ${uomOf(row)}`;
      },
    },
    {
      key: "target_achievement_pct",
      header: "Achievement",
      align: "right",
      render: (row) =>
        toNumber(row.daily_target_qty) > 0
          ? `${formatNumber(toNumber(row.target_achievement_pct), 2)}%`
          : "-",
    },
    {
      key: "actual_cycle_time_seconds",
      header: "Actual Cycle Time",
      align: "right",
      render: (row) =>
        row.actual_cycle_time_seconds
          ? `${formatNumber(toNumber(row.actual_cycle_time_seconds), 2)} detik/${uomOf(row)}`
          : "—",
    },
    {
      key: "status",
      header: "Status Validasi",
      render: (row) => <StatusBadge status={String(row.status ?? "-")} />,
    },
  ];

  const allColumns: Column<Row>[] = canWrite
    ? [
        ...columns,
        {
          key: "__actions",
          header: "Aksi",
          align: "right",
          sortable: false,
          render: (row) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setEditing(row);
                  setOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => setDeleting(row)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ),
        },
      ]
    : columns;

  return (
    <>
      <PageHeader
        title="Input Produksi Harian"
        description="Catat target dan hasil produksi setiap shift. Data akan divalidasi Production Control."
      />

      <DataTable<Row>
        columns={allColumns}
        rows={rows}
        loading={isLoading}
        toolbarActions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Tambah
            </Button>
          ) : null
        }
      />

      <ProductionEntryDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        workOrders={workOrders}
        shifts={shiftRows}
        validatedGoodByWo={validatedGoodByWo}
        initialValues={editing}
        editing={Boolean(editing)}
        saving={save.isPending}
        onSubmit={(payload) => save.mutate(payload)}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan dan akan tercatat pada audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
