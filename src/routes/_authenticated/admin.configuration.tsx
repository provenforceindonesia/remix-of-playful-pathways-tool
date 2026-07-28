import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  linesQuery,
  machinesQuery,
  plantsQuery,
  reasonCodesQuery,
  settingsQuery,
  shiftsQuery,
  uomQuery,
  warehousesQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/configuration")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Master Configuration — MANUFACTUREIQ" },
      { name: "description", content: "Konfigurasi plant, line, shift, mesin, gudang, UoM, dan parameter sistem." },
      { property: "og:title", content: "Master Configuration — MANUFACTUREIQ" },
      { property: "og:description", content: "Master konfigurasi pabrik dan parameter sistem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigurationPage,
});

type Row = Record<string, unknown>;
type TabKey =
  | "plants"
  | "lines"
  | "shifts"
  | "machines"
  | "reasons"
  | "warehouses"
  | "uom"
  | "settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "plants", label: "Plant" },
  { key: "lines", label: "Line" },
  { key: "shifts", label: "Shift" },
  { key: "machines", label: "Mesin" },
  { key: "reasons", label: "Reason Code" },
  { key: "warehouses", label: "Gudang" },
  { key: "uom", label: "UoM" },
  { key: "settings", label: "Parameter" },
];

function ConfigurationPage() {
  const { tab: tabParam } = Route.useSearch();
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "plants",
  );
  useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) setTab(tabParam as TabKey);
  }, [tabParam]);
  const plants = useQuery(plantsQuery);
  const lines = useQuery(linesQuery);
  const shifts = useQuery(shiftsQuery);
  const machines = useQuery(machinesQuery);
  const reasons = useQuery(reasonCodesQuery);
  const warehouses = useQuery(warehousesQuery);
  const uom = useQuery(uomQuery);
  const settings = useQuery(settingsQuery);

  const plantOptions = toOptions(plants.data as Row[], ["name"]);
  const lineOptions = toOptions(lines.data as Row[], ["name"]);


  const activeStatus = (r: Row) => <StatusBadge status={r.is_active ? "Aktif" : "Nonaktif"} />;

  const config: Record<
    TabKey,
    {
      title: string;
      table: string;
      key: string;
      rows: Row[];
      loading: boolean;
      columns: Column<Row>[];
      fields: CrudField[];
    }
  > = {
    plants: {
      title: "Plant",
      table: "plants",
      key: "plants",
      rows: (plants.data ?? []) as Row[],
      loading: plants.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama" },
        { key: "timezone", header: "Timezone" },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Plant", required: true },
        { name: "timezone", label: "Timezone", defaultValue: "Asia/Jakarta" },
        { name: "address", label: "Alamat", type: "textarea", full: true },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },
    lines: {
      title: "Line Produksi",
      table: "lines",
      key: "lines",
      rows: (lines.data ?? []) as Row[],
      loading: lines.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Line" },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Line", required: true },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },
    shifts: {
      title: "Shift",
      table: "shifts",
      key: "shifts",
      rows: (shifts.data ?? []) as Row[],
      loading: shifts.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Shift" },
        { key: "start_time", header: "Mulai" },
        { key: "end_time", header: "Selesai" },
        { key: "break_minutes", header: "Istirahat (mnt)", align: "right" },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Shift", required: true },
        { name: "start_time", label: "Jam Mulai", type: "time", required: true },
        { name: "end_time", label: "Jam Selesai", type: "time", required: true },
        { name: "break_minutes", label: "Istirahat (menit)", type: "number", defaultValue: 60 },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },
    machines: {
      title: "Mesin",
      table: "machines",
      key: "machines",
      rows: (machines.data ?? []) as Row[],
      loading: machines.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Mesin" },
        { key: "machine_type", header: "Tipe" },
        {
          key: "line",
          header: "Line",
          value: (r) => (r.lines as { name?: string } | null)?.name ?? "-",
        },
        { key: "standard_speed", header: "Speed Std", align: "right" },
        {
          key: "master_status",
          header: "Status",
          render: (r) => <StatusBadge status={String(r.master_status ?? "-")} />,
        },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        { name: "line_id", label: "Line", type: "select", options: lineOptions },
        { name: "code", label: "Kode Mesin", required: true },
        { name: "name", label: "Nama Mesin", required: true },
        { name: "machine_type", label: "Tipe Mesin" },
        { name: "manufacturer", label: "Manufacturer" },
        { name: "standard_speed", label: "Kecepatan Standar (unit/jam)", type: "number", defaultValue: 0 },
        {
          name: "master_status",
          label: "Status",
          type: "select",
          defaultValue: "Active",
          options: ["Active", "Inactive", "Under Maintenance", "Breakdown", "Retired"].map((v) => ({
            value: v,
            label: v,
          })),
        },
      ],
    },
    reasons: {
      title: "Reason Code Downtime",
      table: "downtime_reason_codes",
      key: "downtime_reason_codes",
      rows: (reasons.data ?? []) as Row[],
      loading: reasons.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama" },
        { key: "category", header: "Kategori" },
        {
          key: "requires_maintenance",
          header: "Perlu Maintenance",
          value: (r) => (r.requires_maintenance ? "Ya" : "Tidak"),
        },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama", required: true },
        {
          name: "category",
          label: "Kategori",
          type: "select",
          required: true,
          defaultValue: "Mesin",
          options: selectOptions(["Mesin", "Material", "Metode", "Manusia", "Eksternal", "Planned"]),
        },
        { name: "requires_maintenance", label: "Perlu Maintenance", type: "switch", defaultValue: false },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },

    warehouses: {
      title: "Gudang",
      table: "warehouses",
      key: "warehouses",
      rows: (warehouses.data ?? []) as Row[],
      loading: warehouses.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Gudang" },
        { key: "type", header: "Tipe" },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Gudang", required: true },
        {
          name: "type",
          label: "Tipe",
          type: "select",
          defaultValue: "Raw Material",
          options: ["Raw Material", "WIP", "Finished Goods", "Scrap"].map((v) => ({
            value: v,
            label: v,
          })),
        },
      ],
    },
    uom: {
      title: "Satuan (UoM)",
      table: "units_of_measure",
      key: "uom",
      rows: (uom.data ?? []) as Row[],
      loading: uom.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama" },
        { key: "category", header: "Kategori" },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Satuan", required: true },
        { name: "category", label: "Kategori", defaultValue: "Quantity" },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },
    settings: {
      title: "Parameter Sistem",
      table: "system_settings",
      key: "system_settings",
      rows: (settings.data ?? []) as Row[],
      loading: settings.isLoading,
      columns: [
        { key: "key", header: "Key" },
        { key: "value", header: "Nilai", value: (r) => JSON.stringify(r.value ?? null) },
        { key: "description", header: "Deskripsi" },
      ],
      fields: [
        { name: "key", label: "Key", required: true },
        { name: "value", label: "Nilai (JSON)", required: true, full: true },
        { name: "description", label: "Deskripsi", type: "textarea", full: true },
      ],
    },
  };

  const c = config[tab];

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <CrudPage<Row>
        key={tab}
        title={c.title}
        description="Master konfigurasi dasar yang dipakai seluruh modul operasional."
        table={c.table}
        invalidateKeys={[[c.key]]}
        columns={c.columns}
        rows={c.rows}
        loading={c.loading}
        fields={c.fields}
        beforePayload={(v) =>
          c.table === "system_settings"
            ? { ...v, value: safeJson(v.value) }
            : v
        }
        exportName={`config-${c.key}`}
      />
    </>
  );
}

function safeJson(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
