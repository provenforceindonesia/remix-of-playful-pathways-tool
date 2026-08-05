import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import {
  linesQuery,
  machinesQuery,
  plantsQuery,
  productionPlansQuery,
  routingsQuery,
  salesOrdersQuery,
  shiftsQuery,
} from "@/lib/queries";
import { formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DatePickerField } from "@/components/common/DatePickerField";
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

type Row = Record<string, unknown>;

const READINESS = ["Belum Dicek", "Siap", "Sebagian", "Tidak Siap"];

export type PlanItemForm = {
  key: string;
  existingId: string | null;
  productId: string;
  variantId: string | null;
  uomId: string | null;
  productName: string;
  variantName: string;
  uomCode: string;
  soQty: number;
  plannedElsewhere: number;
  target: string;
  plannedDate: string;
  lineId: string;
  machineId: string;
  shiftId: string;
  routingId: string;
  manpower: string;
  manpowerTouched: boolean;
  material: string;
  capacity: string;
};

const itemKey = (productId: string, variantId: string | null | undefined) =>
  `${productId}:${variantId ?? ""}`;

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function ProductionPlanDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Row | null;
}) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: sos } = useQuery(salesOrdersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: routings } = useQuery(routingsQuery);
  const { data: plans } = useQuery(productionPlansQuery);

  const [planNumber, setPlanNumber] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [plantId, setPlantId] = useState("");
  const [items, setItems] = useState<PlanItemForm[]>([]);
  const [saving, setSaving] = useState(false);

  const soRows = (sos ?? []) as Row[];
  const planRows = (plans ?? []) as Row[];
  const routingRows = (routings ?? []) as Row[];
  const machineRows = (machines ?? []) as Row[];

  const selectableSos = useMemo(
    () =>
      soRows.filter((so) => {
        const st = String(so.status ?? "");
        return !["Draft", "Menunggu Review Produksi", "Perlu Revisi", "Dibatalkan", "Selesai"].includes(st);
      }),
    [soRows],
  );

  /** Total target produk pada Production Plan lain yang masih aktif. */
  const plannedElsewhere = useMemo(() => {
    const map = new Map<string, number>();
    for (const plan of planRows) {
      if (plan.deleted_at) continue;
      if (String(plan.status ?? "") === "Cancelled") continue;
      if (String(plan.sales_order_id ?? "") !== salesOrderId) continue;
      if (editing && String(plan.id) === String(editing.id)) continue;
      for (const it of (plan.production_plan_items ?? []) as Row[]) {
        const k = itemKey(String(it.product_id), it.variant_id as string | null);
        map.set(k, (map.get(k) ?? 0) + num(it.target_qty));
      }
    }
    return map;
  }, [planRows, salesOrderId, editing]);

  const routingsFor = (productId: string, variantId: string | null) =>
    routingRows.filter(
      (r) =>
        String(r.status ?? "") === "Active" &&
        String(r.product_id ?? "") === productId &&
        (!r.variant_id || String(r.variant_id) === String(variantId ?? "")),
    );

  const recommendedManpower = (routingId: string) => {
    const r = routingRows.find((x) => String(x.id) === routingId);
    if (!r) return null;
    const ops = (r.routing_operations ?? []) as Row[];
    if (!ops.length) return null;
    return Math.max(...ops.map((o) => num(o.manpower)));
  };

  const routingMachineIds = (routingId: string) => {
    const r = routingRows.find((x) => String(x.id) === routingId);
    const ops = ((r?.routing_operations ?? []) as Row[])
      .map((o) => (o.machine_id ? String(o.machine_id) : null))
      .filter(Boolean) as string[];
    return ops;
  };

  const machineOptions = (item: PlanItemForm) => {
    let list = machineRows;
    if (item.lineId) list = list.filter((m) => String(m.line_id ?? "") === item.lineId);
    const allowed = routingMachineIds(item.routingId);
    if (allowed.length) {
      const filtered = list.filter((m) => allowed.includes(String(m.id)));
      if (filtered.length) list = filtered;
    }
    return list;
  };

  // Reset saat dialog dibuka
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPlanNumber(String(editing.plan_number ?? ""));
      setSalesOrderId(String(editing.sales_order_id ?? ""));
      setPlantId(String(editing.plant_id ?? ""));
    } else {
      setSalesOrderId("");
      setPlantId("");
      setItems([]);
      setPlanNumber("");
      void (async () => {
        const { data, error } = await (
          supabase as unknown as {
            rpc: (fn: string) => PromiseLike<{ data: string | null; error: { message: string } | null }>;
          }
        ).rpc("next_plan_number");
        if (!error && data) setPlanNumber(String(data));
      })();
    }
  }, [open, editing]);

  // Bangun daftar item saat SO dipilih (gabung item tersimpan + item SO)
  useEffect(() => {
    if (!open || !salesOrderId) {
      if (open && !salesOrderId) setItems([]);
      return;
    }
    const so = soRows.find((s) => String(s.id) === salesOrderId);
    const soItems = (so?.sales_order_items ?? []) as Row[];
    const saved = editing ? ((editing.production_plan_items ?? []) as Row[]) : [];

    setItems((prev) => {
      const prevByKey = new Map(prev.map((p) => [p.key, p]));
      const next: PlanItemForm[] = soItems.map((si) => {
        const productId = String(si.product_id ?? "");
        const variantId = (si.variant_id as string | null) ?? null;
        const key = itemKey(productId, variantId);
        const savedItem = saved.find(
          (s) => itemKey(String(s.product_id), s.variant_id as string | null) === key,
        );
        const existingPrev = prevByKey.get(key);
        if (existingPrev) return { ...existingPrev, soQty: num(si.quantity) };

        const available = routingsFor(productId, variantId);
        const routingId = savedItem?.routing_id
          ? String(savedItem.routing_id)
          : available.length === 1
            ? String(available[0]!.id)
            : available.length > 1
              ? String(available[0]!.id)
              : "";
        return {
          key,
          existingId: savedItem ? String(savedItem.id) : null,
          productId,
          variantId,
          uomId: (si.uom_id as string | null) ?? null,
          productName: (si.products as Row | null)?.name
            ? String((si.products as Row).name)
            : "Produk",
          variantName: (si.product_variants as Row | null)?.name
            ? String((si.product_variants as Row).name)
            : "Standard",
          uomCode: (si.units_of_measure as Row | null)?.code
            ? String((si.units_of_measure as Row).code)
            : "pcs",
          soQty: num(si.quantity),
          plannedElsewhere: 0,
          target: savedItem ? String(num(savedItem.target_qty)) : "0",
          plannedDate: savedItem?.planned_date
            ? String(savedItem.planned_date)
            : toISODate(new Date()),
          lineId: savedItem?.line_id ? String(savedItem.line_id) : "",
          machineId: savedItem?.machine_id ? String(savedItem.machine_id) : "",
          shiftId: savedItem?.shift_id ? String(savedItem.shift_id) : "",
          routingId,
          manpower: savedItem?.planned_manpower ? String(num(savedItem.planned_manpower)) : "0",
          manpowerTouched: Boolean(savedItem?.planned_manpower),
          material: savedItem?.material_readiness
            ? String(savedItem.material_readiness)
            : "Belum Dicek",
          capacity: savedItem?.capacity_readiness
            ? String(savedItem.capacity_readiness)
            : "Belum Dicek",
        };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, salesOrderId, sos, editing]);

  // Isi otomatis manpower dari rekomendasi selama belum diubah manual
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.manpowerTouched) return it;
        const rec = recommendedManpower(it.routingId);
        if (!rec) return it;
        if (num(it.manpower) === 0) return { ...it, manpower: String(rec) };
        return it;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routings, items.length]);

  const patch = (key: string, changes: Partial<PlanItemForm>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...changes } : it)));

  const remaining = (it: PlanItemForm) =>
    Math.max(0, it.soQty - (plannedElsewhere.get(it.key) ?? 0));

  const validate = () => {
    if (!planNumber) return "Nomor Plan belum tersedia.";
    if (!salesOrderId) return "Sales Order wajib dipilih.";
    if (!plantId) return "Plant wajib dipilih.";
    const active = items.filter((it) => num(it.target) > 0);
    if (!active.length) return "Minimal satu produk harus memiliki Target Plan lebih dari 0.";
    for (const it of active) {
      const label = `${it.productName} — ${it.variantName}`;
      if (num(it.target) > remaining(it))
        return `Target Plan ${label} melebihi quantity yang belum direncanakan (${formatNumber(remaining(it))} ${it.uomCode}).`;
      const missing: string[] = [];
      if (!it.plannedDate) missing.push("Tanggal Produksi");
      if (!it.lineId) missing.push("Line");
      if (!it.machineId) missing.push("Mesin");
      if (!it.shiftId) missing.push("Shift");
      if (missing.length) return `Lengkapi ${missing.join(", ")} untuk ${label}.`;
      if (num(it.manpower) <= 0) return `Planned Manpower untuk ${label} harus lebih dari 0.`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error("Data belum lengkap", { description: err });
      return;
    }
    setSaving(true);
    try {
      const active = items.filter((it) => num(it.target) > 0);
      const dates = active.map((it) => it.plannedDate).sort();
      const header = {
        plan_number: planNumber,
        sales_order_id: salesOrderId,
        plant_id: plantId,
        production_date: dates[0] ?? toISODate(new Date()),
      };

      let planId: string;
      if (editing) {
        planId = String(editing.id);
        const { error } = await db.from("production_plans").update(header).eq("id", planId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await db
          .from("production_plans")
          .insert({ ...header, status: "Draft", created_by: profile?.id ?? null })
          .select()
          .single();
        if (error) throw new Error(error.message);
        if (!data?.id) throw new Error("Production Plan gagal dibuat.");
        planId = String(data.id);
      }

      for (const it of items) {
        const target = num(it.target);
        if (target <= 0) {
          if (it.existingId) {
            const { error } = await db
              .from("production_plan_items")
              .delete()
              .eq("id", it.existingId);
            if (error) throw new Error(error.message);
          }
          continue;
        }
        const payload = {
          plan_id: planId,
          product_id: it.productId,
          variant_id: it.variantId,
          uom_id: it.uomId,
          demand_qty: it.soQty,
          target_qty: target,
          planned_date: it.plannedDate,
          line_id: it.lineId || null,
          machine_id: it.machineId || null,
          shift_id: it.shiftId || null,
          routing_id: it.routingId || null,
          available_minutes: null,
          recommended_manpower: recommendedManpower(it.routingId),
          planned_manpower: num(it.manpower),
          material_readiness: it.material,
          capacity_readiness: it.capacity,
        };
        const { error } = it.existingId
          ? await db.from("production_plan_items").update(payload).eq("id", it.existingId)
          : await db.from("production_plan_items").insert(payload);
        if (error) throw new Error(error.message);
      }

      await qc.invalidateQueries({ queryKey: ["production_plans"] });
      toast.success(editing ? "Production Plan diperbarui" : "Production Plan disimpan", {
        description: `Nomor Plan ${planNumber}.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Gagal menyimpan Production Plan", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah Production Plan" : "Tambah Production Plan"}</DialogTitle>
          <DialogDescription>
            Satu Production Plan dapat memuat beberapa produk dari satu Sales Order.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nomor Plan</Label>
            <Input value={planNumber} readOnly className="bg-muted/40 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>
              Sales Order<span className="text-destructive"> *</span>
            </Label>
            <Select value={salesOrderId} onValueChange={setSalesOrderId} disabled={Boolean(editing)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih sales order" />
              </SelectTrigger>
              <SelectContent>
                {selectableSos.map((so) => (
                  <SelectItem key={String(so.id)} value={String(so.id)}>
                    {String(so.so_number ?? "")} — {String((so.customers as Row | null)?.name ?? "-")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Plant<span className="text-destructive"> *</span>
            </Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih plant" />
              </SelectTrigger>
              <SelectContent>
                {((plants ?? []) as Row[]).map((p) => (
                  <SelectItem key={String(p.id)} value={String(p.id)}>
                    {String(p.name ?? "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Item Sales Order
          </p>
          {!salesOrderId ? (
            <p className="text-sm text-muted-foreground">
              Pilih Sales Order untuk menampilkan item produk.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sales Order ini belum memiliki item.</p>
          ) : (
            items.map((it) => {
              const avail = routingsFor(it.productId, it.variantId);
              const rec = recommendedManpower(it.routingId);
              const sisa = remaining(it);
              return (
                <Card key={it.key} className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {it.productName} — {it.variantName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sisa SO: {formatNumber(sisa)} {it.uomCode}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        Quantity SO: {formatNumber(it.soQty)} {it.uomCode}
                      </div>
                      <div>
                        Sudah Direncanakan: {formatNumber(plannedElsewhere.get(it.key) ?? 0)}{" "}
                        {it.uomCode}
                      </div>
                      <div>
                        Belum Direncanakan: {formatNumber(sisa)} {it.uomCode}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        Target Plan<span className="text-destructive"> *</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={sisa}
                          value={it.target}
                          onChange={(e) => {
                            const v = Math.max(0, Number(e.target.value || 0));
                            patch(it.key, { target: String(Math.min(v, sisa)) });
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{it.uomCode}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Tanggal Produksi<span className="text-destructive"> *</span>
                      </Label>
                      <DatePickerField
                        value={it.plannedDate ? new Date(it.plannedDate) : null}
                        onChange={(d) =>
                          patch(it.key, { plannedDate: d ? toISODate(d) : "" })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Line<span className="text-destructive"> *</span>
                      </Label>
                      <Select
                        value={it.lineId}
                        onValueChange={(v) => {
                          const stillOk = machineRows.some(
                            (m) => String(m.id) === it.machineId && String(m.line_id ?? "") === v,
                          );
                          patch(it.key, { lineId: v, machineId: stillOk ? it.machineId : "" });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih line" />
                        </SelectTrigger>
                        <SelectContent>
                          {((lines ?? []) as Row[]).map((l) => (
                            <SelectItem key={String(l.id)} value={String(l.id)}>
                              {String(l.name ?? "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Mesin<span className="text-destructive"> *</span>
                      </Label>
                      <Select
                        value={it.machineId}
                        onValueChange={(v) => patch(it.key, { machineId: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih mesin" />
                        </SelectTrigger>
                        <SelectContent>
                          {machineOptions(it).map((m) => (
                            <SelectItem key={String(m.id)} value={String(m.id)}>
                              {String(m.code ?? "")} — {String(m.name ?? "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Shift<span className="text-destructive"> *</span>
                      </Label>
                      <Select
                        value={it.shiftId}
                        onValueChange={(v) => patch(it.key, { shiftId: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {((shifts ?? []) as Row[]).map((s) => (
                            <SelectItem key={String(s.id)} value={String(s.id)}>
                              {String(s.name ?? "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Routing</Label>
                      {avail.length === 0 ? (
                        <p className="flex h-9 items-center text-sm text-muted-foreground">
                          Belum ada routing aktif
                        </p>
                      ) : avail.length === 1 ? (
                        <p className="flex h-9 items-center text-sm">
                          {String(avail[0]!.code ?? "")} — Otomatis
                        </p>
                      ) : (
                        <Select
                          value={it.routingId}
                          onValueChange={(v) => {
                            const allowed = routingMachineIds(v);
                            const keepMachine =
                              !allowed.length || allowed.includes(it.machineId) ? it.machineId : "";
                            patch(it.key, { routingId: v, machineId: keepMachine });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih routing" />
                          </SelectTrigger>
                          <SelectContent>
                            {avail.map((r, i) => (
                              <SelectItem key={String(r.id)} value={String(r.id)}>
                                {String(r.code ?? "")} — {i === 0 ? "Utama" : "Alternatif"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>
                        Planned Manpower<span className="text-destructive"> *</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="sm:max-w-[160px]"
                          value={it.manpower}
                          onChange={(e) =>
                            patch(it.key, { manpower: e.target.value, manpowerTouched: true })
                          }
                        />
                        <span className="text-sm text-muted-foreground">orang</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rec
                          ? `Rekomendasi sistem: ${formatNumber(rec)} orang. Jumlah ini tetap dapat diubah.`
                          : "Masukkan jumlah manpower. Rekomendasi muncul otomatis jika standar produk tersedia."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Kesiapan Material</Label>
                      <Select
                        value={it.material}
                        onValueChange={(v) => patch(it.key, { material: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {READINESS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kesiapan Kapasitas</Label>
                      <Select
                        value={it.capacity}
                        onValueChange={(v) => patch(it.key, { capacity: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {READINESS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
