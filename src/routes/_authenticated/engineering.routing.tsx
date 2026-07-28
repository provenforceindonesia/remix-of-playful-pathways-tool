import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { machinesQuery, productsQuery, routingsQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/routing")({
  head: () => ({
    meta: [
      { title: "Routing & Standard — MANUFACTUREIQ" },
      { name: "description", content: "Definisikan urutan proses, cycle time standar, dan kebutuhan manpower." },
      { property: "og:title", content: "Routing & Standard — MANUFACTUREIQ" },
      { property: "og:description", content: "Master routing dan standar proses produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutingPage,
});

type Row = Record<string, unknown>;
type Op = {
  id: string;
  seq: number;
  operation_name: string;
  standard_cycle_time_sec: number;
  setup_time_min: number;
  manpower: number;
  machines?: { code?: string; name?: string } | null;
};

function RoutingPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(routingsQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");
  const [detail, setDetail] = useState<Row | null>(null);
  const active = rows.find((r) => String(r.id) === String(detail?.id ?? "")) ?? detail;

  const columns: Column<Row>[] = [
    { key: "code", header: "Kode" },
    { key: "name", header: "Nama Routing" },
    {
      key: "product",
      header: "Produk",
      value: (r) => (r.products as { name?: string } | null)?.name ?? "-",
    },
    { key: "version", header: "Versi", align: "right" },
    {
      key: "operations",
      header: "Operasi",
      align: "right",
      value: (r) => ((r.routing_operations as Op[]) ?? []).length,
    },
    { key: "effective_date", header: "Berlaku", render: (r) => formatDate(r.effective_date as string) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "code", label: "Kode Routing", required: true },
    { name: "name", label: "Nama Routing", required: true },
    { name: "product_id", label: "Produk", type: "select", options: toOptions(products as Row[], ["code", "name"]) },
    { name: "version", label: "Versi", type: "number", defaultValue: 1 },
    { name: "effective_date", label: "Tanggal Berlaku", type: "date", required: true, defaultValue: toISODate(new Date()) },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "Draft",
      options: ["Draft", "Approved", "Obsolete"].map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <>
      <CrudPage<Row>
        title="Routing & Standard"
        description="Routing menentukan cycle time standar yang dipakai untuk kapasitas dan speed index."
        table="routings"
        invalidateKeys={[["routings"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={fields}
        canWrite={canWrite}
        canDelete={canWrite}
        exportName="routing"
        beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
        rowActions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDetail(row);
            }}
          >
            Operasi
          </Button>
        )}
      />
      <OperationsDialog
        routing={active}
        onClose={() => setDetail(null)}
        machines={(machines ?? []) as Row[]}
        canWrite={canWrite}
      />
    </>
  );
}

function OperationsDialog({
  routing,
  onClose,
  machines,
  canWrite,
}: {
  routing: Row | null;
  onClose: () => void;
  machines: Row[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    seq: "",
    operation_name: "",
    machine_id: "",
    standard_cycle_time_sec: "",
    setup_time_min: "",
    manpower: "1",
  });
  const ops = (((routing?.routing_operations as Op[]) ?? []) as Op[]).sort((a, b) => a.seq - b.seq);

  const add = useMutation({
    mutationFn: async () => {
      if (!routing) return;
      const { error } = await supabase.from("routing_operations").insert({
        routing_id: String(routing.id),
        seq: Number(form.seq || ops.length + 1),
        operation_name: form.operation_name,
        machine_id: form.machine_id || null,
        standard_cycle_time_sec: Number(form.standard_cycle_time_sec || 0),
        setup_time_min: Number(form.setup_time_min || 0),
        manpower: Number(form.manpower || 1),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Operasi ditambahkan");
      setForm({ seq: "", operation_name: "", machine_id: "", standard_cycle_time_sec: "", setup_time_min: "", manpower: "1" });
      void qc.invalidateQueries({ queryKey: ["routings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routing_operations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Operasi dihapus");
      void qc.invalidateQueries({ queryKey: ["routings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(routing)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Operasi {String(routing?.code ?? "")}</DialogTitle>
          <DialogDescription>Urutan proses beserta standar waktu.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {ops.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada operasi.
            </p>
          ) : (
            ops.map((op) => (
              <div key={op.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {op.seq}. {op.operation_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {op.machines?.code ?? "-"} · CT {formatNumber(op.standard_cycle_time_sec, 1)} dtk · setup{" "}
                    {formatNumber(op.setup_time_min)} mnt · {op.manpower} orang
                  </p>
                </div>
                {canWrite && (
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => del.mutate(op.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {canWrite && (
          <form
            className="grid gap-3 border-t pt-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input type="number" value={form.seq} onChange={(e) => setForm({ ...form, seq: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nama Operasi</Label>
              <Input
                value={form.operation_name}
                required
                onChange={(e) => setForm({ ...form, operation_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mesin</Label>
              <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih mesin" />
                </SelectTrigger>
                <SelectContent>
                  {toOptions(machines, ["code", "name"]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cycle Time (dtk)</Label>
              <Input
                type="number"
                value={form.standard_cycle_time_sec}
                onChange={(e) => setForm({ ...form, standard_cycle_time_sec: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Setup (mnt)</Label>
              <Input
                type="number"
                value={form.setup_time_min}
                onChange={(e) => setForm({ ...form, setup_time_min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Manpower</Label>
              <Input
                type="number"
                value={form.manpower}
                onChange={(e) => setForm({ ...form, manpower: e.target.value })}
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={add.isPending}>
                <Plus className="size-4" /> Tambah Operasi
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
