import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { machinesQuery, productsQuery, timeStudiesQuery } from "@/lib/queries";
import { toOptions } from "@/components/common/CrudPage";
import { toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

type Row = Record<string, unknown>;

export type RoutingStepForm = {
  key: string;
  seq: string;
  operation_name: string;
  machine_id: string;
  work_center_id: string;
  setup_time_min: string;
  standard_cycle_time_sec: string;
  manpower: string;
  source_time_study_id: string | null;
};

const STATUSES = ["Draft", "Active", "Inactive"] as const;

/** Saran nama operasi — tetap bebas diketik sendiri oleh Industrial Engineer. */
const OPERATION_SUGGESTIONS = [
  "Mixing",
  "Filling",
  "Packing",
  "Sealing",
  "Labeling",
  "Cutting",
  "Drilling",
  "Finishing",
  "Inspection",
];

function newStep(seq: number): RoutingStepForm {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    seq: String(seq),
    operation_name: "",
    machine_id: "",
    work_center_id: "",
    setup_time_min: "0",
    standard_cycle_time_sec: "0",
    manpower: "1",
    source_time_study_id: null,
  };
}

export function RoutingFormDialog({
  open,
  onOpenChange,
  routing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routing?: Row | null;
}) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: products } = useQuery(productsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: timeStudies } = useQuery(timeStudiesQuery);

  const [productId, setProductId] = useState("");
  const [routingVersion, setRoutingVersion] = useState("REV-01");
  const [status, setStatus] = useState<string>("Draft");
  const [steps, setSteps] = useState<RoutingStepForm[]>([newStep(10)]);

  const editing = Boolean(routing?.id);

  useEffect(() => {
    if (!open) return;
    if (routing) {
      const ops = (((routing.routing_operations as Row[]) ?? []) as Row[])
        .slice()
        .sort((a, b) => Number(a.seq) - Number(b.seq));
      setProductId(String(routing.product_id ?? ""));
      setRoutingVersion(String(routing.code ?? "").match(/REV-\d+/i)?.[0] ?? `REV-${String(routing.version ?? 1).padStart(2, "0")}`);
      setStatus(String(routing.status ?? "Draft"));
      setSteps(
        ops.length
          ? ops.map((op, i) => ({
              key: String(op.id ?? i),
              seq: String(op.seq ?? (i + 1) * 10),
              operation_name: String(op.operation_name ?? ""),
              machine_id: String(op.machine_id ?? ""),
              work_center_id: String(op.work_center_id ?? ""),
              setup_time_min: String(op.setup_time_min ?? 0),
              standard_cycle_time_sec: String(op.standard_cycle_time_sec ?? 0),
              manpower: String(op.manpower ?? 1),
              source_time_study_id: (op.source_time_study_id as string | null) ?? null,
            }))
          : [newStep(10)],
      );
    } else {
      setProductId("");
      setRoutingVersion("REV-01");
      setStatus("Draft");
      setSteps([newStep(10)]);
    }
  }, [open, routing]);

  const validatedStudies = useMemo(
    () => ((timeStudies ?? []) as Row[]).filter((s) => s.status === "Validated"),
    [timeStudies],
  );

  const machineRows = (machines ?? []) as Row[];
  const machineOptions = toOptions(machineRows, ["code", "name"]);
  const productOptions = toOptions((products ?? []) as Row[], ["code", "name"]);

  function findStudy(step: RoutingStepForm) {
    if (!productId || !step.operation_name.trim()) return null;
    const name = step.operation_name.trim().toLowerCase();
    return (
      validatedStudies.find(
        (s) =>
          String(s.product_id ?? "") === productId &&
          String(s.process_name ?? "").trim().toLowerCase() === name &&
          (!step.machine_id || String(s.machine_id ?? "") === step.machine_id),
      ) ?? null
    );
  }

  function updateStep(key: string, patch: Partial<RoutingStepForm>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function applyStudy(step: RoutingStepForm, study: Row) {
    updateStep(step.key, {
      standard_cycle_time_sec: String(Number(study.standard_cycle_time_sec ?? 0)),
      setup_time_min: String(Number(study.setup_time_min ?? step.setup_time_min)),
      manpower: String(Number(study.manpower ?? step.manpower)),
      machine_id: step.machine_id || String(study.machine_id ?? ""),
      source_time_study_id: String(study.id),
    });
    toast.success("Standar dari Time Study diterapkan");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Produk wajib dipilih.");
      if (!routingVersion.trim()) throw new Error("Routing Version wajib diisi.");
      if (steps.length === 0) throw new Error("Minimal satu Routing Step harus tersedia.");
      for (const s of steps) {
        if (!s.seq.trim() || !s.operation_name.trim() || !s.machine_id) {
          throw new Error("Setiap step wajib memiliki sequence, proses, dan mesin.");
        }
        const nums = [s.seq, s.setup_time_min, s.standard_cycle_time_sec, s.manpower].map(Number);
        if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
          throw new Error("Nilai numerik tidak boleh negatif.");
        }
      }

      const product = ((products ?? []) as Row[]).find((p) => String(p.id) === productId);
      const versionNumber = Number(routingVersion.replace(/\D+/g, "")) || 1;
      const code = `RT-${String(product?.code ?? "PRD")}-${routingVersion.toUpperCase()}`;
      const name = `Routing ${String(product?.name ?? "")} ${routingVersion.toUpperCase()}`.trim();

      // Business rule: hanya satu routing Active per produk.
      if (status === "Active") {
        const { data: actives, error: activeErr } = await supabase
          .from("routings")
          .select("id, code")
          .eq("product_id", productId)
          .eq("status", "Active");
        if (activeErr) throw new Error(activeErr.message);
        const others = (actives ?? []).filter((a) => String(a.id) !== String(routing?.id ?? ""));
        if (others.length) {
          const { error: deErr } = await supabase
            .from("routings")
            .update({ status: "Inactive" })
            .in("id", others.map((o) => String(o.id)));
          if (deErr) throw new Error(deErr.message);
          toast.warning(`Routing aktif sebelumnya (${others.map((o) => o.code).join(", ")}) diubah menjadi Inactive.`);
        }
      }

      let routingId = String(routing?.id ?? "");
      if (editing) {
        const { error } = await supabase
          .from("routings")
          .update({ product_id: productId, code, name, version: versionNumber, status })
          .eq("id", routingId);
        if (error) throw new Error(error.message);
        const { error: delErr } = await supabase.from("routing_operations").delete().eq("routing_id", routingId);
        if (delErr) throw new Error(delErr.message);
      } else {
        const { data, error } = await supabase
          .from("routings")
          .insert({
            product_id: productId,
            code,
            name,
            version: versionNumber,
            status,
            effective_date: toISODate(new Date()),
            created_by: profile?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        routingId = String(data.id);
      }

      const payload = steps.map((s) => ({
        routing_id: routingId,
        seq: Number(s.seq),
        operation_name: s.operation_name.trim(),
        machine_id: s.machine_id || null,
        setup_time_min: Number(s.setup_time_min || 0),
        standard_cycle_time_sec: Number(s.standard_cycle_time_sec || 0),
        manpower: Number(s.manpower || 1),
        minimum_crew: Number(s.manpower || 1),
        standard_source: s.source_time_study_id ? "Time Study" : "Manual",
        source_time_study_id: s.source_time_study_id,
      }));
      const { error: opErr } = await supabase.from("routing_operations").insert(payload);
      if (opErr) throw new Error(opErr.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Routing diperbarui" : "Routing dibuat");
      void qc.invalidateQueries({ queryKey: ["routings"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah Routing Produk" : "Tambah Routing Produk"}</DialogTitle>
          <DialogDescription>
            Tetapkan urutan proses beserta standar setup time, cycle time, dan manpower.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Produk *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Routing Version *</Label>
            <Input value={routingVersion} placeholder="REV-01" onChange={(e) => setRoutingVersion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Routing Steps</p>
            <p className="text-xs text-muted-foreground">
              Standar dapat diambil otomatis dari Time Study berstatus Validated.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSteps((prev) => [...prev, newStep((Number(prev.at(-1)?.seq ?? 0) || prev.length * 10) + 10)])
            }
          >
            <Plus className="size-4" /> Tambah Step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const study = findStudy(step);
            return (
              <Card key={step.key} className="gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Step {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    disabled={steps.length === 1}
                    onClick={() => setSteps((prev) => prev.filter((s) => s.key !== step.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Sequence</Label>
                    <Input
                      type="number"
                      min={0}
                      value={step.seq}
                      onChange={(e) => updateStep(step.key, { seq: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proses</Label>
                    <Input
                      value={step.operation_name}
                      placeholder="Cutting"
                      onChange={(e) => updateStep(step.key, { operation_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mesin</Label>
                    <Select value={step.machine_id} onValueChange={(v) => updateStep(step.key, { machine_id: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih mesin" />
                      </SelectTrigger>
                      <SelectContent>
                        {machineOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Setup Time (menit)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={step.setup_time_min}
                      onChange={(e) => updateStep(step.key, { setup_time_min: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cycle Time (detik/pcs)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={step.standard_cycle_time_sec}
                      onChange={(e) =>
                        updateStep(step.key, { standard_cycle_time_sec: e.target.value, source_time_study_id: null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manpower Standard</Label>
                    <Input
                      type="number"
                      min={0}
                      value={step.manpower}
                      onChange={(e) => updateStep(step.key, { manpower: e.target.value })}
                    />
                  </div>
                </div>

                {study ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-xs">
                    <span className="text-muted-foreground">
                      Time Study Validated: CT {Number(study.standard_cycle_time_sec ?? 0)} dtk/pcs · Manpower{" "}
                      {Number(study.manpower ?? 0)} orang
                    </span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => applyStudy(step, study)}>
                      <Sparkles className="size-4" /> Gunakan Standar
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada Time Study Validated untuk kombinasi produk, proses, dan mesin ini.
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Simpan Routing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
