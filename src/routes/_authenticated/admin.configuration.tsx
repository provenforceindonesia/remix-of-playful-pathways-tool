import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  linesQuery,
  machinesQuery,
  plantsQuery,
  reasonCodesQuery,
  settingsQuery,
  shiftsQuery,
  uomQuery,
  warehousesQuery,
  workCentersQuery,
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
  | "work_centers"
  | "shifts"
  | "machines"
  | "reasons"
  | "warehouses"
  | "uom"
  | "settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "plants", label: "Plant" },
  { key: "lines", label: "Line" },
  { key: "work_centers", label: "Work Center" },
  { key: "machines", label: "Mesin" },
  { key: "shifts", label: "Shift" },
  { key: "reasons", label: "Reason Code" },
  { key: "warehouses", label: "Gudang" },
  { key: "uom", label: "UoM" },
  { key: "settings", label: "Parameter" },
];

/** Industrial Engineer hanya mengelola master data teknis. */
const IE_TABS: TabKey[] = ["lines", "work_centers", "machines", "shifts", "reasons"];

function ConfigurationPage() {
  const { tab: tabParam } = Route.useSearch();
  const { role } = useAuth();
  const visibleTabs = role === "IE" ? TABS.filter((t) => IE_TABS.includes(t.key)) : TABS;
  const fallbackTab = visibleTabs[0]?.key ?? "plants";
  const [tab, setTab] = useState<TabKey>(
    visibleTabs.some((t) => t.key === tabParam) ? (tabParam as TabKey) : fallbackTab,
  );
  useEffect(() => {
    if (tabParam && visibleTabs.some((t) => t.key === tabParam)) setTab(tabParam as TabKey);
    else if (!visibleTabs.some((t) => t.key === tab)) setTab(fallbackTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, role]);
  const plants = useQuery(plantsQuery);
  const lines = useQuery(linesQuery);
  const shifts = useQuery(shiftsQuery);
  const machines = useQuery(machinesQuery);
  const workCenters = useQuery(workCentersQuery);
  const reasons = useQuery(reasonCodesQuery);
  const warehouses = useQuery(warehousesQuery);
  const uom = useQuery(uomQuery);
  const settings = useQuery(settingsQuery);

  const lineRows = (lines.data ?? []) as Row[];
  const workCenterRows = (workCenters.data ?? []) as Row[];
  const plantOptions = toOptions(plants.data as Row[], ["name"]);
  const lineOptions = toOptions(lineRows, ["code", "name"]);

  const relName = (r: Row, key: string) => (r[key] as { code?: string; name?: string } | null)?.name ?? "-";

  /** Select bergantung: opsi disaring dari nilai form lain (hirarki master data). */
  const dependentSelect = (
    optionsFor: (values: Record<string, unknown>) => { value: string; label: string }[],
    placeholder: string,
    emptyHint: string,
  ): CrudField["render"] =>
    function DependentSelect({ value, setValue, values }) {
      const options = optionsFor(values);
      return (
        <>
          <Select value={String(value ?? "")} onValueChange={(v) => setValue(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {options.length === 0 && <p className="text-xs text-muted-foreground">{emptyHint}</p>}
        </>
      );
    };




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
      rows: lineRows,
      loading: lines.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Line" },
        { key: "description", header: "Deskripsi" },
        {
          key: "work_centers",
          header: "Work Center",
          align: "right",
          value: (r) => workCenterRows.filter((wc) => String(wc.line_id ?? "") === String(r.id)).length,
        },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Line", required: true },
        { name: "description", label: "Deskripsi", type: "textarea", full: true },
        { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
      ],
    },
    work_centers: {
      title: "Work Center",
      table: "work_centers",
      key: "work_centers",
      rows: workCenterRows,
      loading: workCenters.isLoading,
      columns: [
        { key: "code", header: "Kode" },
        { key: "name", header: "Nama Work Center" },
        { key: "line", header: "Line", value: (r) => relName(r, "lines") },
        { key: "plant", header: "Plant", value: (r) => relName(r, "plants") },
        {
          key: "machines",
          header: "Mesin",
          align: "right",
          value: (r) =>
            ((machines.data ?? []) as Row[]).filter((m) => String(m.work_center_id ?? "") === String(r.id)).length,
        },
        { key: "is_active", header: "Status", render: activeStatus },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        {
          name: "line_id",
          label: "Line",
          type: "custom",
          required: true,
          render: dependentSelect(
            (values) =>
              lineOptions.filter((o) => {
                const line = lineRows.find((l) => String(l.id) === o.value);
                return !values.plant_id || String(line?.plant_id ?? "") === String(values.plant_id);
              }),
            "Pilih line",
            "Belum ada line pada plant ini.",
          ),
        },
        { name: "code", label: "Kode", required: true },
        { name: "name", label: "Nama Work Center", required: true },
        { name: "description", label: "Deskripsi", type: "textarea", full: true },
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
        { key: "name", header: "Nama Shift" },

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
        { key: "line", header: "Line", value: (r) => relName(r, "lines") },
        { key: "work_center", header: "Work Center", value: (r) => relName(r, "work_centers") },
        { key: "standard_speed", header: "Speed Std", align: "right" },
        {
          key: "master_status",
          header: "Status",
          render: (r) => <StatusBadge status={String(r.master_status ?? "-")} />,
        },
      ],
      fields: [
        { name: "plant_id", label: "Plant", type: "select", options: plantOptions, required: true },
        {
          name: "line_id",
          label: "Line",
          type: "custom",
          required: true,
          render: dependentSelect(
            (values) =>
              lineOptions.filter((o) => {
                const line = lineRows.find((l) => String(l.id) === o.value);
                return !values.plant_id || String(line?.plant_id ?? "") === String(values.plant_id);
              }),
            "Pilih line",
            "Belum ada line pada plant ini.",
          ),
        },
        {
          name: "work_center_id",
          label: "Work Center",
          type: "custom",
          required: true,
          render: dependentSelect(
            (values) =>
              toOptions(
                workCenterRows.filter(
                  (wc) => wc.is_active !== false && (!values.line_id || String(wc.line_id ?? "") === String(values.line_id)),
                ),
                ["code", "name"],
              ),
            "Pilih work center",
            "Belum ada work center pada line ini.",
          ),
        },

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
      {!tabParam && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
          <TabsList className="flex-wrap">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}


      <CrudPage<Row>
        key={tab}
        title={c.title}
        description="Master konfigurasi dasar yang dipakai seluruh modul operasional."
        table={c.table}
        invalidateKeys={[[c.key], ["machines"], ["work_centers"], ["lines"]]}
        columns={c.columns}
        rows={c.rows}
        loading={c.loading}
        fields={c.fields}
        onFieldChange={(name) => {
          const hasField = (f: string) => c.fields.some((x) => x.name === f);
          if (name === "plant_id")
            return { ...(hasField("line_id") ? { line_id: "" } : {}), ...(hasField("work_center_id") ? { work_center_id: "" } : {}) };
          if (name === "line_id" && hasField("work_center_id")) return { work_center_id: "" };
        }}
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
