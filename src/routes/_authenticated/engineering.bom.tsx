import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
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
import { bomQuery, materialsQuery, productsQuery, uomQuery } from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/bom")({
  head: () => ({
    meta: [
      { title: "Bill of Material — MANUFACTUREIQ" },
      { name: "description", content: "Struktur material per produk beserta scrap allowance dan versi BOM." },
      { property: "og:title", content: "Bill of Material — MANUFACTUREIQ" },
      { property: "og:description", content: "Kelola BOM produk untuk perhitungan kebutuhan material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BomPage,
});

type Row = Record<string, unknown>;
type Item = {
  id: string;
  standard_qty: number;
  scrap_allowance_pct: number;
  materials?: { code?: string; name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

function BomPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(bomQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: materials } = useQuery(materialsQuery);
  const { data: uom } = useQuery(uomQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");
  const [detail, setDetail] = useState<Row | null>(null);
  const active = rows.find((r) => String(r.id) === String(detail?.id ?? "")) ?? detail;

  const columns: Column<Row>[] = [
    {
      key: "product",
      header: "Produk",
      value: (r) => (r.products as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "variant",
      header: "Varian",
      value: (r) => (r.product_variants as { name?: string } | null)?.name ?? "-",
    },
    { key: "version", header: "Versi", align: "right" },
    { key: "output_basis", header: "Basis Output", align: "right", render: (r) => formatNumber(Number(r.output_basis ?? 0)) },
    {
      key: "items",
      header: "Jumlah Material",
      align: "right",
      value: (r) => ((r.bom_items as Item[]) ?? []).length,
    },
    { key: "effective_date", header: "Berlaku", render: (r) => formatDate(r.effective_date as string) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "product_id", label: "Produk", type: "select", required: true, options: toOptions(products as Row[], ["code", "name"]) },
    { name: "output_basis", label: "Basis Output", type: "number", defaultValue: 1 },
    { name: "output_uom_id", label: "UoM Output", type: "select", options: toOptions(uom as Row[], ["code", "name"]) },
    { name: "version", label: "Versi", type: "number", defaultValue: 1 },
    { name: "effective_date", label: "Tanggal Berlaku", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "status", label: "Status", type: "select", defaultValue: "Draft", options: selectOptions(["Draft", "Approved", "Obsolete"]) },
  ];

  return (
    <>
      <CrudPage<Row>
        title="Bill of Material"
        description="BOM dipakai untuk cek kesiapan material dan perhitungan HPP standar."
        table="bom_headers"
        invalidateKeys={[["bom_headers"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={fields}
        canWrite={canWrite}
        canDelete={canWrite}
        exportName="bom"
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
            Material
          </Button>
        )}
      />
      <BomItemsDialog
        bom={active}
        onClose={() => setDetail(null)}
        materials={(materials ?? []) as Row[]}
        uom={(uom ?? []) as Row[]}
        canWrite={canWrite}
      />
    </>
  );
}

function BomItemsDialog({
  bom,
  onClose,
  materials,
  uom,
  canWrite,
}: {
  bom: Row | null;
  onClose: () => void;
  materials: Row[];
  uom: Row[];
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ material_id: "", standard_qty: "", scrap_allowance_pct: "0", uom_id: "" });
  const items = ((bom?.bom_items as Item[]) ?? []) as Item[];

  const add = useMutation({
    mutationFn: async () => {
      if (!bom) return;
      const { error } = await supabase.from("bom_items").insert({
        bom_id: String(bom.id),
        material_id: form.material_id,
        standard_qty: Number(form.standard_qty || 0),
        scrap_allowance_pct: Number(form.scrap_allowance_pct || 0),
        uom_id: form.uom_id || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Material ditambahkan");
      setForm({ material_id: "", standard_qty: "", scrap_allowance_pct: "0", uom_id: "" });
      void qc.invalidateQueries({ queryKey: ["bom_headers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bom_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Material dihapus");
      void qc.invalidateQueries({ queryKey: ["bom_headers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(bom)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Komponen BOM</DialogTitle>
          <DialogDescription>
            Kebutuhan material untuk {formatNumber(Number(bom?.output_basis ?? 1))} unit output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada komponen material.
            </p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {it.materials?.code} — {it.materials?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(it.standard_qty, 3)} {it.units_of_measure?.code ?? ""} · scrap{" "}
                    {formatNumber(it.scrap_allowance_pct, 2)}%
                  </p>
                </div>
                {canWrite && (
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => del.mutate(it.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {canWrite && (
          <form
            className="grid gap-3 border-t pt-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Material</Label>
              <Select value={form.material_id} onValueChange={(v) => setForm({ ...form, material_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih material" />
                </SelectTrigger>
                <SelectContent>
                  {toOptions(materials, ["code", "name"]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qty Standar</Label>
              <Input
                type="number"
                step="0.001"
                required
                value={form.standard_qty}
                onChange={(e) => setForm({ ...form, standard_qty: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Scrap Allowance (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.scrap_allowance_pct}
                onChange={(e) => setForm({ ...form, scrap_allowance_pct: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>UoM</Label>
              <Select value={form.uom_id} onValueChange={(v) => setForm({ ...form, uom_id: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih UoM" />
                </SelectTrigger>
                <SelectContent>
                  {toOptions(uom, ["code", "name"]).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={add.isPending}>
                <Plus className="size-4" /> Tambah Material
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
