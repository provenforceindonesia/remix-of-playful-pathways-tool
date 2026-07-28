import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { costMasterQuery, machinesQuery, materialsQuery, plantsQuery } from "@/lib/queries";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/costing/master")({
  head: () => ({
    meta: [
      { title: "Master Biaya — MANUFACTUREIQ" },
      { name: "description", content: "Master tarif biaya material, mesin, tenaga kerja, dan overhead untuk perhitungan HPP." },
      { property: "og:title", content: "Master Biaya — MANUFACTUREIQ" },
      { property: "og:description", content: "Tarif standar biaya produksi per periode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostMasterPage,
});

type Row = Record<string, unknown>;
type TabKey = "material" | "machine" | "labor" | "overhead";
const num = (v: unknown) => Number(v ?? 0);

function CostMasterPage() {
  const { role, profile } = useAuth();
  const [tab, setTab] = useState<TabKey>("material");
  const mat = useQuery(costMasterQuery.materialCosts);
  const mac = useQuery(costMasterQuery.machineRates);
  const lab = useQuery(costMasterQuery.laborRates);
  const ovh = useQuery(costMasterQuery.overheadRates);
  const { data: materials } = useQuery(materialsQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: plants } = useQuery(plantsQuery);
  const canWrite = ["FINANCE", "SYSADMIN"].includes(role ?? "");

  const plantOptions = toOptions(plants as Row[], ["name"]);
  const effective: Column<Row> = {
    key: "effective_date",
    header: "Berlaku Sejak",
    render: (r) => formatDate(r.effective_date as string),
  };

  const config: Record<
    TabKey,
    { table: string; key: string; rows: Row[]; loading: boolean; columns: Column<Row>[]; fields: CrudField[] }
  > = {
    material: {
      table: "material_costs",
      key: "material_costs",
      rows: (mat.data ?? []) as Row[],
      loading: mat.isLoading,
      columns: [
        { key: "material", header: "Material", value: (r) => (r.materials as { name?: string } | null)?.name ?? "-" },
        {
          key: "unit_cost",
          header: "Harga Satuan",
          align: "right",
          value: (r) => num(r.unit_cost),
          render: (r) => formatCurrency(num(r.unit_cost)),
        },
        { key: "currency", header: "Mata Uang" },
        effective,
      ],
      fields: [
        { name: "material_id", label: "Material", type: "select", required: true, options: toOptions(materials as Row[], ["code", "name"]) },
        { name: "unit_cost", label: "Harga Satuan", type: "number", required: true, defaultValue: 0 },
        { name: "currency", label: "Mata Uang", defaultValue: "IDR" },
        { name: "effective_date", label: "Berlaku Sejak", type: "date", required: true, defaultValue: toISODate(new Date()) },
      ],
    },
    machine: {
      table: "machine_rates",
      key: "machine_rates",
      rows: (mac.data ?? []) as Row[],
      loading: mac.isLoading,
      columns: [
        { key: "machine", header: "Mesin", value: (r) => (r.machines as { name?: string } | null)?.name ?? "-" },
        {
          key: "hour_rate",
          header: "Tarif / Jam",
          align: "right",
          value: (r) => num(r.hour_rate),
          render: (r) => formatCurrency(num(r.hour_rate)),
        },
        effective,
      ],
      fields: [
        { name: "machine_id", label: "Mesin", type: "select", required: true, options: toOptions(machines as Row[], ["code", "name"]) },
        { name: "hour_rate", label: "Tarif per Jam", type: "number", required: true, defaultValue: 0 },
        { name: "effective_date", label: "Berlaku Sejak", type: "date", required: true, defaultValue: toISODate(new Date()) },
      ],
    },
    labor: {
      table: "labor_rates",
      key: "labor_rates",
      rows: (lab.data ?? []) as Row[],
      loading: lab.isLoading,
      columns: [
        { key: "role_label", header: "Posisi" },
        {
          key: "hour_rate",
          header: "Tarif / Jam",
          align: "right",
          value: (r) => num(r.hour_rate),
          render: (r) => formatCurrency(num(r.hour_rate)),
        },
        effective,
      ],
      fields: [
        { name: "role_label", label: "Posisi / Jabatan", required: true },
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions },
        { name: "hour_rate", label: "Tarif per Jam", type: "number", required: true, defaultValue: 0 },
        { name: "effective_date", label: "Berlaku Sejak", type: "date", required: true, defaultValue: toISODate(new Date()) },
      ],
    },
    overhead: {
      table: "overhead_rates",
      key: "overhead_rates",
      rows: (ovh.data ?? []) as Row[],
      loading: ovh.isLoading,
      columns: [
        { key: "basis", header: "Basis Alokasi" },
        {
          key: "rate",
          header: "Tarif",
          align: "right",
          value: (r) => num(r.rate),
          render: (r) => formatCurrency(num(r.rate)),
        },
        effective,
      ],
      fields: [
        {
          name: "basis",
          label: "Basis Alokasi",
          type: "select",
          required: true,
          options: selectOptions(["Per Jam Mesin", "Per Jam Kerja", "Per Unit Output"]),
          defaultValue: "Per Jam Mesin",
        },
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions },
        { name: "rate", label: "Tarif", type: "number", required: true, defaultValue: 0 },
        { name: "effective_date", label: "Berlaku Sejak", type: "date", required: true, defaultValue: toISODate(new Date()) },
      ],
    },
  };

  const c = config[tab];

  return (
    <CrudPage<Row>
      title="Master Biaya"
      description="Tarif standar biaya material, mesin, tenaga kerja, dan overhead sebagai dasar HPP."
      table={c.table}
      invalidateKeys={[[c.key]]}
      columns={c.columns}
      rows={c.rows}
      loading={c.loading}
      fields={c.fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName={c.key}
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
      toolbar={
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="material">Material</TabsTrigger>
            <TabsTrigger value="machine">Mesin</TabsTrigger>
            <TabsTrigger value="labor">Tenaga Kerja</TabsTrigger>
            <TabsTrigger value="overhead">Overhead</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    />
  );
}
