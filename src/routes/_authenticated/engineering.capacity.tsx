import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  capacityPlansQuery,
  linesQuery,
  machinesQuery,
  manpowerQuery,
  plantsQuery,
  shiftsQuery,
} from "@/lib/queries";
import { formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/capacity")({
  head: () => ({
    meta: [
      { title: "Capacity & Manpower — MANUFACTUREIQ" },
      { name: "description", content: "Perhitungan kapasitas produksi per shift dan rekomendasi kebutuhan manpower." },
      { property: "og:title", content: "Capacity & Manpower — MANUFACTUREIQ" },
      { property: "og:description", content: "Rencana kapasitas lini dan kebutuhan tenaga kerja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacityPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function CapacityPage() {
  const { role, profile } = useAuth();
  const [tab, setTab] = useState<"capacity" | "manpower">("capacity");
  const caps = useQuery(capacityPlansQuery);
  const mps = useQuery(manpowerQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");

  const lineOptions = toOptions(lines as Row[], ["name"]);
  const plantOptions = toOptions(plants as Row[], ["name"]);

  const capRows = (caps.data ?? []) as Row[];
  const mpRows = (mps.data ?? []) as Row[];
  const totalCapacity = capRows.reduce((s, r) => s + num(r.capacity_per_shift), 0);
  const gap = mpRows.reduce((s, r) => s + (num(r.recommended_manpower) - num(r.current_manpower)), 0);

  const capColumns: Column<Row>[] = [
    { key: "plan_date", header: "Tanggal", render: (r) => formatDate(r.plan_date as string) },
    { key: "line", header: "Line", value: (r) => (r.lines as { name?: string } | null)?.name ?? "-" },
    { key: "machine", header: "Mesin", value: (r) => (r.machines as { code?: string } | null)?.code ?? "-" },
    { key: "shift", header: "Shift", value: (r) => (r.shifts as { name?: string } | null)?.name ?? "-" },
    {
      key: "net_available_minutes",
      header: "Menit Tersedia",
      align: "right",
      render: (r) => formatNumber(num(r.net_available_minutes), 1),
    },
    {
      key: "standard_cycle_time_sec",
      header: "Cycle Time (dtk)",
      align: "right",
      render: (r) => formatNumber(num(r.standard_cycle_time_sec), 2),
    },
    {
      key: "capacity_per_shift",
      header: "Kapasitas / Shift",
      align: "right",
      value: (r) => num(r.capacity_per_shift),
      render: (r) => formatNumber(num(r.capacity_per_shift)),
    },
  ];

  const capFields: CrudField[] = [
    { name: "plan_date", label: "Tanggal", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "plant_id", label: "Plant", type: "select", options: plantOptions },
    { name: "line_id", label: "Line", type: "select", options: lineOptions },
    { name: "machine_id", label: "Mesin", type: "select", options: toOptions(machines as Row[], ["code", "name"]) },
    { name: "shift_id", label: "Shift", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    { name: "net_available_minutes", label: "Menit Tersedia Bersih", type: "number", defaultValue: 420 },
    { name: "standard_cycle_time_sec", label: "Cycle Time Standar (detik)", type: "number", step: "0.01", defaultValue: 0 },
    { name: "capacity_per_shift", label: "Kapasitas per Shift", type: "number", defaultValue: 0 },
  ];

  const mpColumns: Column<Row>[] = [
    { key: "period_date", header: "Periode", render: (r) => formatDate(r.period_date as string) },
    { key: "line", header: "Line", value: (r) => (r.lines as { name?: string } | null)?.name ?? "-" },
    {
      key: "required_standard_minutes",
      header: "Menit Standar Dibutuhkan",
      align: "right",
      render: (r) => formatNumber(num(r.required_standard_minutes), 1),
    },
    {
      key: "net_available_minutes_per_person",
      header: "Menit / Orang",
      align: "right",
      render: (r) => formatNumber(num(r.net_available_minutes_per_person), 1),
    },
    {
      key: "recommended_manpower",
      header: "Rekomendasi",
      align: "right",
      value: (r) => num(r.recommended_manpower),
      render: (r) => formatNumber(num(r.recommended_manpower), 1),
    },
    { key: "current_manpower", header: "Saat Ini", align: "right" },
    {
      key: "gap",
      header: "Gap",
      align: "right",
      value: (r) => num(r.recommended_manpower) - num(r.current_manpower),
      render: (r) => formatNumber(num(r.recommended_manpower) - num(r.current_manpower), 1),
    },
    { key: "note", header: "Catatan" },
  ];

  const mpFields: CrudField[] = [
    { name: "period_date", label: "Periode", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "plant_id", label: "Plant", type: "select", options: plantOptions },
    { name: "line_id", label: "Line", type: "select", options: lineOptions },
    { name: "required_standard_minutes", label: "Menit Standar Dibutuhkan", type: "number", defaultValue: 0 },
    { name: "net_available_minutes_per_person", label: "Menit Tersedia per Orang", type: "number", defaultValue: 420 },
    { name: "recommended_manpower", label: "Rekomendasi Manpower", type: "number", step: "0.1", defaultValue: 0 },
    { name: "current_manpower", label: "Manpower Saat Ini", type: "number", defaultValue: 0 },
    { name: "note", label: "Catatan", type: "textarea", full: true },
  ];

  const isCap = tab === "capacity";

  return (
    <CrudPage<Row>
      title="Capacity & Manpower"
      description="Perhitungan kapasitas lini per shift dan kebutuhan tenaga kerja berbasis beban standar."
      table={isCap ? "capacity_plans" : "manpower_recommendations"}
      invalidateKeys={[[isCap ? "capacity_plans" : "manpower_recommendations"]]}
      columns={isCap ? capColumns : mpColumns}
      rows={isCap ? capRows : mpRows}
      loading={isCap ? caps.isLoading : mps.isLoading}
      fields={isCap ? capFields : mpFields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName={isCap ? "capacity-plan" : "manpower"}
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
      toolbar={
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="capacity">Kapasitas</TabsTrigger>
            <TabsTrigger value="manpower">Manpower</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Rencana Kapasitas" value={capRows.length} tone="primary" />
        <KpiCard label="Total Kapasitas / Shift" value={formatNumber(totalCapacity)} tone="info" />
        <KpiCard label="Gap Manpower" value={formatNumber(gap, 1)} tone={gap > 0 ? "warning" : "success"} />
      </div>
    </CrudPage>
  );
}
