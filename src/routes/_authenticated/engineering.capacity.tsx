import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Factory, Gauge, Users } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routingsQuery } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import {
  calculateAvailableProductionMinutes,
  calculateCapacityPerShift,
  calculateRequiredManpower,
  calculateUtilizationPct,
  type CapacityStepInput,
} from "@/lib/engineering-calculations";

export const Route = createFileRoute("/_authenticated/engineering/capacity")({
  head: () => ({
    meta: [
      { title: "Capacity & Manpower — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Perhitungan kapasitas produksi per shift, deteksi bottleneck, dan kebutuhan manpower berbasis standar tervalidasi.",
      },
      { property: "og:title", content: "Capacity & Manpower — MANUFACTUREIQ" },
      { property: "og:description", content: "Kapasitas lini, bottleneck, dan kebutuhan tenaga kerja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacityPage,
});

type Row = Record<string, unknown>;
type Op = {
  id: string;
  seq: number;
  operation_name: string;
  standard_cycle_time_sec: number | null;
  setup_time_min: number | null;
  manpower: number | null;
  standard_source?: string | null;
  machines?: { code?: string; name?: string } | null;
  work_centers?: { code?: string; name?: string } | null;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function routingLabel(r: Row): string {
  const product = (r.products as { name?: string } | null)?.name ?? "Produk";
  const variant = (r.product_variants as { name?: string } | null)?.name;
  return `${product}${variant ? ` · ${variant}` : ""} · ${String(r.code ?? "")}`;
}

function CapacityPage() {
  const { data, isLoading } = useQuery(routingsQuery);
  const routings = (data ?? []) as Row[];

  const [routingId, setRoutingId] = useState("");
  const [targetQty, setTargetQty] = useState("1000");
  const [shiftMinutes, setShiftMinutes] = useState("480");
  const [plannedDowntime, setPlannedDowntime] = useState("60");
  const [efficiency, setEfficiency] = useState("85");

  const selected = routings.find((r) => String(r.id) === routingId) ?? null;

  const steps = useMemo(() => {
    const ops = (((selected?.routing_operations as Op[]) ?? []) as Op[])
      .slice()
      .sort((a, b) => a.seq - b.seq);

    const target = num(targetQty);

    return ops.map((op) => {
      const input: CapacityStepInput = {
        standardCycleTimeSec: num(op.standard_cycle_time_sec),
        setupTimeMin: num(op.setup_time_min),
        manpower: Math.max(1, num(op.manpower) || 1),
        shiftMinutes: num(shiftMinutes),
        plannedDowntimeMin: num(plannedDowntime),
        efficiencyPct: num(efficiency),
      };
      const capacity = calculateCapacityPerShift(input);
      return {
        ...op,
        availableMinutes: calculateAvailableProductionMinutes(input),
        capacity,
        requiredManpower: calculateRequiredManpower(input, target),
        utilization: calculateUtilizationPct(input, target),
        shiftsNeeded: capacity > 0 ? target / capacity : 0,
        hasStandard: num(op.standard_cycle_time_sec) > 0,
        isValidated: op.standard_source === "Time Study",
      };
    });
  }, [selected, targetQty, shiftMinutes, plannedDowntime, efficiency]);

  const withCapacity = steps.filter((s) => s.capacity > 0);
  const bottleneckCapacity = withCapacity.length ? Math.min(...withCapacity.map((s) => s.capacity)) : 0;
  const bottleneck = withCapacity.find((s) => s.capacity === bottleneckCapacity) ?? null;
  const totalManpower = steps.reduce((total, s) => total + s.requiredManpower, 0);
  const missingStandard = steps.filter((s) => !s.hasStandard).length;

  const columns: Column<(typeof steps)[number]>[] = [
    { key: "seq", header: "Seq", align: "right" },
    { key: "operation_name", header: "Operasi" },
    {
      key: "resource",
      header: "Mesin / Work Center",
      value: (r) => r.machines?.code ?? r.work_centers?.code ?? "-",
    },
    {
      key: "standard_source",
      header: "Sumber Standar",
      render: (r) => <StatusBadge status={r.isValidated ? "Time Study" : r.hasStandard ? "Manual" : "Belum Ada"} />,
    },
    {
      key: "standard_cycle_time_sec",
      header: "CT Standar (dtk)",
      align: "right",
      render: (r) => formatNumber(num(r.standard_cycle_time_sec), 2),
    },
    {
      key: "availableMinutes",
      header: "Menit Efektif",
      align: "right",
      render: (r) => formatNumber(r.availableMinutes, 1),
    },
    {
      key: "capacity",
      header: "Kapasitas / Shift",
      align: "right",
      value: (r) => r.capacity,
      render: (r) => formatNumber(r.capacity, 0),
    },
    {
      key: "shiftsNeeded",
      header: "Shift Dibutuhkan",
      align: "right",
      render: (r) => formatNumber(r.shiftsNeeded, 2),
    },
    {
      key: "utilization",
      header: "Utilisasi",
      align: "right",
      render: (r) => `${formatNumber(r.utilization, 1)}%`,
    },
    {
      key: "requiredManpower",
      header: "Manpower Dibutuhkan",
      align: "right",
      render: (r) => `${formatNumber(r.requiredManpower, 0)} orang`,
    },
    {
      key: "bottleneck",
      header: "Bottleneck",
      render: (r) =>
        r.capacity > 0 && r.capacity === bottleneckCapacity ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-warning">
            <AlertTriangle className="size-3.5" /> Ya
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Capacity & Manpower"
        description="Kapasitas per shift, bottleneck, dan kebutuhan manpower dihitung otomatis dari Routing dan Time Study tervalidasi."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 xl:col-span-2">
          <Label>Routing Produk</Label>
          <Select value={routingId} onValueChange={setRoutingId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoading ? "Memuat routing..." : "Pilih routing produk"} />
            </SelectTrigger>
            <SelectContent>
              {routings.map((r) => (
                <SelectItem key={String(r.id)} value={String(r.id)}>
                  {routingLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Target Produksi (pcs)</Label>
          <Input type="number" min={0} value={targetQty} onChange={(e) => setTargetQty(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Menit / Shift</Label>
          <Input type="number" min={0} value={shiftMinutes} onChange={(e) => setShiftMinutes(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Planned Downtime (mnt)</Label>
          <Input type="number" min={0} value={plannedDowntime} onChange={(e) => setPlannedDowntime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Target Efisiensi (%)</Label>
          <Input type="number" min={0} max={100} value={efficiency} onChange={(e) => setEfficiency(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<Gauge className="size-4" />}
          label="Kapasitas Lini / Shift"
          value={formatNumber(bottleneckCapacity, 0)}
          tone="primary"
        />
        <KpiCard
          icon={<Factory className="size-4" />}
          label="Bottleneck"
          value={bottleneck ? `${bottleneck.seq}. ${bottleneck.operation_name}` : "-"}
          tone={bottleneck ? "warning" : "info"}
        />
        <KpiCard
          icon={<Users className="size-4" />}
          label="Total Manpower Dibutuhkan"
          value={`${formatNumber(totalManpower, 0)} orang`}
          tone="success"
        />
      </div>

      {!routingId ? (
        <div className="rounded-[0.5rem] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Pilih routing produk untuk menghitung kapasitas dan kebutuhan manpower.{" "}
          <Link to="/engineering/routing" className="font-medium text-primary underline-offset-4 hover:underline">
            Kelola Routing
          </Link>
        </div>
      ) : steps.length === 0 ? (
        <div className="rounded-[0.5rem] border border-dashed p-10 text-center text-sm text-muted-foreground">
          Routing ini belum memiliki operasi.{" "}
          <Link to="/engineering/routing" className="font-medium text-primary underline-offset-4 hover:underline">
            Tambahkan step routing
          </Link>
        </div>
      ) : (
        <>
          {missingStandard > 0 && (
            <div className="rounded-[0.5rem] border border-dashed border-warning/40 bg-warning/10 p-4 text-sm">
              {missingStandard} operasi belum memiliki cycle time standar sehingga tidak dihitung.{" "}
              <Link to="/engineering/time-study" className="font-medium text-primary underline-offset-4 hover:underline">
                Lakukan Time Study
              </Link>
            </div>
          )}
          <DataTable columns={columns} rows={steps} />
        </>
      )}
    </div>
  );
}
